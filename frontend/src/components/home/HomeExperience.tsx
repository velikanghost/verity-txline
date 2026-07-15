"use client";

import { useAuth } from "@/components/providers/AuthModals";
import { WorldCupHero } from "./WorldCupHero";
import { ExperienceHighlights } from "./ExperienceHighlights";
import { PlayerProgress } from "./PlayerProgress";
import { WorldCupMarketsList } from "@/components/worldcup/WorldCupMarketsList";

export default function HomeExperience() {
  const { authenticated, loading } = useAuth();

  // Avoid a flash of the wrong view while the session resolves.
  if (loading) {
    return <div className="py-16 text-center text-sm text-ash">Loading…</div>;
  }

  // Signed out → the arcade landing hero (intro + how it works).
  if (!authenticated) {
    return (
      <div className="tournament-home flex min-h-[calc(100vh-150px)] flex-col justify-center pb-10 pt-2">
        <WorldCupHero />
        <ExperienceHighlights />
      </div>
    );
  }

  // Signed in → player dashboard + markets, no intro/ad copy.
  return (
    <div className="flex flex-col gap-5 py-2">
      <PlayerProgress />
      <WorldCupMarketsList />
    </div>
  );
}
