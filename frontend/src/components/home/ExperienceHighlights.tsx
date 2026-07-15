import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, Medal, Sparkles, Swords, Trophy } from "lucide-react";

const QUESTS: Array<{
  icon: LucideIcon;
  label: string;
  title: string;
  description: string;
  reward: string;
  href: string;
  color: string;
}> = [
  {
    icon: Trophy,
    label: "Starter quest",
    title: "Call your first fixture",
    description: "Choose a live World Cup market and lock in your match read.",
    reward: "+100 XP",
    href: "#markets",
    color: "text-[#ffc844] bg-[#ffc844]/10 border-[#ffc844]/15",
  },
  {
    icon: Swords,
    label: "Arena quest",
    title: "Challenge another fan",
    description:
      "Build a lineup, enter the queue, and prove who reads it better.",
    reward: "+250 XP",
    href: "/pvp",
    color: "text-[#ff927b] bg-[#ff6b4a]/10 border-[#ff6b4a]/20",
  },
  {
    icon: Medal,
    label: "Daily quests",
    title: "Build your player card",
    description: "Complete missions, collect XP, and climb the fan rankings.",
    reward: "View quests",
    href: "/missions",
    color: "text-[#35e881] bg-[#35e881]/10 border-[#35e881]/15",
  },
];

export function ExperienceHighlights() {
  return (
    <section aria-labelledby="quests-heading">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[#1479ff]">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            <p className="font-mono text-[9px] font-black uppercase tracking-[0.2em]">
              Quest board
            </p>
          </div>
          <h2
            id="quests-heading"
            className="font-game mt-1 text-3xl font-black tracking-tight text-charcoal-primary "
          >
            Choose your next move
          </h2>
        </div>
        <p className="max-w-xs text-right text-[11px] font-semibold leading-5 text-ash">
          Play matches, earn XP, and unlock your place on the leaderboard.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {QUESTS.map((quest, index) => (
          <Link
            key={quest.title}
            href={quest.href}
            className="game-quest-card clickable-card group relative overflow-hidden rounded-[22px] border border-border bg-surface-solid p-5"
          >
            <span
              className="absolute right-4 top-3 font-game text-5xl font-black text-charcoal-primary/[0.035] "
              aria-hidden="true"
            >
              0{index + 1}
            </span>
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${quest.color}`}
            >
              <quest.icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="mt-4 font-mono text-[9px] font-black uppercase tracking-[0.18em] text-ash">
              {quest.label}
            </p>
            <h3 className="font-game mt-1 text-xl font-black leading-tight text-charcoal-primary ">
              {quest.title}
            </h3>
            <p className="mt-2 min-h-10 text-[11px] font-medium leading-5 text-graphite">
              {quest.description}
            </p>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
              <span className="pixel-reward text-[10px] text-[#59a2ff]">
                {quest.reward}
              </span>
              <ArrowUpRight
                className="h-4 w-4 text-ash transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
