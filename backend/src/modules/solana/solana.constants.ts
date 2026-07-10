import { PublicKey } from "@solana/web3.js"

/**
 * On-chain program ids and PDA derivation helpers shared across the Solana
 * services. Mirrors the seeds baked into the `verity-worldcup` Anchor program
 * and TxLINE's published devnet program.
 */

// Our settlement engine (see solana/programs/verity-worldcup).
export const VERITY_WORLDCUP_PROGRAM_ID = new PublicKey(
  "8t3WbL4A91QGdUwdz9EAAW1yCtyVyEmmMBGRFcG89a21",
)

// TxLINE program: devnet `6pW64...`, mainnet `9ExbZ...`.
export const TXLINE_DEVNET_PROGRAM_ID = new PublicKey(
  "6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J",
)
export const TXLINE_MAINNET_PROGRAM_ID = new PublicKey(
  "9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA",
)

export const MARKET_SEED = Buffer.from("market")
export const VAULT_SEED = Buffer.from("vault")
export const POSITION_SEED = Buffer.from("position")
export const DAILY_SCORES_ROOTS_SEED = Buffer.from("daily_scores_roots")

/** Little-endian encode an i64 fixture id into 8 bytes. */
export function encodeFixtureId(fixtureId: number | bigint): Buffer {
  const buf = Buffer.alloc(8)
  buf.writeBigInt64LE(BigInt(fixtureId))
  return buf
}

/** Little-endian encode a u32 stat key into 4 bytes. */
export function encodeU32(value: number): Buffer {
  const buf = Buffer.alloc(4)
  buf.writeUInt32LE(value >>> 0)
  return buf
}

/**
 * Market PDA: seeds ["market", fixture_id (i64 LE), nonce (u32 LE)]. The nonce
 * (not the stat key) is the uniqueness seed, so several markets on one fixture
 * can share a base stat key (winner / draw / totals all read P1 goals) without
 * their PDAs colliding.
 */
export function deriveMarketPda(
  fixtureId: number | bigint,
  nonce: number,
  programId: PublicKey = VERITY_WORLDCUP_PROGRAM_ID,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [MARKET_SEED, encodeFixtureId(fixtureId), encodeU32(nonce)],
    programId,
  )
}

/** Random unsigned 32-bit market nonce (unique-per-fixture PDA seed). */
export function randomMarketNonce(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0
}

/** Combine-op codes stored on-chain: 0 = none (single stat), 1 = Add, 2 = Subtract. */
export const OP_NONE = 0
export const OP_ADD = 1
export const OP_SUBTRACT = 2

/** Logic-mode codes stored on-chain: 0 = none (arithmetic), 1 = AND, 2 = OR. */
export const LOGIC_NONE = 0
export const LOGIC_AND = 1
export const LOGIC_OR = 2

/** Vault PDA (market's USDC token account): seeds ["vault", market]. */
export function deriveVaultPda(
  market: PublicKey,
  programId: PublicKey = VERITY_WORLDCUP_PROGRAM_ID,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [VAULT_SEED, market.toBuffer()],
    programId,
  )
}

/** Position PDA: seeds ["position", market, owner]. */
export function derivePositionPda(
  market: PublicKey,
  owner: PublicKey,
  programId: PublicKey = VERITY_WORLDCUP_PROGRAM_ID,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [POSITION_SEED, market.toBuffer(), owner.toBuffer()],
    programId,
  )
}

/**
 * TxLINE daily_scores_roots PDA: seeds ["daily_scores_roots", epoch_day (u16 LE)].
 * epoch_day = floor(unixSeconds / 86400).
 */
export function deriveDailyScoresRootsPda(
  epochDay: number,
  txlineProgramId: PublicKey,
): [PublicKey, number] {
  const buf = Buffer.alloc(2)
  buf.writeUInt16LE(epochDay & 0xffff)
  return PublicKey.findProgramAddressSync(
    [DAILY_SCORES_ROOTS_SEED, buf],
    txlineProgramId,
  )
}

export function epochDayFromUnix(unixSeconds: number): number {
  return Math.floor(unixSeconds / 86400)
}

/** Sides used by the settlement engine. */
export const SIDE_NO = 0
export const SIDE_YES = 1

/** Comparison codes stored on-chain (match Anchor `Comparison` enum order). */
export const COMPARISON_GREATER_THAN = 0
export const COMPARISON_LESS_THAN = 1
export const COMPARISON_EQUAL_TO = 2
