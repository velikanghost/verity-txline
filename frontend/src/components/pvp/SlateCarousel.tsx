"use client";

import { useMemo } from "react";
import {
  AlertCircle,
  CalendarClock,
  Check,
  RefreshCw,
  Swords,
} from "lucide-react";

interface Slate {
  id: string;
  question: string;
  deadline?: string;
  lockTime?: string;
  status?: string;
  createdAt?: string;
  options: { id: string; volume?: number }[];
}

const timeBadge = (slate: Slate): { label: string; live: boolean } => {
  const t = slate.lockTime || slate.deadline;
  if (!t) return { label: "OPEN", live: true };
  const ms = new Date(t).getTime() - Date.now();
  if (ms <= 0) return { label: "LOCKED", live: false };
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return { label: `LIVE · ${h}H ${m}M`, live: true };
};

const dateLabel = (slate: Slate) => {
  const t = slate.lockTime || slate.deadline;
  if (!t) return "";
  return new Date(t).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function SlateCard({
  slate,
  selected,
  onSelect,
  index,
}: {
  slate: Slate;
  selected: boolean;
  onSelect: () => void;
  index: number;
}) {
  const badge = timeBadge(slate);
  const vol = useMemo(
    () => slate.options.reduce((s, o) => s + Number(o.volume ?? 0), 0),
    [slate],
  );

  return (
    <button
      onClick={onSelect}
      data-selected={selected}
      style={{ animationDelay: `${Math.min(index, 5) * 70}ms` }}
      className={`pvp-matchup-reveal pvp-slate-card relative flex min-h-36 w-[86%] max-w-[320px] shrink-0 snap-start flex-col gap-3 rounded-2xl p-4 text-left transition-all clickable sm:w-[300px] ${
        selected
          ? "bg-[#1479ff] text-white shadow-[0_12px_32px_rgba(20,121,255,.24)] "
          : "verity-card verity-card-hover bg-white "
      }`}
    >
      {/* Top row: live badge + volume */}
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold font-mono uppercase tracking-wider ${
            selected
              ? "bg-white/10 text-white "
              : "bg-stone-100 text-charcoal-primary "
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
            selected ? "bg-white/10 " : "bg-brand-primary/10 text-brand-primary"
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
            ? "border-white/10 opacity-70 "
            : "border-stone-200/70 text-ash "
        }`}
      >
        <span>{dateLabel(slate)}</span>
        <span>{slate.options.length} props · Min 3</span>
      </div>

      {selected && (
        <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#FF3E00] text-white ring-2 ring-white ">
          <Check className="h-3 w-3" strokeWidth={3.5} />
        </span>
      )}
    </button>
  );
}

export default function SlateCarousel({
  slates,
  loading,
  errorMessage,
  selectedId,
  onSelect,
  onRetry,
}: {
  slates: Slate[];
  loading: boolean;
  errorMessage?: string | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <div aria-live="polite" aria-busy="true">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-ash">
          <RefreshCw className="h-4 w-4 animate-spin" /> Loading live contests
        </div>
        <div className="flex gap-3 overflow-hidden">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="verity-card h-36 w-[86%] max-w-[320px] shrink-0 animate-pulse bg-stone-100 sm:w-[300px]"
            />
          ))}
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div
        className="pvp-state-card verity-card flex min-h-48 flex-col items-center justify-center p-6 text-center"
        role="alert"
      >
        <span className="pvp-state-icon flex h-12 w-12 items-center justify-center rounded-2xl">
          <AlertCircle className="h-6 w-6" />
        </span>
        <p className="mt-3 text-base font-bold text-charcoal-primary ">
          Contests could not load
        </p>
        <p className="mt-1 max-w-sm text-sm text-ash">
          {errorMessage || "The arena is temporarily unavailable."}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="game-button-primary mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold text-white"
        >
          <RefreshCw className="h-4 w-4" /> Try again
        </button>
      </div>
    );
  }

  if (slates.length === 0) {
    return (
      <div className="pvp-empty-slate verity-card p-8 text-center">
        <CalendarClock className="mx-auto h-7 w-7 text-ash" />
        <p className="mt-2 text-sm font-bold text-charcoal-primary ">
          No open contests right now
        </p>
        <p className="mt-1 text-xs text-ash">
          New World Cup slates drop before each matchday.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 border-current bg-white px-4 text-sm font-bold text-charcoal-primary"
        >
          <RefreshCw className="h-4 w-4" /> Check again
        </button>
      </div>
    );
  }

  return (
    <div className="pvp-slate-carousel">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-lg font-black text-charcoal-primary ">
          Select contest
        </h2>
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ash">
          Scroll · tap a card
        </span>
      </div>
      <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {slates.map((slate, index) => (
          <SlateCard
            key={slate.id}
            slate={slate}
            selected={selectedId === slate.id}
            onSelect={() => onSelect(slate.id)}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}
