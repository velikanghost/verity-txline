use anchor_lang::prelude::*;

/// Maximum outcomes a market can have. Binary = 2; 3-way match result = 3.
pub const MAX_OUTCOMES: usize = 4;

/// Default/"else" outcome index. Outcomes 1..outcome_count carry predicates;
/// outcome 0 wins when none of them are true (e.g. NO for a binary market,
/// Draw for a 3-way match-result market).
pub const OUTCOME_DEFAULT: u8 = 0;

pub const BPS_DENOMINATOR: u64 = 10_000;

/// The settlement predicate for a single (non-default) outcome, applied to the
/// market's shared stat pair (`stat_key` [and `stat_key_b`]). Mirrors the fields
/// the TxLINE `validate_stat` CPI needs:
///  - `logic == 0`: arithmetic — `predicate(stat_a [op] stat_b)`.
///  - `logic != 0`: two single-stat predicates combined by AND/OR.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, InitSpace, Default)]
pub struct OutcomeRule {
    /// Arithmetic combine op (logic == 0): 0 none, 1 Add, 2 Subtract.
    pub op: u8,
    /// Logical combine mode: 0 none, 1 AND, 2 OR.
    pub logic: u8,
    pub threshold: i32,
    /// 0 = GreaterThan, 1 = LessThan, 2 = EqualTo.
    pub comparison: u8,
    pub threshold_b: i32,
    pub comparison_b: u8,
}

/// One parimutuel prop market, keyed by a TxLINE fixture + a unique nonce.
///
/// A market has `outcome_count` mutually-exclusive outcomes sharing one stat
/// pair. The winning outcome is a pure function of TxLINE-signed data, fixed at
/// creation — the settler only supplies fresh Merkle proofs.
#[account]
#[derive(InitSpace)]
pub struct Market {
    /// Keeper authorized to call `settle` and collect the treasury fee.
    pub authority: Pubkey,
    pub usdc_mint: Pubkey,
    /// PDA token account holding all staked USDC for this market.
    pub vault: Pubkey,

    /// TxLINE fixture id this market resolves against.
    pub fixture_id: i64,
    /// Unique-per-fixture nonce used in the market PDA seeds.
    pub nonce: u32,
    /// Shared stat key A (e.g. Participant 1 goals) read by every outcome rule.
    pub stat_key: u32,
    /// Shared stat key B (e.g. Participant 2 goals); 0 when unused.
    pub stat_key_b: u32,
    /// Period passed to TxLINE's `ScoreStat` (informational; the authoritative
    /// period comes from the fresh proof at settlement).
    pub stat_period: i32,

    /// Number of outcomes (2..=MAX_OUTCOMES). Outcome 0 is the default bucket.
    pub outcome_count: u8,
    /// Per-outcome predicates; index 0 is unused (the default outcome).
    pub outcome_rules: [OutcomeRule; MAX_OUTCOMES],

    /// Unix ts after which staking closes and settlement is allowed.
    pub deadline: i64,

    /// Protocol fee skimmed from the pot at settlement (basis points) — all to
    /// the treasury (this is a pure parimutuel: no LPs, no creator royalty).
    pub fee_bps: u16,

    /// USDC staked on each outcome by bettors.
    pub pools: [u64; MAX_OUTCOMES],

    pub resolved: bool,
    /// Set when the winning outcome had zero stake — everyone is refunded.
    pub voided: bool,
    /// Winning outcome index (valid only once `resolved`).
    pub winning_outcome: u8,

    // --- settlement snapshot (fixed at `settle`) ---
    pub winning_pool: u64,
    pub distributable: u64,
    pub treasury_fee: u64,
    pub treasury_claimed: bool,

    pub bump: u8,
    pub vault_bump: u8,
}

impl Market {
    pub const SEED: &'static [u8] = b"market";
    pub const VAULT_SEED: &'static [u8] = b"vault";
}

/// A single bettor's stake in a market.
#[account]
#[derive(InitSpace)]
pub struct Position {
    pub market: Pubkey,
    pub owner: Pubkey,
    /// Stake on each outcome (parallel to `Market.pools`).
    pub stakes: [u64; MAX_OUTCOMES],
    pub claimed: bool,
    pub bump: u8,
}

impl Position {
    pub const SEED: &'static [u8] = b"position";
}
