import { explorerTx } from "@/lib/solana"

/**
 * Shows the on-chain "receipt" for a resolved World Cup market: the Solana
 * transaction in which our program CPI'd into TxLINE's `validate_stat` to
 * verify the match data against TxLINE's signed on-chain Merkle roots. This is
 * the trust-minimized proof a user can independently check — no oracle to trust.
 */
export function VerifiableResolutionReceipt({
  resolveTxSig,
  outcome,
}: {
  resolveTxSig: string
  outcome: string | null
}) {
  return (
    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
      <div className="flex items-center gap-2 font-medium text-emerald-400">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M9 12l2 2 4-4" />
          <circle cx="12" cy="12" r="9" />
        </svg>
        Verified resolution{outcome ? ` — ${outcome}` : ""}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Settled on-chain by verifying TxLINE&apos;s signed Merkle proof via
        <code className="mx-1 rounded bg-black/20 px-1">validate_stat</code>.
      </p>
      <a
        href={explorerTx(resolveTxSig)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-400 hover:underline"
      >
        View settlement transaction
        <span aria-hidden="true">↗</span>
      </a>
    </div>
  )
}
