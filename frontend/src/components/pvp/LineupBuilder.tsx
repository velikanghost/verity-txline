"use client"

import { useMemo, useState } from "react"
import { Check, ChevronLeft, Swords } from "lucide-react"
import toast from "@/lib/toast"
import { useAuth } from "@/components/providers/AuthModals"
import { useUsdcBalance } from "@/hooks/useUsdcBalance"
import { useSubmitPvpTicketMutation } from "@/store/verity/verityQueries"

interface PropOption {
  id: string
  question?: string
  status?: string
  outcomeCount?: number
  outcomes?: string[]
  yesCondition?: string
  noCondition?: string
  txlineMatchup?: string | null
  txlineFixtureId?: number | null
  volume?: number
}

interface Slate {
  id: string
  question: string
  deadline?: string
  lockTime?: string
  options: PropOption[]
}

// Outcome labels for a prop, in on-chain order (index 0 = default bucket).
// The submitted `selection` must be one of these exact strings.
const propOutcomes = (opt: PropOption): string[] => {
  if (opt.outcomes && opt.outcomes.length > 0) return opt.outcomes
  return [opt.noCondition || "No", opt.yesCondition || "Yes"]
}

// For binary props show the affirmative option first; the default (No) last.
const displayOrder = (labels: string[]): number[] =>
  labels.length <= 2
    ? [1, 0]
    : [...labels.map((_, i) => i).filter((i) => i !== 0), 0]

export default function LineupBuilder({
  slate,
  onBack,
  onSubmitted,
}: {
  slate: Slate
  onBack: () => void
  onSubmitted: () => void
}) {
  const { authenticated, login } = useAuth()
  const { rawBalance, formattedBalance } = useUsdcBalance()
  const submit = useSubmitPvpTicketMutation()

  // optionId -> chosen outcome label
  const [picks, setPicks] = useState<Record<string, string>>({})
  // optionId -> USDC amount for that pick
  const [amounts, setAmounts] = useState<Record<string, string>>({})
  // Quick "apply to all" amount.
  const [amountAll, setAmountAll] = useState("1")

  const pickIds = Object.keys(picks)
  const pickCount = pickIds.length

  const togglePick = (opt: PropOption, label: string) => {
    setPicks((prev) => {
      const next = { ...prev }
      if (next[opt.id] === label) {
        delete next[opt.id]
      } else {
        next[opt.id] = label
        // Seed this pick's amount from the "apply to all" value.
        setAmounts((a) => (a[opt.id] ? a : { ...a, [opt.id]: amountAll }))
      }
      return next
    })
  }

  const setAmount = (id: string, v: string) =>
    setAmounts((prev) => ({ ...prev, [id]: v }))

  const applyAll = (v: string) => {
    setAmountAll(v)
    setAmounts((prev) => {
      const next = { ...prev }
      for (const id of pickIds) next[id] = v
      return next
    })
  }

  const total = useMemo(
    () => pickIds.reduce((s, id) => s + (Number(amounts[id]) || 0), 0),
    [pickIds, amounts],
  )

  const allAmountsValid = pickIds.every((id) => Number(amounts[id]) > 0)
  const rawTotal = BigInt(Math.round(total * 1e6))
  const enoughBalance = rawTotal <= (rawBalance || BigInt(0))
  const canSubmit =
    pickCount >= 3 && allAmountsValid && enoughBalance && !submit.isPending

  const handleSubmit = async () => {
    if (!authenticated) {
      login()
      return
    }
    if (pickCount < 3) return toast.error("Pick at least 3 props.")
    if (!allAmountsValid) return toast.error("Set an amount on every pick.")
    if (!enoughBalance)
      return toast.error(
        `Not enough USDC. Lineup needs ${total} but you have ${formattedBalance}.`,
      )

    const body = {
      parentMarketId: slate.id,
      picks: pickIds.map((id) => ({
        marketId: id,
        selection: picks[id],
        amountUsdc: Number(amounts[id]),
      })),
    }

    await toast.promise(submit.mutateAsync(body), {
      loading: "Backing your lineup…",
      success: "Lineup in — finding you an opponent.",
      error: (e) => e?.message || "Could not submit lineup",
    })
    setPicks({})
    setAmounts({})
    onSubmitted()
  }

  const deadlineLabel = useMemo(() => {
    const t = slate.lockTime || slate.deadline
    if (!t) return ""
    const d = new Date(t)
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  }, [slate])

  return (
    <div className="flex flex-col gap-4 pb-28 lg:pb-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1 self-start text-xs font-bold font-mono uppercase tracking-wider text-ash hover:text-charcoal-primary dark:hover:text-white transition-colors clickable"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> All slates
        </button>
        <h1 className="text-2xl font-black text-charcoal-primary dark:text-white leading-tight">
          {slate.question}
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-wider text-ash">
          <span>{slate.options.length} props</span>
          <span>·</span>
          <span>Pick 3 or more</span>
          {deadlineLabel && (
            <>
              <span>·</span>
              <span>Locks {deadlineLabel}</span>
            </>
          )}
        </div>
      </div>

      {/* Prop list */}
      <div className="flex flex-col gap-3">
        {slate.options.map((opt) => {
          const labels = propOutcomes(opt)
          const order = displayOrder(labels)
          const selected = picks[opt.id]
          const isMulti = labels.length > 2

          return (
            <div
              key={opt.id}
              className={`verity-card p-4 transition-shadow ${
                selected ? "ring-1 ring-brand-primary/40" : ""
              }`}
            >
              <div className="mb-3 flex flex-col gap-0.5">
                {opt.txlineMatchup && (
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ash">
                    {opt.txlineMatchup}
                  </span>
                )}
                <h3 className="text-sm font-bold text-charcoal-primary dark:text-white leading-snug">
                  {opt.question || "Prop"}
                </h3>
              </div>

              <div
                className="grid gap-2"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(order.length, 3)}, minmax(0, 1fr))`,
                }}
              >
                {order.map((i) => {
                  const label = labels[i]
                  const isSel = selected === label
                  return (
                    <button
                      key={label + i}
                      type="button"
                      onClick={() => togglePick(opt, label)}
                      className={`relative flex items-center justify-center rounded-xl p-3 text-xs font-bold transition-all clickable ${
                        isSel
                          ? "bg-brand-primary text-white dark:bg-white dark:text-zinc-950 shadow-md"
                          : "bg-[#FAF9F6] dark:bg-zinc-900/40 text-charcoal-primary dark:text-zinc-300 hover:bg-[#F3F1EC] dark:hover:bg-zinc-800/50"
                      }`}
                    >
                      <span className="text-center leading-tight">{label}</span>
                      {isSel && (
                        <span className="absolute -right-1.5 -top-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#FF3E00] text-white ring-2 ring-white dark:ring-zinc-900">
                          <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Per-pick amount */}
              {selected && (
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-stone-200/70 dark:border-zinc-800 pt-3">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ash">
                    Your amount on {isMulti ? selected : `“${selected}”`}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={amounts[opt.id] ?? ""}
                      onChange={(e) => setAmount(opt.id, e.target.value)}
                      className="h-8 w-24 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-black px-2 text-right text-xs font-mono font-bold text-charcoal-primary dark:text-white"
                      placeholder="0"
                    />
                    <span className="text-[10px] font-bold text-ash">USDC</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Summary bar */}
      <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+64px)] z-40 px-4 lg:static lg:px-0">
        <div className="verity-card mx-auto flex max-w-[820px] flex-col gap-3 border border-stone-200/70 dark:border-zinc-800 bg-warm-canvas p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ash">
                Same amount on all
              </span>
              <input
                type="number"
                min="0"
                step="0.5"
                value={amountAll}
                onChange={(e) => applyAll(e.target.value)}
                className="h-8 w-20 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-black px-2 text-right text-xs font-mono font-bold text-charcoal-primary dark:text-white"
              />
            </div>
            <div className="text-right">
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-ash">
                Total · {pickCount} picks
              </div>
              <div className="text-sm font-black font-mono text-charcoal-primary dark:text-white">
                {total.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}{" "}
                USDC
              </div>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={authenticated && !canSubmit}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-primary text-sm font-black uppercase tracking-wider text-white shadow-md transition-all hover:opacity-90 disabled:opacity-40 clickable dark:bg-white dark:text-zinc-950"
          >
            <Swords className="h-4 w-4" />
            {!authenticated
              ? "Sign in to enter"
              : submit.isPending
                ? "Backing lineup…"
                : pickCount < 3
                  ? `Pick ${3 - pickCount} more`
                  : !enoughBalance
                    ? "Not enough USDC"
                    : "Enter the duel"}
          </button>
        </div>
      </div>
    </div>
  )
}
