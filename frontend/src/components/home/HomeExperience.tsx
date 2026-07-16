"use client";

import { useAuth } from "@/components/providers/AuthModals";
import { WorldCupHero } from "./WorldCupHero";
import { PlayerProgress } from "./PlayerProgress";
import { WorldCupMarketsList } from "@/components/worldcup/WorldCupMarketsList";
import { usePreviewMode } from "@/hooks/usePreviewMode";

export default function HomeExperience() {
  const { authenticated, loading } = useAuth();
  const previewMode = usePreviewMode();

  // Avoid a flash of the wrong view while the session resolves.
  if (loading && !previewMode) {
    return <div className="py-16 text-center text-sm text-ash">Loading…</div>;
  }

  // Signed out → the arcade landing hero (intro + how it works).
  if (!authenticated && !previewMode) {
    return (
      <div className="tournament-home flex min-h-[calc(100vh-150px)] flex-col justify-center pb-10 pt-2">
        <WorldCupHero />
      </div>
    );
  }

  // Signed in → player dashboard + markets, no intro/ad copy.
  return (
    <div className="tournament-home flex flex-col gap-5 pb-8 pt-2">
      <WorldCupHero compact />
      <PlayerProgress preview={previewMode} />
      <div className="home-contest-heading flex flex-wrap items-end justify-between gap-3 px-1 pt-1">
        <div>
          <p className="font-mono text-[9px] font-black uppercase tracking-[0.18em] text-[#806acb]">
            Live contest board
          </p>
          <h2 className="font-game mt-1 text-3xl font-black tracking-tight text-[#241b4a]">
            Choose your matchup
          </h2>
        </div>
        <p className="font-mono text-[8px] font-black uppercase tracking-wider text-[#756e89]">
          Tap a card · enter PvP
        </p>
      </div>
      <WorldCupMarketsList />
    </div>
  );
}
