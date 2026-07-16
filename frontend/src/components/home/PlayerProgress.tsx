"use client";

import { Medal, Trophy } from "lucide-react";
import { useWalletProfile } from "@/hooks/useWalletProfile";
import { getArenaRank, getArenaRankProgress } from "@/lib/arenaRank";

export function PlayerProgress({ preview = false }: { preview?: boolean }) {
  const { profile } = useWalletProfile();
  const xp = profile?.arenaXp ?? (preview ? 2260 : 0);
  const rank = getArenaRank(xp);
  const progressPercent = getArenaRankProgress(xp, rank);
  const xpRemaining =
    rank.nextMinXp === null ? 0 : Math.max(0, rank.nextMinXp - xp);

  return (
    <section aria-label="Arena rank" className="home-rank-card">
      <div className="flex items-center gap-4">
        <div
          className={`home-rank-badge relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${rank.badgeClass}`}
        >
          {rank.name === "Unranked" ? (
            <Medal className="h-7 w-7" aria-hidden="true" />
          ) : (
            <Trophy className="h-7 w-7" aria-hidden="true" />
          )}
          <span className="home-rank-label absolute -bottom-1.5 -right-1.5 rounded-md border-2 border-[#241b4a] bg-white px-1.5 py-0.5 font-mono text-[7px] font-black uppercase text-[#241b4a]">
            Rank
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[8px] font-black uppercase tracking-[0.18em] text-ash">
                Arena rank
              </p>
              <p className={`font-game mt-0.5 text-xl font-black ${rank.labelClass}`}>
                {rank.name}
              </p>
            </div>
            <div className="text-right">
              <span className="home-rank-xp block font-mono text-[10px] font-black text-[#241b4a]">
                {xp.toLocaleString()} XP
              </span>
              <span className="home-rank-next mt-0.5 block font-mono text-[8px] font-black uppercase tracking-wider text-ash">
                {rank.nextName
                  ? `${xpRemaining.toLocaleString()} XP to ${rank.nextName}`
                  : "Top rank reached"}
              </span>
            </div>
          </div>
          <div className="home-rank-progress mt-3 h-2.5 overflow-hidden rounded-full border border-[#241b4a]/15 bg-[#241b4a]/10">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${rank.progressClass}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
