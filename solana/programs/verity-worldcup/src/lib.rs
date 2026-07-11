//! Verity World Cup — a parimutuel prop-market settlement engine.
//!
//! Bettors stake USDC on one of a market's outcomes for a TxLINE-tracked match
//! stat. A market has 2..=MAX_OUTCOMES mutually-exclusive outcomes (binary
//! YES/NO, or e.g. a 3-way match result). Outcome 0 is the default bucket;
//! outcomes 1.. carry predicates evaluated at settlement — the first true one
//! wins, else outcome 0. LPs seed every outcome and earn a fee slice. At
//! settlement a keeper submits fresh TxLINE Merkle proofs; the program CPIs into
//! TxLINE's `validate_stat` to trustlessly determine the winner, then winners
//! and LPs claim pro-rata. No oracle trust beyond TxLINE's signed roots.

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

pub mod errors;
pub mod state;
pub mod txline_cpi;

use errors::WcError;
use state::*;
use txline_cpi::{
    binary_expression_from_u8, cpi_validate_stat, comparison_from_u8, ProofNode, ScoreStat,
    ScoresBatchSummary, SettleSecondStat, StatTerm, TraderPredicate, ValidateStatInputs,
};

declare_id!("8t3WbL4A91QGdUwdz9EAAW1yCtyVyEmmMBGRFcG89a21");

#[program]
pub mod verity_worldcup {
    use super::*;

    /// Create a market. `rules` holds the predicate for each non-default outcome
    /// (outcomes `1..outcome_count`); outcome 0 is the default. The winning
    /// condition is fixed here and cannot be altered later.
    #[allow(clippy::too_many_arguments)]
    pub fn init_market(
        ctx: Context<InitMarket>,
        fixture_id: i64,
        nonce: u32,
        stat_key: u32,
        stat_key_b: u32,
        stat_period: i32,
        outcome_count: u8,
        rules: Vec<OutcomeRule>,
        deadline: i64,
        fee_bps: u16,
    ) -> Result<()> {
        let count = outcome_count as usize;
        require!(
            count >= 2 && count <= MAX_OUTCOMES,
            WcError::InvalidOutcomeCount
        );
        require!(rules.len() == count - 1, WcError::InvalidOutcomeCount);
        for r in &rules {
            require!(r.op <= 2, WcError::InvalidOp);
            require!(r.logic <= 2, WcError::InvalidLogic);
            require!(r.comparison <= 2, WcError::InvalidComparison);
            require!(r.comparison_b <= 2, WcError::InvalidComparison);
        }
        require!(fee_bps <= BPS_DENOMINATOR as u16, WcError::InvalidFeeConfig);

        let market = &mut ctx.accounts.market;
        market.authority = ctx.accounts.authority.key();
        market.usdc_mint = ctx.accounts.usdc_mint.key();
        market.vault = ctx.accounts.vault.key();
        market.fixture_id = fixture_id;
        market.nonce = nonce;
        market.stat_key = stat_key;
        market.stat_key_b = stat_key_b;
        market.stat_period = stat_period;
        market.outcome_count = outcome_count;
        market.outcome_rules = [OutcomeRule::default(); MAX_OUTCOMES];
        for (i, r) in rules.iter().enumerate() {
            market.outcome_rules[i + 1] = *r; // outcome 0 stays default
        }
        market.deadline = deadline;
        market.fee_bps = fee_bps;
        market.pools = [0u64; MAX_OUTCOMES];
        market.resolved = false;
        market.voided = false;
        market.winning_outcome = OUTCOME_DEFAULT;
        market.winning_pool = 0;
        market.distributable = 0;
        market.treasury_fee = 0;
        market.treasury_claimed = false;
        market.bump = ctx.bumps.market;
        market.vault_bump = ctx.bumps.vault;
        Ok(())
    }

    /// Place a bet on one outcome (0..outcome_count).
    pub fn stake(ctx: Context<Stake>, outcome: u8, amount: u64) -> Result<()> {
        require!(
            (outcome as usize) < ctx.accounts.market.outcome_count as usize,
            WcError::InvalidOutcome
        );
        require!(amount > 0, WcError::ZeroAmount);
        let clock = Clock::get()?;
        require!(clock.unix_timestamp < ctx.accounts.market.deadline, WcError::MarketClosed);
        require!(!ctx.accounts.market.resolved, WcError::AlreadyResolved);

        transfer_in(
            &ctx.accounts.token_program,
            &ctx.accounts.user_usdc,
            &ctx.accounts.vault,
            &ctx.accounts.user,
            amount,
        )?;

        let market = &mut ctx.accounts.market;
        let position = &mut ctx.accounts.position;
        position.market = market.key();
        position.owner = ctx.accounts.user.key();

        let i = outcome as usize;
        market.pools[i] = market.pools[i].checked_add(amount).ok_or(WcError::Overflow)?;
        position.stakes[i] = position.stakes[i].checked_add(amount).ok_or(WcError::Overflow)?;
        position.bump = ctx.bumps.position;
        Ok(())
    }

    /// Resolve the market by evaluating each non-default outcome's predicate via
    /// CPI into TxLINE `validate_stat`. The first true outcome wins; if none are
    /// true, outcome 0 wins. Keeper-only. Snapshots the fee split + winning pool.
    #[allow(clippy::too_many_arguments)]
    pub fn settle(
        ctx: Context<Settle>,
        ts: i64,
        fixture_summary: ScoresBatchSummary,
        fixture_proof: Vec<ProofNode>,
        main_tree_proof: Vec<ProofNode>,
        stat_value: i32,
        stat_period: i32,
        event_stat_root: [u8; 32],
        stat_proof: Vec<ProofNode>,
        stat_b: Option<SettleSecondStat>,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        require!(!market.resolved, WcError::AlreadyResolved);
        let clock = Clock::get()?;
        require!(clock.unix_timestamp >= market.deadline, WcError::MarketNotClosed);
        require!(fixture_summary.fixture_id == market.fixture_id, WcError::FixtureMismatch);

        let txline_program = &ctx.accounts.txline_program;
        let daily_scores = &ctx.accounts.daily_scores_merkle_roots;
        let count = market.outcome_count as usize;
        let stat_b_ref = stat_b.as_ref();

        // Evaluate outcomes 1..count in order; first true wins, else outcome 0.
        let mut winning = OUTCOME_DEFAULT;
        for i in 1..count {
            let rule = market.outcome_rules[i];
            let hit = eval_outcome(
                txline_program,
                daily_scores,
                ts,
                &fixture_summary,
                &fixture_proof,
                &main_tree_proof,
                market.stat_key,
                stat_value,
                stat_period,
                &event_stat_root,
                &stat_proof,
                market.stat_key_b,
                stat_b_ref,
                &rule,
            )?;
            if hit {
                winning = i as u8;
                break;
            }
        }

        market.winning_outcome = winning;

        let mut pot: u128 = 0;
        for i in 0..count {
            pot = pot.checked_add(market.pools[i] as u128).ok_or(WcError::Overflow)?;
        }
        // Pure parimutuel: the whole fee goes to the treasury.
        let fee = pot * market.fee_bps as u128 / BPS_DENOMINATOR as u128;
        let distributable = pot - fee;
        let winning_pool = market.pools[winning as usize];

        market.winning_pool = winning_pool;
        market.distributable = distributable as u64;
        market.treasury_fee = fee as u64;
        // No winners staked the correct outcome -> refund everyone their principal.
        market.voided = winning_pool == 0;
        market.resolved = true;

        emit!(MarketSettled {
            market: market.key(),
            fixture_id: market.fixture_id,
            winning_outcome: market.winning_outcome,
            voided: market.voided,
            distributable: market.distributable,
        });
        Ok(())
    }

    /// Claim winnings (and LP fee share) for the caller's position.
    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        let market = &ctx.accounts.market;
        require!(market.resolved, WcError::NotResolved);
        let position = &ctx.accounts.position;
        require!(!position.claimed, WcError::AlreadyClaimed);

        let payout: u64 = if market.voided {
            let mut refund: u64 = 0;
            for s in position.stakes.iter() {
                refund = refund.checked_add(*s).ok_or(WcError::Overflow)?;
            }
            refund
        } else {
            let winning_stake = position.stakes[market.winning_outcome as usize] as u128;
            let base = if market.winning_pool > 0 {
                (market.distributable as u128) * winning_stake / (market.winning_pool as u128)
            } else {
                0
            };
            base as u64
        };

        require!(payout > 0, WcError::NothingToClaim);
        transfer_out(market, &ctx.accounts.token_program, &ctx.accounts.vault, &ctx.accounts.user_usdc, payout)?;
        ctx.accounts.position.claimed = true;
        Ok(())
    }

    /// Keeper/treasury claims the protocol fee (once).
    pub fn claim_treasury(ctx: Context<ClaimTreasury>) -> Result<()> {
        let market = &ctx.accounts.market;
        require!(market.resolved, WcError::NotResolved);
        require!(!market.voided, WcError::NothingToClaim);
        require!(!market.treasury_claimed, WcError::TreasuryAlreadyClaimed);
        let amount = market.treasury_fee;
        require!(amount > 0, WcError::NothingToClaim);
        transfer_out(market, &ctx.accounts.token_program, &ctx.accounts.vault, &ctx.accounts.authority_usdc, amount)?;
        ctx.accounts.market.treasury_claimed = true;
        Ok(())
    }
}

// --------------------------------------------------------------------------
// Outcome predicate evaluation (CPI into TxLINE validate_stat)
// --------------------------------------------------------------------------

/// Evaluate one outcome's predicate over the market's shared stat pair.
/// `logic == 0` is the arithmetic path (one CPI); `logic != 0` runs two
/// single-stat predicates and combines them with AND/OR (two CPIs). Proofs are
/// cloned per call so several outcomes can reuse the same fetched proofs.
#[allow(clippy::too_many_arguments)]
fn eval_outcome<'info>(
    txline_program: &AccountInfo<'info>,
    daily_scores: &AccountInfo<'info>,
    ts: i64,
    fixture_summary: &ScoresBatchSummary,
    fixture_proof: &[ProofNode],
    main_tree_proof: &[ProofNode],
    stat_key: u32,
    stat_value: i32,
    stat_period: i32,
    event_stat_root: &[u8; 32],
    stat_proof: &[ProofNode],
    stat_key_b: u32,
    stat_b: Option<&SettleSecondStat>,
    rule: &OutcomeRule,
) -> Result<bool> {
    let make_stat_a = || StatTerm {
        stat_to_prove: ScoreStat {
            key: stat_key,
            value: stat_value,
            period: stat_period,
        },
        event_stat_root: *event_stat_root,
        stat_proof: stat_proof.to_vec(),
    };

    if rule.logic == 0 {
        let op = binary_expression_from_u8(rule.op)?;
        let stat_b_term = match (op.as_ref(), stat_b) {
            (Some(_), Some(b)) => Some(StatTerm {
                stat_to_prove: ScoreStat {
                    key: stat_key_b,
                    value: b.value,
                    period: b.period,
                },
                event_stat_root: b.event_stat_root,
                stat_proof: b.stat_proof.clone(),
            }),
            (Some(_), None) => return err!(WcError::MissingSecondStat),
            (None, _) => None,
        };
        let inputs = ValidateStatInputs {
            ts,
            fixture_summary: fixture_summary.clone(),
            fixture_proof: fixture_proof.to_vec(),
            main_tree_proof: main_tree_proof.to_vec(),
            predicate: TraderPredicate {
                threshold: rule.threshold,
                comparison: comparison_from_u8(rule.comparison)?,
            },
            stat_a: make_stat_a(),
            stat_b: stat_b_term,
            op,
        };
        cpi_validate_stat(txline_program, daily_scores, inputs)
    } else {
        let b = stat_b.ok_or(error!(WcError::MissingSecondStat))?;
        let inputs_a = ValidateStatInputs {
            ts,
            fixture_summary: fixture_summary.clone(),
            fixture_proof: fixture_proof.to_vec(),
            main_tree_proof: main_tree_proof.to_vec(),
            predicate: TraderPredicate {
                threshold: rule.threshold,
                comparison: comparison_from_u8(rule.comparison)?,
            },
            stat_a: make_stat_a(),
            stat_b: None,
            op: None,
        };
        let bool_a = cpi_validate_stat(txline_program, daily_scores, inputs_a)?;

        let inputs_b = ValidateStatInputs {
            ts,
            fixture_summary: fixture_summary.clone(),
            fixture_proof: fixture_proof.to_vec(),
            main_tree_proof: main_tree_proof.to_vec(),
            predicate: TraderPredicate {
                threshold: rule.threshold_b,
                comparison: comparison_from_u8(rule.comparison_b)?,
            },
            stat_a: StatTerm {
                stat_to_prove: ScoreStat {
                    key: stat_key_b,
                    value: b.value,
                    period: b.period,
                },
                event_stat_root: b.event_stat_root,
                stat_proof: b.stat_proof.clone(),
            },
            stat_b: None,
            op: None,
        };
        let bool_b = cpi_validate_stat(txline_program, daily_scores, inputs_b)?;

        Ok(match rule.logic {
            1 => bool_a && bool_b,
            2 => bool_a || bool_b,
            _ => return err!(WcError::InvalidLogic),
        })
    }
}

// --------------------------------------------------------------------------
// Token transfer helpers
// --------------------------------------------------------------------------

fn transfer_in<'info>(
    token_program: &Program<'info, Token>,
    from: &Account<'info, TokenAccount>,
    to: &Account<'info, TokenAccount>,
    authority: &Signer<'info>,
    amount: u64,
) -> Result<()> {
    let cpi = CpiContext::new(
        token_program.to_account_info(),
        Transfer {
            from: from.to_account_info(),
            to: to.to_account_info(),
            authority: authority.to_account_info(),
        },
    );
    token::transfer(cpi, amount)
}

fn transfer_out<'info>(
    market: &Account<'info, Market>,
    token_program: &Program<'info, Token>,
    vault: &Account<'info, TokenAccount>,
    to: &Account<'info, TokenAccount>,
    amount: u64,
) -> Result<()> {
    let fixture_id = market.fixture_id.to_le_bytes();
    let nonce = market.nonce.to_le_bytes();
    let bump = [market.bump];
    let seeds: &[&[u8]] = &[Market::SEED, &fixture_id, &nonce, &bump];
    let signer: &[&[&[u8]]] = &[seeds];
    let cpi = CpiContext::new_with_signer(
        token_program.to_account_info(),
        Transfer {
            from: vault.to_account_info(),
            to: to.to_account_info(),
            authority: market.to_account_info(),
        },
        signer,
    );
    token::transfer(cpi, amount)
}

// --------------------------------------------------------------------------
// Account contexts
// --------------------------------------------------------------------------

#[derive(Accounts)]
#[instruction(fixture_id: i64, nonce: u32)]
pub struct InitMarket<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    pub usdc_mint: Account<'info, Mint>,
    #[account(
        init,
        payer = authority,
        space = 8 + Market::INIT_SPACE,
        seeds = [Market::SEED, &fixture_id.to_le_bytes(), &nonce.to_le_bytes()],
        bump,
    )]
    pub market: Account<'info, Market>,
    #[account(
        init,
        payer = authority,
        seeds = [Market::VAULT_SEED, market.key().as_ref()],
        bump,
        token::mint = usdc_mint,
        token::authority = market,
    )]
    pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub market: Account<'info, Market>,
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + Position::INIT_SPACE,
        seeds = [Position::SEED, market.key().as_ref(), user.key().as_ref()],
        bump,
    )]
    pub position: Account<'info, Position>,
    #[account(mut, constraint = user_usdc.mint == market.usdc_mint)]
    pub user_usdc: Account<'info, TokenAccount>,
    #[account(mut, address = market.vault)]
    pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Settle<'info> {
    #[account(address = market.authority)]
    pub authority: Signer<'info>,
    #[account(mut)]
    pub market: Account<'info, Market>,
    /// CHECK: TxLINE epoch-day `daily_scores_roots` PDA, forwarded to the CPI.
    pub daily_scores_merkle_roots: UncheckedAccount<'info>,
    /// CHECK: verified against the TxLINE program id inside the CPI helper.
    pub txline_program: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    pub market: Account<'info, Market>,
    #[account(
        mut,
        seeds = [Position::SEED, market.key().as_ref(), user.key().as_ref()],
        bump = position.bump,
        constraint = position.owner == user.key(),
    )]
    pub position: Account<'info, Position>,
    #[account(mut, address = market.vault)]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut, constraint = user_usdc.mint == market.usdc_mint)]
    pub user_usdc: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ClaimTreasury<'info> {
    #[account(address = market.authority)]
    pub authority: Signer<'info>,
    #[account(mut)]
    pub market: Account<'info, Market>,
    #[account(mut, address = market.vault)]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut, constraint = authority_usdc.mint == market.usdc_mint)]
    pub authority_usdc: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[event]
pub struct MarketSettled {
    pub market: Pubkey,
    pub fixture_id: i64,
    pub winning_outcome: u8,
    pub voided: bool,
    pub distributable: u64,
}
