import Link from "next/link";
import {
  ArrowRight,
  Check,
  Flag,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";
import { DuelNavIcon } from "@/components/icons/ArcadeNavIcons";

const GAME_STEPS = [
  { label: "Build your lineup", detail: "Lock in your match reads", icon: Flag },
  { label: "Enter the queue", detail: "Get paired with a rival", icon: Radio },
  {
    label: "Go head-to-head",
    detail: "Out-predict the other player",
    icon: ShieldCheck,
  },
  { label: "Proof lands", detail: "Victory and reward verified", icon: Trophy },
];

export function WorldCupHero({ compact = false }: { compact?: boolean }) {
  return (
    <section
      className={`home-hero game-hero relative isolate overflow-hidden rounded-[30px] border border-white/10 text-white ${compact ? "home-hero-compact px-5 py-5 sm:px-7 sm:py-6 lg:px-8 lg:py-7" : "px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10"}`}
    >
      <div
        className="game-grid game-grid-fade absolute inset-0 -z-20 opacity-35"
        aria-hidden="true"
      />
      <div
        className="absolute -right-20 -top-24 -z-10 h-72 w-72 rounded-full bg-[#1479ff]/28 blur-[90px]"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-36 left-[18%] -z-10 h-72 w-72 rounded-full bg-[#1677ff]/25 blur-[100px]"
        aria-hidden="true"
      />
      <div
        className="absolute right-[38%] top-10 -z-10 h-2 w-2 rounded-full bg-white shadow-[0_0_18px_5px_rgba(255,255,255,.4)]"
        aria-hidden="true"
      />

      <div
        className={`home-hero-status flex flex-wrap items-center justify-between gap-3 border-b border-white/10 ${compact ? "mb-5 pb-4" : "mb-7 pb-5"}`}
      >
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#35e881] opacity-50" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#35e881]" />
          </span>
          <span className="home-live-label font-mono text-[10px] font-black uppercase tracking-[0.2em] text-white/65">
            World Cup PvP is live
          </span>
        </div>
        <div className="home-season-chip flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5">
          <Zap
            className="h-3.5 w-3.5 fill-[#ffc844] text-[#ffc844]"
            aria-hidden="true"
          />
          <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/70">
            Season 01
          </span>
        </div>
      </div>

      <div
        className={`grid items-center gap-8 ${compact ? "lg:grid-cols-[minmax(0,1.18fr)_minmax(260px,0.82fr)] lg:gap-8" : "lg:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)] lg:gap-12"}`}
      >
        <div>
          <div className="mb-4 inline-flex -rotate-2 items-center gap-2 rounded-xl border border-[#1479ff]/35 bg-[#1479ff]/10 px-3 py-1.5 text-[#7bb5ff] shadow-[0_0_22px_rgba(20,121,255,.12)]">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="font-game text-sm font-bold">
              Your arena opens here
            </span>
          </div>

          <h1
            className={`home-poster-title max-w-2xl leading-[0.93] ${compact ? "text-[2.65rem] sm:text-5xl lg:text-[3.65rem]" : "text-[2.85rem] sm:text-6xl lg:text-[4.45rem]"}`}
          >
            Read the field.
            <span className="game-text-gradient block pb-1">
              Beat the player.
            </span>
          </h1>

          <p className="home-hero-copy mt-5 max-w-xl text-sm font-medium leading-6 text-[#aeb4d0] sm:text-base sm:leading-7">
            {compact
              ? "Build your World Cup lineup, meet a rival, and settle the result with a real TxLINE proof."
              : "Build a World Cup lineup, meet another fan head-to-head, and prove who reads the match better. Every duel result is settled with a real TxLINE proof on Solana."}
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/pvp"
              className="game-button-primary clickable inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-6 font-game text-base font-black text-white"
            >
              {compact ? "Enter the arena" : "Enter Duel Station"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/search"
              className="home-secondary-cta clickable inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.06] px-6 font-game text-base font-black text-white hover:bg-white/10"
            >
              <Search className="h-4 w-4 text-[#35e881]" aria-hidden="true" />
              Scan open duels
            </Link>
          </div>

          <div
            className={`home-feature-list flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-bold text-white/45 ${compact ? "mt-5" : "mt-6"}`}
          >
            {["Head-to-head", "Proof-verified", "USDC rewards"].map(
              (item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <Check
                    className="h-3.5 w-3.5 text-[#35e881]"
                    aria-hidden="true"
                  />
                  {item}
                </span>
              ),
            )}
          </div>
        </div>

        {compact ? (
          <div className="home-compact-duel-card" aria-hidden="true">
            <span className="home-compact-duel-label">Duel station</span>
            <DuelNavIcon active className="home-compact-duel-icon" />
            <div className="home-compact-versus">
              <span>You</span>
              <strong>VS</strong>
              <span>Rival</span>
            </div>
          </div>
        ) : (
          <div className="home-roadmap game-panel relative overflow-hidden rounded-[24px] border border-white/10 p-4 sm:p-5">
          <div
            className="absolute right-5 top-5 h-16 w-16 rounded-full border border-[#1479ff]/20"
            aria-hidden="true"
          />
          <div
            className="absolute right-9 top-9 h-8 w-8 rounded-full border border-[#1479ff]/30"
            aria-hidden="true"
          />

          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[9px] font-black uppercase tracking-[0.2em] text-[#7e87aa]">
                Duel run
              </p>
              <h2 className="font-game mt-1 text-2xl font-black">
                Road to victory
              </h2>
              <p className="home-roadmap-subtitle mt-1 text-xs font-medium text-[#858eae]">
                Lineup to verified win
              </p>
            </div>
            <span className="rounded-xl border border-[#35e881]/20 bg-[#35e881]/10 px-2.5 py-1 font-mono text-[9px] font-black uppercase tracking-wider text-[#58f09a]">
              + Proof
            </span>
          </div>

          <ol className="relative mt-5 space-y-2.5 before:absolute before:bottom-5 before:left-[19px] before:top-5 before:w-px before:bg-gradient-to-b before:from-[#1479ff] before:to-[#35e881]/40">
            {GAME_STEPS.map((step, index) => (
              <li
                key={step.label}
                className={`relative flex items-center gap-3 rounded-2xl border p-3.5 transition-colors ${
                  index === 0
                    ? "border-[#1479ff]/35 bg-[#1479ff]/10"
                    : "border-white/[0.07] bg-[#090d1d]/55"
                }`}
              >
                <div
                  className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${index === 0 ? "border-[#1479ff]/45 bg-[#1479ff] text-white shadow-[0_0_22px_rgba(20,121,255,.28)]" : "border-white/10 bg-[#102033] text-[#778ba3]"}`}
                >
                  <step.icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="home-step-title font-game text-[15px] font-black text-white">
                    {step.label}
                  </p>
                  <p className="mt-0.5 text-[10px] font-semibold text-[#737c9d]">
                    {step.detail}
                  </p>
                </div>
                <span className="home-step-number font-mono text-[9px] font-black text-white/20">
                  0{index + 1}
                </span>
              </li>
            ))}
          </ol>
          </div>
        )}
      </div>
    </section>
  );
}
