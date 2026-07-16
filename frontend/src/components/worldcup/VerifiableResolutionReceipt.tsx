import { ArrowUpRight, BadgeCheck, ShieldCheck } from "lucide-react"
import { explorerTx } from "@/lib/solana"
import type { WorldCupMarket } from "@/store/verity/worldcupQueries"

/**
 * Human label for the TxLINE stat family a market settled against. Stat keys are
 * paired odd/even = Participant 1 / Participant 2; the base stat repeats every
 * two keys (1/2 goals, 3/4 yellow cards, 5/6 red cards, 7/8 corners). We label
 * the family only — many markets combine both teams' keys, so a per-team label
 * would misrepresent them; the market question already carries the exact prop.
 */
const STAT_BASE_LABELS: Record<number, string> = {
  1: "Goals",
  2: "Yellow cards",
  3: "Red cards",
  4: "Corners",
}

function statLabel(statKey: number | null | undefined): string | null {
  if (!statKey || statKey < 1) return null
  return STAT_BASE_LABELS[Math.ceil(statKey / 2)] ?? null
}

const shortSig = (sig: string) =>
  sig.length > 12 ? `${sig.slice(0, 6)}…${sig.slice(-6)}` : sig

/**
 * The on-chain "receipt" for a resolved World Cup market: it shows exactly how
 * TxLINE settled the outcome (which fixture, which signed stat, the winning
 * result) and links to the Solana transaction where our program CPI'd into
 * TxLINE's `validate_stat` to verify that stat against TxLINE's signed Merkle
 * roots. This is the trust-minimized proof a user can independently check.
 */
export function VerifiableResolutionReceipt({
  market,
  resolveTxSig,
  outcome,
}: {
  market?: Pick<WorldCupMarket, "matchup" | "fixtureId" | "statKey">
  resolveTxSig: string
  outcome: string | null
}) {
  const stat = statLabel(market?.statKey)
  const fixture =
    market?.matchup ??
    (market?.fixtureId ? `Fixture ${market.fixtureId}` : null)

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-[#241b4a]/25 bg-[#f4fbf7]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b-2 border-[#241b4a]/12 bg-[#d7f3ea] px-3 py-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg border-2 border-[#176a58]/40 bg-white text-[#176a58]">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <p className="font-mono text-[9px] font-black uppercase tracking-[0.14em] text-[#176a58]">
          TxLINE-verified settlement
        </p>
      </div>

      {/* Body: how it settled */}
      <div className="space-y-2 px-3 py-3">
        {fixture && (
          <ReceiptRow label="Fixture" value={fixture} />
        )}
        {stat && <ReceiptRow label="Proven stat" value={stat} />}
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-[#756e89]">
            Result
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg border-2 border-[#176a58]/30 bg-white px-2 py-0.5 font-game text-xs font-black text-[#176a58]">
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
            {outcome ?? "Settled"}
          </span>
        </div>

        <p className="pt-1 font-sans text-[10px] font-medium leading-relaxed text-[#756e89]">
          Settled on-chain by verifying TxLINE&apos;s signed Merkle proof via a
          CPI into{" "}
          <code className="rounded bg-[#241b4a]/8 px-1 font-mono text-[9px] text-[#241b4a]">
            validate_stat
          </code>
          . No oracle to trust — check it yourself.
        </p>

        <a
          href={explorerTx(resolveTxSig)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex items-center gap-1 font-mono text-[10px] font-black text-[#176a58] hover:underline"
        >
          View settlement tx
          <span className="text-[#241b4a]/60">({shortSig(resolveTxSig)})</span>
          <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
        </a>
      </div>
    </div>
  )
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-[#756e89]">
        {label}
      </span>
      <span className="min-w-0 truncate font-game text-xs font-black text-[#241b4a]">
        {value}
      </span>
    </div>
  )
}
