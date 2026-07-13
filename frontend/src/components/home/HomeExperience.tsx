import { WorldCupMarketsList } from "@/components/worldcup/WorldCupMarketsList";
import { ExperienceHighlights } from "./ExperienceHighlights";
import { PlayerProgress } from "./PlayerProgress";
import { WorldCupHero } from "./WorldCupHero";

export default function HomeExperience() {
  return (
    <div className="flex min-h-screen flex-col gap-7 pb-10 pt-2">
      <WorldCupHero />
      <PlayerProgress />
      <ExperienceHighlights />

      <section
        id="markets"
        className="scroll-mt-24"
        aria-labelledby="markets-heading"
      >
        <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2 text-[#1479ff]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#1479ff] opacity-40" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#1479ff]" />
              </span>
              <p className="font-mono text-[9px] font-black uppercase tracking-[0.2em]">
                Live match arena
              </p>
            </div>
            <h2
              id="markets-heading"
              className="font-game mt-1 text-3xl font-black tracking-tight text-charcoal-primary dark:text-white"
            >
              Pick a match. Make your call.
            </h2>
          </div>
          <span className="w-fit rounded-full border border-[#35e881]/20 bg-[#35e881]/10 px-3 py-1.5 font-mono text-[9px] font-black uppercase tracking-wider text-[#27bd69] dark:text-[#58f09a]">
            TxLINE verified
          </span>
        </div>
        <WorldCupMarketsList />
      </section>
    </div>
  );
}
