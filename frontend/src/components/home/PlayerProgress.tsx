"use client";

import { Flame, Shield, Star, Trophy } from "lucide-react";
import { useWalletProfile } from "@/hooks/useWalletProfile";
import { useMissionsQuery } from "@/store/verity/verityQueries";

const XP_PER_LEVEL = 500;

export function PlayerProgress() {
  const { profile } = useWalletProfile();
  const { data: missions = [] } = useMissionsQuery(profile?.id);
  const xp = profile?.arenaXp ?? 0;
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const levelProgress = xp % XP_PER_LEVEL;
  const progressPercent = Math.round((levelProgress / XP_PER_LEVEL) * 100);
  const openQuests = missions.filter((mission) => !mission.completed).length;

  return (
    <section
      aria-label="Player progress"
      className="grid gap-3 sm:grid-cols-[minmax(0,1.6fr)_repeat(2,minmax(0,.7fr))]"
    >
      <div className="game-status-card flex items-center gap-4 rounded-[20px] border border-border bg-surface-solid p-4">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1479ff] to-[#0862d3] text-white shadow-[0_9px_24px_rgba(20,121,255,.25)]">
          <Shield className="h-6 w-6" aria-hidden="true" />
          <span className="absolute -bottom-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-surface-solid bg-[#ffc844] px-1 font-mono text-[8px] font-black text-[#1a1730]">
            {level}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[8px] font-black uppercase tracking-[0.18em] text-ash">
                Player level
              </p>
              <p className="font-game mt-0.5 text-lg font-black text-charcoal-primary dark:text-white">
                {profile ? `Level ${level} Predictor` : "Rookie Predictor"}
              </p>
            </div>
            <span className="font-mono text-[9px] font-black text-[#59a2ff]">
              {levelProgress} / {XP_PER_LEVEL} XP
            </span>
          </div>
          <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-stone-surface">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#1479ff] to-[#35a5ff] shadow-[0_0_10px_rgba(20,121,255,.4)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="game-status-card flex items-center gap-3 rounded-[20px] border border-border bg-surface-solid p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#35e881]/10 text-[#27bd69]">
          <Star className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="font-mono text-[8px] font-black uppercase tracking-[0.16em] text-ash">
            Open quests
          </p>
          <p className="font-game mt-0.5 text-xl font-black text-charcoal-primary dark:text-white">
            {openQuests}
          </p>
        </div>
      </div>

      <div className="game-status-card flex items-center gap-3 rounded-[20px] border border-border bg-surface-solid p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#ff6b4a]/10 text-[#ff8064]">
          {profile?.pvpMatchesWonCount ? (
            <Flame className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Trophy className="h-5 w-5" aria-hidden="true" />
          )}
        </span>
        <div>
          <p className="font-mono text-[8px] font-black uppercase tracking-[0.16em] text-ash">
            Arena wins
          </p>
          <p className="font-game mt-0.5 text-xl font-black text-charcoal-primary dark:text-white">
            {profile?.pvpMatchesWonCount ?? 0}
          </p>
        </div>
      </div>
    </section>
  );
}
