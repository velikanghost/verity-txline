"use client"

import { Swords, Clock, ChevronRight } from "lucide-react"

interface Slate {
  id: string
  question: string
  deadline?: string
  lockTime?: string
  status?: string
  options: { id: string }[]
}

const deadlineLabel = (slate: Slate) => {
  const t = slate.lockTime || slate.deadline
  if (!t) return null
  const d = new Date(t)
  const past = d.getTime() < Date.now()
  const label = d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
  return { label, past }
}

export default function SlateGrid({
  slates,
  loading,
  onSelect,
}: {
  slates: Slate[]
  loading: boolean
  onSelect: (id: string) => void
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="verity-card h-32 animate-pulse bg-stone-100 dark:bg-zinc-900/40" />
        ))}
      </div>
    )
  }

  if (slates.length === 0) {
    return (
      <div className="verity-card p-10 text-center">
        <Swords className="mx-auto h-7 w-7 text-ash" />
        <p className="mt-3 text-sm font-bold text-charcoal-primary dark:text-white">
          No open slates right now
        </p>
        <p className="mt-1 text-xs text-ash">
          New cross-game contests drop before each matchday. Check back soon.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {slates.map((slate) => {
        const dl = deadlineLabel(slate)
        return (
          <button
            key={slate.id}
            onClick={() => onSelect(slate.id)}
            className="verity-card verity-card-hover group flex flex-col gap-3 p-4 text-left clickable"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-base font-black leading-tight text-charcoal-primary dark:text-white">
                {slate.question}
              </h3>
              <span className="verity-pill flex shrink-0 items-center gap-1 bg-brand-primary/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-brand-primary">
                <Swords className="h-3 w-3" /> PvP
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-wider text-ash">
                <span>{slate.options.length} props</span>
                {dl && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {dl.past ? "Locked" : dl.label}
                    </span>
                  </>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-ash transition-transform group-hover:translate-x-0.5" />
            </div>
          </button>
        )
      })}
    </div>
  )
}
