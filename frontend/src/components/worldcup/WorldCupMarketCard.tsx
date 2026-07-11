"use client"

import { useState } from "react"
import toast from "react-hot-toast"
import { useAuth } from "@/components/providers/AuthModals"
import {
  WorldCupMarket,
  usePoolStateQuery,
  useStakeWorldCupMutation,
  useClaimWorldCupMutation,
} from "@/store/verity/worldcupQueries"
import { explorerTx } from "@/lib/solana"
import { VerifiableResolutionReceipt } from "./VerifiableResolutionReceipt"

const fmtUsdc = (base?: string) =>
  base
    ? (Number(base) / 1e6).toLocaleString(undefined, {
        maximumFractionDigits: 2,
      })
    : "0"

// Selected/affirmative buttons use the same dark fill as the PvP arena.
export function WorldCupMarketCard({ market }: { market: WorldCupMarket }) {
  const { authenticated } = useAuth()
  const { data: pool } = usePoolStateQuery(market.id)
  const stake = useStakeWorldCupMutation()
  const claim = useClaimWorldCupMutation()
  const [amount, setAmount] = useState("1")

  const resolved = market.status === "resolved" || pool?.resolved
  const voided = market.status === "voided" || pool?.voided

  const outcomes =
    market.outcomes?.length > 0
      ? market.outcomes
      : [market.noCondition, market.yesCondition]
  const pools = pool?.pools ?? []
  const total = pools.reduce((s, p) => s + Number(p ?? 0), 0)
  const pct = (i: number) =>
    total > 0 ? Math.round((Number(pools[i] ?? 0) / total) * 100) : null

  const submitStake = async (outcome: number) => {
    if (!authenticated) return toast.error("Sign in to predict.")
    const amountUsdc = Number(amount)
    if (!amountUsdc || amountUsdc <= 0) return toast.error("Enter an amount.")
    await toast.promise(
      stake.mutateAsync({ marketId: market.id, outcome, amountUsdc }),
      {
        loading: "Backing your call…",
        success: (r) => (
          <span>
            Prediction placed.{" "}
            <a
              className="underline"
              href={explorerTx(r.txSig)}
              target="_blank"
              rel="noreferrer"
            >
              view tx
            </a>
          </span>
        ),
        error: (e) => e?.message || "Prediction failed",
      },
    )
  }

  const submitClaim = async () => {
    await toast.promise(claim.mutateAsync({ marketId: market.id }), {
      loading: "Claiming…",
      success: "Winnings claimed.",
      error: (e) => e?.message || "Nothing to claim",
    })
  }

  // Order outcomes for staking: non-default options first, default last.
  const stakeOrder =
    outcomes.length <= 2
      ? [1, 0]
      : [...outcomes.map((_, i) => i).filter((i) => i !== 0), 0]

  return (
    <div className="verity-card flex h-full flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-ash truncate">
            {market.matchup ?? `Fixture #${market.fixtureId}`}
          </p>
          <h3 className="mt-0.5 text-sm font-bold leading-snug text-charcoal-primary dark:text-white">
            {market.question}
          </h3>
        </div>
        {outcomes.length > 2 && (
          <span className="verity-pill shrink-0 bg-brand-primary/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-brand-primary">
            {outcomes.length}-way
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-mono text-ash">
        {outcomes.map((label, i) => (
          <span key={i}>
            {label}: {fmtUsdc(pools[i])}
            {pct(i) != null && ` · ${pct(i)}%`}
          </span>
        ))}
      </div>

      <div className="mt-auto pt-3">
        {resolved && market.solanaResolveTxSig ? (
          <div className="space-y-2">
            <VerifiableResolutionReceipt
              resolveTxSig={market.solanaResolveTxSig}
              outcome={market.resolvedOutcome}
            />
            <button
              onClick={submitClaim}
              disabled={claim.isPending}
              className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-bold text-white transition-all hover:bg-emerald-500 disabled:opacity-50 clickable"
            >
              {claim.isPending ? "Claiming…" : "Claim winnings"}
            </button>
          </div>
        ) : voided ? (
          <p className="text-xs font-medium text-amber-600">
            Market voided — your amount is refundable via claim.
          </p>
        ) : (
          <div className="space-y-2">
            <input
              type="number"
              min="0"
              step="0.5"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-mono text-charcoal-primary dark:border-zinc-700 dark:bg-black dark:text-white"
              placeholder="Amount (USDC)"
            />
            <div
              className="grid gap-2"
              style={{
                gridTemplateColumns: `repeat(${stakeOrder.length}, minmax(0, 1fr))`,
              }}
            >
              {stakeOrder.map((i) => (
                <button
                  key={i}
                  onClick={() => submitStake(i)}
                  disabled={stake.isPending}
                  className="rounded-lg bg-brand-primary py-2 text-xs font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 clickable dark:bg-white dark:text-zinc-950"
                >
                  {outcomes[i]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
