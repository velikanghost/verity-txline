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
import { conditionLabel, explorerTx, SIDE_YES, SIDE_NO } from "@/lib/solana"
import { VerifiableResolutionReceipt } from "./VerifiableResolutionReceipt"

const fmtUsdc = (base?: string) =>
  base ? (Number(base) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "0"

/** Implied YES probability from parimutuel pool sizes. */
function impliedYes(yes?: string, no?: string): number | null {
  const y = Number(yes ?? 0)
  const n = Number(no ?? 0)
  if (y + n === 0) return null
  return Math.round((y / (y + n)) * 100)
}

export function WorldCupMarketCard({ market }: { market: WorldCupMarket }) {
  const { authenticated } = useAuth()
  const { data: pool } = usePoolStateQuery(market.id)
  const stake = useStakeWorldCupMutation()
  const claim = useClaimWorldCupMutation()
  const [amount, setAmount] = useState("1")

  const resolved = market.status === "resolved" || pool?.resolved
  const voided = market.status === "voided" || pool?.voided
  const yesPct = impliedYes(pool?.yesPool, pool?.noPool)

  const submitStake = async (side: number) => {
    if (!authenticated) return toast.error("Sign in to stake.")
    const amountUsdc = Number(amount)
    if (!amountUsdc || amountUsdc <= 0) return toast.error("Enter an amount.")
    await toast.promise(
      stake.mutateAsync({ marketId: market.id, side, amountUsdc }),
      {
        loading: "Placing stake…",
        success: (r) => (
          <span>
            Staked.{" "}
            <a className="underline" href={explorerTx(r.txSig)} target="_blank" rel="noreferrer">
              view tx
            </a>
          </span>
        ),
        error: (e) => e?.message || "Stake failed",
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

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            {market.matchup ?? `Fixture #${market.fixtureId}`}
          </p>
          <h3 className="mt-0.5 font-semibold leading-tight">
            {conditionLabel(market.question, market.comparison, market.threshold)}
          </h3>
        </div>
        {yesPct != null && !resolved && (
          <div className="shrink-0 text-right">
            <div className="text-lg font-bold">{yesPct}%</div>
            <div className="text-[10px] uppercase text-muted-foreground">yes</div>
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
        <span>YES pool: {fmtUsdc(pool?.yesPool)} USDC</span>
        <span>NO pool: {fmtUsdc(pool?.noPool)} USDC</span>
        <span>LP: {fmtUsdc(pool?.totalLpDeposits)} USDC</span>
      </div>

      {resolved && market.solanaResolveTxSig ? (
        <div className="mt-3 space-y-2">
          <VerifiableResolutionReceipt
            resolveTxSig={market.solanaResolveTxSig}
            outcome={market.resolvedOutcome}
          />
          <button
            onClick={submitClaim}
            disabled={claim.isPending}
            className="w-full rounded-lg bg-emerald-500 py-2 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50"
          >
            {claim.isPending ? "Claiming…" : "Claim winnings"}
          </button>
        </div>
      ) : voided ? (
        <p className="mt-3 text-sm text-amber-400">
          Market voided — stakes are refundable via claim.
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          <input
            type="number"
            min="0"
            step="0.5"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm"
            placeholder="Amount (USDC)"
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => submitStake(SIDE_YES)}
              disabled={stake.isPending}
              className="rounded-lg bg-emerald-500/90 py-2 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50"
            >
              Stake YES
            </button>
            <button
              onClick={() => submitStake(SIDE_NO)}
              disabled={stake.isPending}
              className="rounded-lg bg-rose-500/90 py-2 text-sm font-semibold text-black hover:bg-rose-400 disabled:opacity-50"
            >
              Stake NO
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
