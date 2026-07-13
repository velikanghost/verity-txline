import Link from "next/link";
import {
  ArrowRight,
  Check,
  Flag,
  Radio,
  ShieldCheck,
  Sparkles,
  Swords,
  Trophy,
  Zap,
} from "lucide-react";

const GAME_STEPS = [
  { label: "Make your call", detail: "Choose a live fixture", icon: Flag },
  { label: "Watch it play", detail: "Follow TxLINE signals", icon: Radio },
  {
    label: "Proof lands",
    detail: "Result verified on-chain",
    icon: ShieldCheck,
  },
  { label: "Reward unlocked", detail: "Claim USDC winnings", icon: Trophy },
];

export function WorldCupHero() {
  return (
    <section className="game-hero relative isolate overflow-hidden rounded-[30px] border border-white/10 px-5 py-6 text-white sm:px-8 sm:py-8 lg:px-10 lg:py-10">
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

      <div className="mb-7 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#35e881] opacity-50" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#35e881]" />
          </span>
          <span className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-white/65">
            World Cup mode is live
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5">
          <Zap
            className="h-3.5 w-3.5 fill-[#ffc844] text-[#ffc844]"
            aria-hidden="true"
          />
          <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/70">
            Season 01
          </span>
        </div>
      </div>

      <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)] lg:gap-12">
        <div>
          <div className="mb-4 inline-flex -rotate-2 items-center gap-2 rounded-xl border border-[#1479ff]/35 bg-[#1479ff]/10 px-3 py-1.5 text-[#7bb5ff] shadow-[0_0_22px_rgba(20,121,255,.12)]">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="font-game text-sm font-bold">
              Your tournament starts here
            </span>
          </div>

          <h1 className="font-game max-w-2xl text-[2.85rem] font-black leading-[0.93] tracking-[-0.055em] sm:text-6xl lg:text-[4.45rem]">
            Pick your side.
            <span className="game-text-gradient block pb-1">
              Prove your read.
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-sm font-medium leading-6 text-[#aeb4d0] sm:text-base sm:leading-7">
            Enter the World Cup arena, back the moments you believe in, and
            level up with every sharp prediction. Every final result is settled
            with a real TxLINE proof on Solana.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="#markets"
              className="game-button-primary clickable inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-6 font-game text-base font-black text-white"
            >
              Play a match
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/pvp"
              className="clickable inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.06] px-6 font-game text-base font-black text-white hover:bg-white/10"
            >
              <Swords className="h-4 w-4 text-[#ff8064]" aria-hidden="true" />
              Challenge a fan
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-bold text-white/45">
            {["Live match data", "Proof-verified", "USDC rewards"].map(
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

        <div className="game-panel relative overflow-hidden rounded-[24px] border border-white/10 p-4 sm:p-5">
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
                Main quest
              </p>
              <h2 className="font-game mt-1 text-2xl font-black">
                Road to glory
              </h2>
              <p className="mt-1 text-xs font-medium text-[#858eae]">
                Final whistle to verified reward
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
                  <p className="font-game text-[15px] font-black text-white">
                    {step.label}
                  </p>
                  <p className="mt-0.5 text-[10px] font-semibold text-[#737c9d]">
                    {step.detail}
                  </p>
                </div>
                <span className="font-mono text-[9px] font-black text-white/20">
                  0{index + 1}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
