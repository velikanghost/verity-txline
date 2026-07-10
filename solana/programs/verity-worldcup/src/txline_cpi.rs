//! Mirror of the TxLINE (TxODDS) on-chain program's `validate_stat` interface,
//! plus a helper that performs the CPI and reads the returned boolean.
//!
//! Struct layouts are transcribed from the TxLINE devnet IDL (v1.5.5). Only the
//! pieces needed to build the instruction and decode the return value live here.

use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    instruction::{AccountMeta, Instruction},
    program::{get_return_data, invoke},
};

use crate::errors::WcError;

/// TxLINE devnet program id `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J`.
/// On mainnet this is `9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA`.
///
/// Stored as raw bytes so the constant is independent of which crate re-exports
/// the `pubkey!` macro across Anchor/Solana versions.
#[cfg(not(feature = "localnet"))]
pub const TXLINE_PROGRAM_ID: Pubkey = Pubkey::new_from_array([
    86, 117, 159, 44, 144, 95, 120, 96, 200, 99, 119, 20, 191, 36, 145, 48, 157, 192, 113, 129,
    81, 63, 122, 36, 191, 62, 218, 248, 127, 119, 80, 3,
]);

/// Local `mock-txline` program id `GjEDdDHNoUK52x73SBiMyfz5zn8BtsLuPE5YFfCW2U8T`,
/// injected by the `localnet` feature so offline `anchor test` can CPI into the
/// deterministic mock instead of the real TxLINE devnet program.
#[cfg(feature = "localnet")]
pub const TXLINE_PROGRAM_ID: Pubkey = Pubkey::new_from_array([
    233, 176, 164, 164, 100, 121, 255, 237, 179, 146, 132, 112, 226, 8, 204, 124, 80, 186, 232,
    123, 63, 144, 127, 175, 28, 161, 43, 0, 146, 52, 146, 212,
]);

/// Anchor 8-byte discriminator for `validate_stat`.
pub const VALIDATE_STAT_DISCRIMINATOR: [u8; 8] = [107, 197, 232, 90, 191, 136, 105, 185];

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

/// The second stat's fresh proof, supplied by the settler for relational
/// markets. The key is taken from the immutable market; only the proven value,
/// its period, and the Merkle proof come from the caller.
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct SettleSecondStat {
    pub value: i32,
    pub period: i32,
    pub event_stat_root: [u8; 32],
    pub stat_proof: Vec<ProofNode>,
}

/// Ordered argument list for `validate_stat`, serialized (borsh) after the
/// discriminator to form the instruction data.
#[derive(AnchorSerialize)]
struct ValidateStatArgs {
    ts: i64,
    fixture_summary: ScoresBatchSummary,
    fixture_proof: Vec<ProofNode>,
    main_tree_proof: Vec<ProofNode>,
    predicate: TraderPredicate,
    stat_a: StatTerm,
    stat_b: Option<StatTerm>,
    op: Option<BinaryExpression>,
}

/// Map the on-chain `u8` comparison code stored on a market to the TxLINE enum.
pub fn comparison_from_u8(code: u8) -> Result<Comparison> {
    match code {
        0 => Ok(Comparison::GreaterThan),
        1 => Ok(Comparison::LessThan),
        2 => Ok(Comparison::EqualTo),
        _ => err!(WcError::InvalidComparison),
    }
}

/// Map the on-chain `u8` op code stored on a market to the TxLINE enum.
/// `0` means single-stat (no second term); `1` = Add, `2` = Subtract.
pub fn binary_expression_from_u8(code: u8) -> Result<Option<BinaryExpression>> {
    match code {
        0 => Ok(None),
        1 => Ok(Some(BinaryExpression::Add)),
        2 => Ok(Some(BinaryExpression::Subtract)),
        _ => err!(WcError::InvalidOp),
    }
}

/// Inputs a settler supplies at resolution time (the fresh Merkle proof fetched
/// from TxLINE's `/api/scores/stat-validation` endpoint). For relational
/// markets `stat_b`/`op` carry the second term; both are `None` for single-stat.
pub struct ValidateStatInputs {
    pub ts: i64,
    pub fixture_summary: ScoresBatchSummary,
    pub fixture_proof: Vec<ProofNode>,
    pub main_tree_proof: Vec<ProofNode>,
    pub predicate: TraderPredicate,
    pub stat_a: StatTerm,
    pub stat_b: Option<StatTerm>,
    pub op: Option<BinaryExpression>,
}

/// Build and invoke `validate_stat` on the TxLINE program, returning its boolean
/// verdict. `txline_program` and `daily_scores` must be the real TxLINE program
/// account and the epoch-day `daily_scores_roots` PDA, respectively.
pub fn cpi_validate_stat<'info>(
    txline_program: &AccountInfo<'info>,
    daily_scores: &AccountInfo<'info>,
    inputs: ValidateStatInputs,
) -> Result<bool> {
    require_keys_eq!(
        *txline_program.key,
        TXLINE_PROGRAM_ID,
        WcError::InvalidTxlineProgram
    );

    let args = ValidateStatArgs {
        ts: inputs.ts,
        fixture_summary: inputs.fixture_summary,
        fixture_proof: inputs.fixture_proof,
        main_tree_proof: inputs.main_tree_proof,
        predicate: inputs.predicate,
        stat_a: inputs.stat_a,
        stat_b: inputs.stat_b,
        op: inputs.op,
    };

    let mut data = Vec::with_capacity(8 + 256);
    data.extend_from_slice(&VALIDATE_STAT_DISCRIMINATOR);
    args.serialize(&mut data)?;

    let ix = Instruction {
        program_id: TXLINE_PROGRAM_ID,
        accounts: vec![AccountMeta::new_readonly(*daily_scores.key, false)],
        data,
    };

    invoke(&ix, &[daily_scores.clone(), txline_program.clone()])?;

    let (ret_program, ret_data) = get_return_data().ok_or(error!(WcError::NoReturnData))?;
    require_keys_eq!(ret_program, TXLINE_PROGRAM_ID, WcError::InvalidTxlineProgram);

    // A borsh `bool` is a single byte: 0 = false, anything else = true.
    Ok(ret_data.first().copied().unwrap_or(0) != 0)
}
