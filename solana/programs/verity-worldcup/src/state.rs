use anchor_lang::prelude::*;

/// Side codes used across stake/position accounting.
pub const SIDE_NO: u8 = 0;
pub const SIDE_YES: u8 = 1;

pub const BPS_DENOMINATOR: u64 = 10_000;

/// One parimutuel prop market, keyed by a TxLINE fixture + encoded stat key.
///
/// The winning condition (`stat_key`/`stat_period`/`threshold`/`comparison`) is
/// fixed at creation and cannot be changed, so resolution is a pure function of
/// TxLINE-signed data — the settler only supplies a fresh Merkle proof.
#[account]
#[derive(InitSpace)]
pub struct Market {
    /// Keeper authorized to call `settle` (backend protocol wallet).
    pub authority: Pubkey,
    /// Market creator, entitled to the creator royalty slice of the fee.
    pub creator: Pubkey,
    pub usdc_mint: Pubkey,
    /// PDA token account holding all staked USDC for this market.
    pub vault: Pubkey,

    /// TxLINE fixture id this market resolves against.
    pub fixture_id: i64,
    /// Unique-per-fixture nonce used in the market PDA seeds. Lets several
    /// markets share the same base stat key (e.g. winner / draw / totals all
    /// read P1 goals) without their PDAs colliding.
    pub nonce: u32,
    /// Encoded TxLINE stat key `A`: `(period * 1000) + base_key`.
    pub stat_key: u32,
    /// Second stat key for relational (two-stat) markets; `0` when single-stat.
    pub stat_key_b: u32,
    /// Arithmetic combine op (used only when `logic == 0`): 0 = none (single
    /// stat), 1 = Add, 2 = Subtract. The predicate is applied to `stat_a [op stat_b]`.
    pub op: u8,
    /// Logical combine mode: 0 = none (arithmetic path above), 1 = AND, 2 = OR.
    /// When set, two independent predicates — `(stat_a cmp_a thr_a)` and
    /// `(stat_b cmp_b thr_b)` — are evaluated and combined (e.g. BTTS, exact
    /// score). `op` is ignored in this mode.
    pub logic: u8,
    /// Period component passed to TxLINE's `ScoreStat` (informational; the
    /// authoritative period is supplied from the fresh proof at settlement).
    pub stat_period: i32,
    /// Threshold for stat A (predicate A).
    pub threshold: i32,
    /// Comparison for stat A: 0 = GreaterThan, 1 = LessThan, 2 = EqualTo.
    pub comparison: u8,
    /// Threshold for stat B's predicate (logical mode only).
    pub threshold_b: i32,
    /// Comparison for stat B's predicate (logical mode only).
    pub comparison_b: u8,

    /// Unix ts after which staking closes and settlement is allowed.
    pub deadline: i64,

    /// Total protocol fee taken from the pot at settlement (basis points).
    pub fee_bps: u16,
    /// Portion of the fee routed to the creator (basis points of the fee).
    pub creator_fee_share_bps: u16,
    /// Portion of the fee routed to LPs (basis points of the fee).
    pub lp_fee_share_bps: u16,

    /// Total USDC staked on YES (bettor stakes + LP yes halves).
    pub yes_pool: u64,
    /// Total USDC staked on NO (bettor stakes + LP no halves).
    pub no_pool: u64,
    /// Total LP principal (used to weight the LP fee slice).
    pub total_lp_deposits: u64,

    pub resolved: bool,
    /// Set when the winning side had zero stake — everyone is refunded.
    pub voided: bool,
    /// 0 = NO won, 1 = YES won (valid only once `resolved`).
    pub winning_side: u8,

    // --- settlement snapshot (fixed at `settle`) ---
    pub winning_pool: u64,
    pub distributable: u64,
    pub creator_fee: u64,
    pub lp_fee: u64,
    pub treasury_fee: u64,
    pub creator_claimed: bool,
    pub treasury_claimed: bool,

    pub bump: u8,
    pub vault_bump: u8,
}

impl Market {
    pub const SEED: &'static [u8] = b"market";
    pub const VAULT_SEED: &'static [u8] = b"vault";
}

/// A single account's stake in a market. LPs and bettors share this account:
/// LP deposits are split evenly into `yes_stake`/`no_stake` and additionally
/// recorded in `lp_deposit` for fee-share weighting.
#[account]
#[derive(InitSpace)]
pub struct Position {
    pub market: Pubkey,
    pub owner: Pubkey,
    pub yes_stake: u64,
    pub no_stake: u64,
    pub lp_deposit: u64,
    pub claimed: bool,
    pub bump: u8,
}

impl Position {
    pub const SEED: &'static [u8] = b"position";
}
