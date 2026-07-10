//! Local mock of TxLINE's on-chain `validate_stat`. Used ONLY for offline
//! `anchor test`: it mirrors the real instruction's signature and return type but
//! ignores the Merkle proofs and instead evaluates the predicate directly against
//! the supplied stat value(s). This lets the settlement engine's CPI + payout math
//! be tested deterministically without live TxLINE data or a cloned mainnet PDA.
//!
//! The instruction is named `validate_stat` so Anchor derives the exact same
//! 8-byte discriminator the real program uses.

use anchor_lang::prelude::*;

declare_id!("GjEDdDHNoUK52x73SBiMyfz5zn8BtsLuPE5YFfCW2U8T");

#[program]
pub mod mock_txline {
    use super::*;

    #[allow(clippy::too_many_arguments)]
    pub fn validate_stat(
        _ctx: Context<ValidateStat>,
        _ts: i64,
        _fixture_summary: ScoresBatchSummary,
        _fixture_proof: Vec<ProofNode>,
        _main_tree_proof: Vec<ProofNode>,
        predicate: TraderPredicate,
        stat_a: StatTerm,
        stat_b: Option<StatTerm>,
        op: Option<BinaryExpression>,
    ) -> Result<bool> {
        let a = stat_a.stat_to_prove.value as i64;
        let effective = match (stat_b, op) {
            (Some(b), Some(BinaryExpression::Add)) => a + b.stat_to_prove.value as i64,
            (Some(b), Some(BinaryExpression::Subtract)) => a - b.stat_to_prove.value as i64,
            _ => a,
        };
        let threshold = predicate.threshold as i64;
        let result = match predicate.comparison {
            Comparison::GreaterThan => effective > threshold,
            Comparison::LessThan => effective < threshold,
            Comparison::EqualTo => effective == threshold,
        };
        Ok(result)
    }
}

#[derive(Accounts)]
pub struct ValidateStat<'info> {
    /// CHECK: unused in the mock; present to mirror the real account list.
    pub daily_scores_merkle_roots: UncheckedAccount<'info>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ScoresUpdateStats {
    pub update_count: i32,
    pub min_timestamp: i64,
    pub max_timestamp: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ScoresBatchSummary {
    pub fixture_id: i64,
    pub update_stats: ScoresUpdateStats,
    pub events_sub_tree_root: [u8; 32],
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ProofNode {
    pub hash: [u8; 32],
    pub is_right_sibling: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum Comparison {
    GreaterThan,
    LessThan,
    EqualTo,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct TraderPredicate {
    pub threshold: i32,
    pub comparison: Comparison,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ScoreStat {
    pub key: u32,
    pub value: i32,
    pub period: i32,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct StatTerm {
    pub stat_to_prove: ScoreStat,
    pub event_stat_root: [u8; 32],
    pub stat_proof: Vec<ProofNode>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum BinaryExpression {
    Add,
    Subtract,
}
