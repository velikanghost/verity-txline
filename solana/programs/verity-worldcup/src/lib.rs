//! Verity World Cup — a parimutuel prop-market settlement engine.
//!
//! Bettors stake USDC on YES/NO for a TxLINE-tracked match stat (e.g. "total
//! corners > 10"). LPs seed both sides and earn a fee slice. At settlement a
//! keeper submits a fresh TxLINE Merkle proof; the program CPIs into TxLINE's
//! `validate_stat` to trustlessly determine the winning side, then winners and
//! LPs claim pro-rata. No oracle trust beyond TxLINE's signed on-chain roots.

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

    /// Create a market for one fixture + encoded stat key. The winning condition
    /// is fixed here and cannot be altered later.
    #[allow(clippy::too_many_arguments)]
    pub fn init_market(
        ctx: Context<InitMarket>,
        fixture_id: i64,
        nonce: u32,
        stat_key: u32,
        stat_key_b: u32,
        op: u8,
        logic: u8,
        stat_period: i32,
        threshold: i32,
        comparison: u8,
        threshold_b: i32,
        comparison_b: u8,
        deadline: i64,
        fee_bps: u16,
        creator_fee_share_bps: u16,
        lp_fee_share_bps: u16,
    ) -> Result<()> {
        require!(comparison <= 2, WcError::InvalidComparison);
        require!(comparison_b <= 2, WcError::InvalidComparison);
        require!(op <= 2, WcError::InvalidOp);
        require!(logic <= 2, WcError::InvalidLogic);
        require!(fee_bps <= BPS_DENOMINATOR as u16, WcError::InvalidFeeConfig);
        require!(
            (creator_fee_share_bps as u64 + lp_fee_share_bps as u64) <= BPS_DENOMINATOR,
            WcError::InvalidFeeConfig
        );

        let market = &mut ctx.accounts.market;
        market.authority = ctx.accounts.authority.key();
        market.creator = ctx.accounts.creator.key();
        market.usdc_mint = ctx.accounts.usdc_mint.key();
        market.vault = ctx.accounts.vault.key();
        market.fixture_id = fixture_id;
        market.nonce = nonce;
        market.stat_key = stat_key;
        market.stat_key_b = stat_key_b;
        market.op = op;
        market.logic = logic;
        market.stat_period = stat_period;
        market.threshold = threshold;
        market.comparison = comparison;
        market.threshold_b = threshold_b;
        market.comparison_b = comparison_b;
        market.deadline = deadline;
        market.fee_bps = fee_bps;
        market.creator_fee_share_bps = creator_fee_share_bps;
        market.lp_fee_share_bps = lp_fee_share_bps;
        market.yes_pool = 0;
        market.no_pool = 0;
        market.total_lp_deposits = 0;
        market.resolved = false;
        market.voided = false;
        market.winning_side = SIDE_NO;
        market.winning_pool = 0;
        market.distributable = 0;
        market.creator_fee = 0;
        market.lp_fee = 0;
        market.treasury_fee = 0;
        market.creator_claimed = false;
        market.treasury_claimed = false;
        market.bump = ctx.bumps.market;
        market.vault_bump = ctx.bumps.vault;
        Ok(())
    }

    /// Place a directional bet on YES (1) or NO (0).
    pub fn stake(ctx: Context<Stake>, side: u8, amount: u64) -> Result<()> {
        require!(side == SIDE_YES || side == SIDE_NO, WcError::InvalidSide);
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

        if side == SIDE_YES {
            market.yes_pool = market.yes_pool.checked_add(amount).ok_or(WcError::Overflow)?;
            position.yes_stake = position.yes_stake.checked_add(amount).ok_or(WcError::Overflow)?;
        } else {
            market.no_pool = market.no_pool.checked_add(amount).ok_or(WcError::Overflow)?;
            position.no_stake = position.no_stake.checked_add(amount).ok_or(WcError::Overflow)?;
        }
        position.bump = ctx.bumps.position;
        Ok(())
    }

    /// Provide liquidity, split evenly across both sides. The LP's losing half is
    /// forfeited to winners at settlement (directional risk); in return the LP
    /// earns a pro-rata slice of the settlement fee.
    pub fn add_liquidity(ctx: Context<Stake>, amount: u64) -> Result<()> {
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

        let yes_half = amount / 2;
        let no_half = amount - yes_half;

        let market = &mut ctx.accounts.market;
        let position = &mut ctx.accounts.position;
        position.market = market.key();
        position.owner = ctx.accounts.user.key();

        market.yes_pool = market.yes_pool.checked_add(yes_half).ok_or(WcError::Overflow)?;
        market.no_pool = market.no_pool.checked_add(no_half).ok_or(WcError::Overflow)?;
        market.total_lp_deposits =
            market.total_lp_deposits.checked_add(amount).ok_or(WcError::Overflow)?;
        position.yes_stake = position.yes_stake.checked_add(yes_half).ok_or(WcError::Overflow)?;
        position.no_stake = position.no_stake.checked_add(no_half).ok_or(WcError::Overflow)?;
        position.lp_deposit = position.lp_deposit.checked_add(amount).ok_or(WcError::Overflow)?;
        position.bump = ctx.bumps.position;
        Ok(())
    }

    /// Resolve the market by CPI-ing into TxLINE `validate_stat` with a fresh
    /// proof. Keeper-only. Snapshots the fee split and winning pool.
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

        let outcome = if market.logic == 0 {
            // --- Arithmetic path: `predicate(stat_a [op stat_b])` (single-stat,
            // totals via Add, winner/spread via Subtract). One CPI. ---
            let op = binary_expression_from_u8(market.op)?;
            let stat_b_term = match (op.as_ref(), stat_b) {
                (Some(_), Some(b)) => Some(StatTerm {
                    stat_to_prove: ScoreStat {
                        key: market.stat_key_b,
                        value: b.value,
                        period: b.period,
                    },
                    event_stat_root: b.event_stat_root,
                    stat_proof: b.stat_proof,
                }),
                (Some(_), None) => return err!(WcError::MissingSecondStat),
                (None, _) => None,
            };

            let inputs = ValidateStatInputs {
                ts,
                fixture_summary,
                fixture_proof,
                main_tree_proof,
                predicate: TraderPredicate {
                    threshold: market.threshold,
                    comparison: comparison_from_u8(market.comparison)?,
                },
                stat_a: StatTerm {
                    stat_to_prove: ScoreStat {
                        key: market.stat_key,
                        value: stat_value,
                        period: stat_period,
                    },
                    event_stat_root,
                    stat_proof,
                },
                stat_b: stat_b_term,
                op,
            };
            cpi_validate_stat(txline_program, daily_scores, inputs)?
        } else {
            // --- Logical path: two independent single-stat predicates combined
            // by AND/OR (BTTS, exact score, either-scores). Two CPIs; each proof
            // is still verified against TxLINE's signed roots. ---
            let b = stat_b.ok_or(error!(WcError::MissingSecondStat))?;

            let inputs_a = ValidateStatInputs {
                ts,
                fixture_summary: fixture_summary.clone(),
                fixture_proof: fixture_proof.clone(),
                main_tree_proof: main_tree_proof.clone(),
                predicate: TraderPredicate {
                    threshold: market.threshold,
                    comparison: comparison_from_u8(market.comparison)?,
                },
                stat_a: StatTerm {
                    stat_to_prove: ScoreStat {
                        key: market.stat_key,
                        value: stat_value,
                        period: stat_period,
                    },
                    event_stat_root,
                    stat_proof,
                },
                stat_b: None,
                op: None,
            };
            let bool_a = cpi_validate_stat(txline_program, daily_scores, inputs_a)?;

            let inputs_b = ValidateStatInputs {
                ts,
                fixture_summary,
                fixture_proof,
                main_tree_proof,
                predicate: TraderPredicate {
                    threshold: market.threshold_b,
                    comparison: comparison_from_u8(market.comparison_b)?,
                },
                stat_a: StatTerm {
                    stat_to_prove: ScoreStat {
                        key: market.stat_key_b,
                        value: b.value,
                        period: b.period,
                    },
                    event_stat_root: b.event_stat_root,
                    stat_proof: b.stat_proof,
                },
                stat_b: None,
                op: None,
            };
            let bool_b = cpi_validate_stat(txline_program, daily_scores, inputs_b)?;

            match market.logic {
                1 => bool_a && bool_b,
                2 => bool_a || bool_b,
                _ => return err!(WcError::InvalidLogic),
            }
        };

        market.winning_side = if outcome { SIDE_YES } else { SIDE_NO };
        let pot = (market.yes_pool as u128)
            .checked_add(market.no_pool as u128)
            .ok_or(WcError::Overflow)?;
        let fee = pot * market.fee_bps as u128 / BPS_DENOMINATOR as u128;
        let creator_fee = fee * market.creator_fee_share_bps as u128 / BPS_DENOMINATOR as u128;
        let lp_fee = fee * market.lp_fee_share_bps as u128 / BPS_DENOMINATOR as u128;
        let treasury_fee = fee - creator_fee - lp_fee;
        let distributable = pot - fee;
        let winning_pool = if market.winning_side == SIDE_YES {
            market.yes_pool
        } else {
            market.no_pool
        };

        market.winning_pool = winning_pool;
        market.distributable = distributable as u64;
        market.creator_fee = creator_fee as u64;
        market.lp_fee = lp_fee as u64;
        market.treasury_fee = treasury_fee as u64;
        // No winners staked the correct side -> refund everyone their principal.
        market.voided = winning_pool == 0;
        market.resolved = true;

        emit!(MarketSettled {
            market: market.key(),
            fixture_id: market.fixture_id,
            winning_side: market.winning_side,
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
            position
                .yes_stake
                .checked_add(position.no_stake)
                .ok_or(WcError::Overflow)?
        } else {
            let winning_stake = if market.winning_side == SIDE_YES {
                position.yes_stake
            } else {
                position.no_stake
            } as u128;
            let base = if market.winning_pool > 0 {
                (market.distributable as u128) * winning_stake / (market.winning_pool as u128)
            } else {
                0
            };
            let lp_reward = if market.total_lp_deposits > 0 && position.lp_deposit > 0 {
                (market.lp_fee as u128) * (position.lp_deposit as u128)
                    / (market.total_lp_deposits as u128)
            } else {
                0
            };
            (base + lp_reward) as u64
        };

        require!(payout > 0, WcError::NothingToClaim);
        transfer_out(market, &ctx.accounts.token_program, &ctx.accounts.vault, &ctx.accounts.user_usdc, payout)?;
        ctx.accounts.position.claimed = true;
        Ok(())
    }

    /// Creator claims their royalty slice of the fee (once).
    pub fn claim_creator_royalty(ctx: Context<ClaimCreatorRoyalty>) -> Result<()> {
        let market = &ctx.accounts.market;
        require!(market.resolved, WcError::NotResolved);
        require!(!market.voided, WcError::NothingToClaim);
        require!(!market.creator_claimed, WcError::CreatorAlreadyClaimed);
        let amount = market.creator_fee;
        require!(amount > 0, WcError::NothingToClaim);
        transfer_out(market, &ctx.accounts.token_program, &ctx.accounts.vault, &ctx.accounts.creator_usdc, amount)?;
        ctx.accounts.market.creator_claimed = true;
        Ok(())
    }

    /// Keeper/treasury claims the protocol slice of the fee (once).
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
    /// CHECK: creator identity recorded for royalty routing only.
    pub creator: UncheckedAccount<'info>,
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
pub struct ClaimCreatorRoyalty<'info> {
    #[account(address = market.creator)]
    pub creator: Signer<'info>,
    #[account(mut)]
    pub market: Account<'info, Market>,
    #[account(mut, address = market.vault)]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut, constraint = creator_usdc.mint == market.usdc_mint)]
    pub creator_usdc: Account<'info, TokenAccount>,
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
    pub winning_side: u8,
    pub voided: bool,
    pub distributable: u64,
}
