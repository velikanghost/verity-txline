use anchor_lang::prelude::*;

#[error_code]
pub enum WcError {
    #[msg("Market deadline has already passed; staking is closed")]
    MarketClosed,
    #[msg("Market deadline has not been reached yet")]
    MarketNotClosed,
    #[msg("Market is already resolved")]
    AlreadyResolved,
    #[msg("Market is not resolved yet")]
    NotResolved,
    #[msg("Invalid side; expected 0 (NO) or 1 (YES)")]
    InvalidSide,
    #[msg("Invalid outcome count (expected 2..=MAX_OUTCOMES with matching rules)")]
    InvalidOutcomeCount,
    #[msg("Invalid outcome index for this market")]
    InvalidOutcome,
    #[msg("Invalid comparison operator stored on market")]
    InvalidComparison,
    #[msg("Invalid combine op stored on market (expected 0, 1 or 2)")]
    InvalidOp,
    #[msg("Invalid logic mode stored on market (expected 0, 1 or 2)")]
    InvalidLogic,
    #[msg("Relational market requires a second stat proof but none was supplied")]
    MissingSecondStat,
    #[msg("Stake or liquidity amount must be greater than zero")]
    ZeroAmount,
    #[msg("Fee configuration is invalid (shares exceed the total fee)")]
    InvalidFeeConfig,
    #[msg("Provided TxLINE program account does not match the expected program id")]
    InvalidTxlineProgram,
    #[msg("Fixture id in the proof does not match this market")]
    FixtureMismatch,
    #[msg("TxLINE validate_stat returned no data")]
    NoReturnData,
    #[msg("This position has already been claimed")]
    AlreadyClaimed,
    #[msg("Nothing available to claim for this account")]
    NothingToClaim,
    #[msg("Creator royalty already claimed")]
    CreatorAlreadyClaimed,
    #[msg("Treasury fee already claimed")]
    TreasuryAlreadyClaimed,
    #[msg("Arithmetic overflow")]
    Overflow,
}
