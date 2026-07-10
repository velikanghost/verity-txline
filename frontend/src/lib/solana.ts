// Solana config + helpers for the World Cup settlement UI. The app is custodial
// (Circle-managed wallets, backend-signed transactions), so this file only holds
// read-side config and explorer/link helpers — no wallet-adapter runtime.

export const SOLANA_CLUSTER =
  process.env.NEXT_PUBLIC_SOLANA_CLUSTER || "devnet"

export const VERITY_WORLDCUP_PROGRAM_ID =
  process.env.NEXT_PUBLIC_WORLDCUP_PROGRAM_ID ||
  "8t3WbL4A91QGdUwdz9EAAW1yCtyVyEmmMBGRFcG89a21"

export const TXLINE_PROGRAM_ID =
  process.env.NEXT_PUBLIC_TXLINE_PROGRAM_ID ||
  "6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J"

/** Solana Explorer link for a transaction signature. */
export function explorerTx(signature: string): string {
  const cluster = SOLANA_CLUSTER === "mainnet" ? "" : `?cluster=${SOLANA_CLUSTER}`
  return `https://explorer.solana.com/tx/${signature}${cluster}`
}

/** Solana Explorer link for an address (account/program). */
export function explorerAddress(address: string): string {
  const cluster = SOLANA_CLUSTER === "mainnet" ? "" : `?cluster=${SOLANA_CLUSTER}`
  return `https://explorer.solana.com/address/${address}${cluster}`
}

const COMPARISON_LABEL: Record<number, string> = {
  0: ">",
  1: "<",
  2: "=",
}

/** Human phrasing for a market's YES condition, e.g. "Total corners > 10". */
export function conditionLabel(
  question: string,
  comparison: number | null,
  threshold: number | null,
): string {
  if (comparison == null || threshold == null) return question
  return `${question} ${COMPARISON_LABEL[comparison] ?? "?"} ${threshold}`
}

export const SIDE_NO = 0
export const SIDE_YES = 1

/** Shorten an address for display, e.g. `AWqG…PRVz`. */
export function shortAddress(address?: string | null, chars = 4): string {
  if (!address) return ""
  if (address.length <= chars * 2 + 1) return address
  return `${address.slice(0, chars)}…${address.slice(-chars)}`
}

/** Best-effort human-readable error message for on-chain/tx failures. */
export function formatWeb3Error(error: unknown): string {
  const msg =
    (error as any)?.message ||
    (typeof error === "string" ? error : "") ||
    "Transaction failed"
  if (/insufficient/i.test(msg)) return "Insufficient balance for this transaction."
  if (/blockhash|expired/i.test(msg)) return "Transaction expired — please retry."
  return msg
}
