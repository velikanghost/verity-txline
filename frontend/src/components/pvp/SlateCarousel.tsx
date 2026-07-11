"use client"

import { useMemo } from "react"
import { Check, Swords } from "lucide-react"

interface Slate {
  id: string
  question: string
  deadline?: string
  lockTime?: string
  status?: string
  createdAt?: string
  options: { id: string; volume?: number }[]
}

const timeBadge = (slate: Slate): { label: string; live: boolean } => {
  const t = slate.lockTime || slate.deadline
  if (!t) return { label: "OPEN", live: true }
  const ms = new Date(t).getTime() - Date.now()
  if (ms <= 0) return { label: "LOCKED", live: false }
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return { label: `LIVE · ${h}H ${m}M`, live: true }
}

const dateLabel = (slate: Slate) => {
  const t = slate.lockTime || slate.deadline
  if (!t) return ""
  return new Date(t).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function SlateCard({
  slate,
  selected,
  onSelect,
}: {
  slate: Slate
  selected: boolean
  onSelect: () => void
}) {
  const badge = timeBadge(slate)
  const vol = useMemo(
    () => slate.options.reduce((s, o) => s + Number(o.volume ?? 0), 0),
    [slate],
  )

  return (
    <button
      onClick={onSelect}
      className={`relative flex w-[86%] max-w-[320px] shrink-0 snap-start flex-col gap-3 rounded-2xl p-4 text-left transition-all clickable sm:w-[300px] ${
        selected
          ? "bg-[#121212] text-white shadow-lg dark:bg-white dark:text-zinc-950"
          : "verity-card verity-card-hover bg-white dark:bg-zinc-900/30"
      }`}
    >
      {/* Top row: live badge + volume */}
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold font-mono uppercase tracking-wider ${
            selected
              ? "bg-white/10 text-white dark:bg-black/10 dark:text-zinc-950"
              : "bg-stone-100 text-charcoal-primary dark:bg-zinc-800 dark:text-white"
          }`}
        >
          {badge.live && (
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          )}
          {badge.label}
        </span>
        <span
          className={`text-xs font-bold font-mono ${selected ? "opacity-80" : "text-ash"}`}
        >
          ${vol.toLocaleString()}
        </span>
      </div>

      {/* Name */}
      <div className="flex items-center gap-2">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
            selected
              ? "bg-white/10 dark:bg-black/10"
              : "bg-brand-primary/10 text-brand-primary"
          }`}
        >
          <Swords className="h-4 w-4" />
        </span>
        <h3 className="text-base font-black leading-tight">{slate.question}</h3>
      </div>

      {/* Bottom row */}
      <div
        className={`flex items-center justify-between border-t pt-2 text-[10px] font-mono font-bold uppercase tracking-wider ${
          selected
            ? "border-white/10 opacity-70 dark:border-black/10"
            : "border-stone-200/70 text-ash dark:border-zinc-800"
        }`}
      >
        <span>{dateLabel(slate)}</span>
        <span>{slate.options.length} props · Min 3</span>
      </div>

      {selected && (
        <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#FF3E00] text-white ring-2 ring-white dark:ring-zinc-900">
          <Check className="h-3 w-3" strokeWidth={3.5} />
        </span>
      )}
    </button>
  )
}

export default function SlateCarousel({
  slates,
  loading,
  selectedId,
  onSelect,
}: {
  slates: Slate[]
  loading: boolean
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  if (loading) {
    return (
      <div className="flex gap-3 overflow-hidden">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="verity-card h-32 w-[86%] max-w-[320px] shrink-0 animate-pulse bg-stone-100 dark:bg-zinc-900/40 sm:w-[300px]"
          />
        ))}
      </div>
    )
  }

  if (slates.length === 0) {
    return (
      <div className="verity-card p-8 text-center">
        <Swords className="mx-auto h-6 w-6 text-ash" />
        <p className="mt-2 text-sm font-bold text-charcoal-primary dark:text-white">
          No open contests right now
        </p>
        <p className="mt-1 text-xs text-ash">
          New cross-game slates drop before each matchday.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-lg font-black text-charcoal-primary dark:text-white">
          Select contest
        </h2>
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ash">
          Scroll · tap a card
        </span>
      </div>
      <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {slates.map((slate) => (
          <SlateCard
            key={slate.id}
            slate={slate}
            selected={selectedId === slate.id}
            onSelect={() => onSelect(slate.id)}
          />
        ))}
      </div>
    </div>
  )
}
