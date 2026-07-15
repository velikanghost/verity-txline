"use client"

import Link from "next/link"
import {
  ArrowRight,
  Check,
  Flag,
  Radio,
  ShieldCheck,
  Sparkles,
  Trophy,
  Wallet,
  Zap,
} from "lucide-react"
import { useAuth } from "@/components/providers/AuthModals"

const STEPS = [
  { label: "Build your lineup", detail: "Lock in your match reads", icon: Flag },
  { label: "Enter the queue", detail: "Get paired with a rival", icon: Radio },
  {
    label: "Go head-to-head",
    detail: "Out-predict the other player",
    icon: ShieldCheck,
  },
  { label: "Proof lands", detail: "Victory and reward verified", icon: Trophy },
]

const REASONS = [
  {
    icon: ShieldCheck,
    title: "Proof-verified",
    detail:
      "Every duel is settled on-chain by verifying TxLINE's signed World Cup data — no oracle to trust.",
  },
  {
    icon: Zap,
    title: "Real USDC stakes",
    detail:
      "Back your reads with real USDC on Solana. Winners are paid out from the pool, trustlessly.",
  },
  {
    icon: Wallet,
    title: "No seed phrase",
    detail:
      "Sign up with an email. A secure Circle wallet is created for you — nothing to install.",
  },
]

export default function LandingPage() {
  const { login } = useAuth()

  return (
    <div className="flex flex-col gap-5 py-2">
      {/* Hero */}
      <section className="verity-card relative isolate overflow-hidden p-5 sm:p-8 lg:p-10">
        <div
          className="absolute -right-24 -top-24 -z-10 h-72 w-72 rounded-full bg-brand-primary/10 blur-[90px]"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-32 left-[15%] -z-10 h-64 w-64 rounded-full bg-meadow-green/10 blur-[100px]"
          aria-hidden="true"
        />

        <div className="mb-7 flex flex-wrap items-center justify-between gap-3 border-b border-stone-surface pb-5">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-meadow-green opacity-50" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-meadow-green" />
            </span>
            <span className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-ash">
              World Cup PvP is live
            </span>
          </div>
          <div className="verity-pill flex items-center gap-2 border border-stone-surface bg-parchment-card px-3 py-1.5">
            <Zap
              className="h-3.5 w-3.5 fill-sunburst-yellow text-sunburst-yellow"
              aria-hidden="true"
            />
            <span className="text-[10px] font-black uppercase tracking-[0.14em] text-ash">
              Season 01
            </span>
          </div>
        </div>

        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)] lg:gap-12">
          <div>
            <div className="verity-pill mb-4 inline-flex -rotate-2 items-center gap-2 border border-brand-primary/25 bg-brand-primary/10 px-3 py-1.5 text-brand-primary">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="text-sm font-bold">Welcome to Verity</span>
            </div>

            <h1 className="max-w-2xl text-[2.6rem] font-black leading-[0.95] tracking-[-0.045em] text-charcoal-primary dark:text-white sm:text-6xl lg:text-[4.2rem]">
              Read the field.
              <span className="block bg-gradient-to-r from-brand-primary to-meadow-green bg-clip-text pb-1 text-transparent">
                Beat the player.
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-sm font-medium leading-6 text-ash sm:text-base sm:leading-7">
              Verity is a head-to-head World Cup prediction arena. Build a
              lineup of match reads, get matched with another fan, and prove who
              knows the game better — every result settled with a real TxLINE
              proof on Solana.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={login}
                className="clickable inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-charcoal-primary px-6 text-base font-black text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-zinc-950"
              >
                Get Started
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <Link
                href="/pvp"
                className="clickable inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-stone-surface bg-parchment-card px-6 text-base font-black text-charcoal-primary transition-colors hover:bg-stone-surface dark:text-white"
              >
                <Trophy className="h-4 w-4 text-meadow-green" aria-hidden="true" />
                Browse duels
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-bold text-ash">
              {["Head-to-head", "Proof-verified", "USDC rewards"].map((item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-meadow-green" aria-hidden="true" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* How it works — step panel */}
          <div className="relative overflow-hidden rounded-[24px] border border-stone-surface bg-parchment-card p-4 sm:p-5">
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[9px] font-black uppercase tracking-[0.2em] text-ash">
                  How it works
                </p>
                <h2 className="mt-1 text-2xl font-black text-charcoal-primary dark:text-white">
                  Road to victory
                </h2>
                <p className="mt-1 text-xs font-medium text-ash">
                  Lineup to verified win
                </p>
              </div>
              <span className="verity-pill border border-meadow-green/25 bg-meadow-green/10 px-2.5 py-1 font-mono text-[9px] font-black uppercase tracking-wider text-meadow-green">
                + Proof
              </span>
            </div>

            <ol className="relative mt-5 space-y-2.5 before:absolute before:bottom-5 before:left-[19px] before:top-5 before:w-px before:bg-gradient-to-b before:from-brand-primary before:to-meadow-green/40">
              {STEPS.map((step, index) => (
                <li
                  key={step.label}
                  className={`relative flex items-center gap-3 rounded-2xl border p-3.5 ${
                    index === 0
                      ? "border-brand-primary/25 bg-brand-primary/10"
                      : "border-stone-surface bg-white-surface dark:bg-zinc-900/40"
                  }`}
                >
                  <div
                    className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                      index === 0
                        ? "border-brand-primary/40 bg-brand-primary text-white"
                        : "border-stone-surface bg-stone-surface text-ash"
                    }`}
                  >
                    <step.icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-black text-charcoal-primary dark:text-white">
                      {step.label}
                    </p>
                    <p className="mt-0.5 text-[10px] font-semibold text-ash">
                      {step.detail}
                    </p>
                  </div>
                  <span className="font-mono text-[9px] font-black text-ash/40">
                    0{index + 1}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Why Verity */}
      <section className="grid gap-3 sm:grid-cols-3">
        {REASONS.map((r) => (
          <div key={r.title} className="verity-card flex flex-col gap-2 p-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
              <r.icon className="h-5 w-5" />
            </span>
            <h3 className="mt-1 text-base font-black text-charcoal-primary dark:text-white">
              {r.title}
            </h3>
            <p className="text-sm leading-relaxed text-ash">{r.detail}</p>
          </div>
        ))}
      </section>

      {/* Final CTA */}
      <section className="verity-card flex flex-col items-center gap-4 p-8 text-center">
        <h2 className="max-w-md text-2xl font-black text-charcoal-primary dark:text-white sm:text-3xl">
          Ready to prove your read?
        </h2>
        <p className="max-w-md text-sm text-ash">
          Sign up in seconds with your email — we&apos;ll set up your wallet.
          Then build your first lineup and enter the arena.
        </p>
        <button
          onClick={login}
          className="clickable inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-charcoal-primary px-8 text-base font-black text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-zinc-950"
        >
          Get Started
          <ArrowRight className="h-4 w-4" />
        </button>
      </section>
    </div>
  )
}
