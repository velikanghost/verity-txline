"use client";

import { useCallback, useMemo, useState } from "react";
import { useWalletProfile } from "@/hooks/useWalletProfile";
import { DuelNavIcon } from "@/components/icons/ArcadeNavIcons";
import {
  useActivePvpEventsQuery,
  useMyActivePvpTicketsQuery,
  usePvpStatusQuery,
  useReferralsQuery,
} from "@/store/verity/verityQueries";
import SlateCarousel from "@/components/pvp/SlateCarousel";
import LineupBuilder from "@/components/pvp/LineupBuilder";
import DuelPanel from "@/components/pvp/DuelPanel";
import PvpSidebarStats from "@/components/markets/PvpSidebarStats";
import DuelHistory from "@/components/markets/DuelHistory";

type MobileTab = "arena" | "stats" | "history";

export default function PvpArenaPage() {
  const { profile } = useWalletProfile();

  const { data: activeSlates = [], isLoading: slatesLoading } =
    useActivePvpEventsQuery();
  const { data: myTicketSlates = [] } = useMyActivePvpTicketsQuery();
  const { data: referralsData } = useReferralsQuery();

  const [claimedMarketIds, setClaimedMarketIds] = useState<Set<string>>(
    new Set(),
  );
  const onClaimSuccess = useCallback((ids: string[]) => {
    setClaimedMarketIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
  }, []);

  // Merge open slates with any where the user still has an active lineup.
  const slates = useMemo(() => {
    const merged = new Map<string, (typeof activeSlates)[number]>();
    for (const s of [...activeSlates, ...myTicketSlates]) {
      if (!merged.has(s.id)) merged.set(s.id, s);
    }
    return Array.from(merged.values()).sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return db - da;
    });
  }, [activeSlates, myTicketSlates]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>("arena");

  const effectiveSelectedId = selectedId || slates[0]?.id || null;
  const selectedSlate =
    slates.find((s) => s.id === effectiveSelectedId) || null;
  const { data: pvpStatus, refetch: refetchStatus } =
    usePvpStatusQuery(effectiveSelectedId);
  const hasLineup = Boolean(pvpStatus && pvpStatus.ticket);

  return (
    <div className="mx-auto w-full max-w-[1240px] py-4 font-sans sm:px-4 sm:py-6">
      {/* Header */}
      <div className="duel-hero game-grid relative mb-5 flex items-center gap-3 overflow-hidden rounded-[26px] border border-white/[0.09] p-5 sm:p-6">
        <div
          className="absolute -right-8 -top-12 h-32 w-32 rounded-full bg-[#ff6b4a]/22 blur-3xl"
          aria-hidden="true"
        />
        <div className="flex items-center gap-2.5">
          <span
            className="-ml-2 flex h-14 w-[70px] shrink-0 items-center justify-center"
            aria-hidden="true"
          >
            <DuelNavIcon active className="h-14 w-[70px]" />
          </span>
          <div>
            <p className="font-mono text-[8px] font-black uppercase tracking-[0.18em] text-[#ff927b]">
              Head-to-head mode
            </p>
            <h1 className="mt-1 text-2xl font-black leading-none text-charcoal-primary dark:text-white">
              Duel Station
            </h1>
            <p className="mt-1 text-[11px] font-medium text-ash">
              Build your lineup. Read the field. Beat the other player.
            </p>
          </div>
        </div>
      </div>

      {/* Mobile sub-tabs */}
      <div className="mb-4 flex gap-1 rounded-2xl border border-white/10 bg-[#0b0f20] p-1.5 lg:hidden">
        {(["arena", "history", "stats"] as MobileTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setMobileTab(t)}
            className={`flex-1 rounded-lg py-2 text-xs font-bold capitalize transition-all clickable ${
              mobileTab === t
                ? "bg-[#1479ff] text-white shadow-sm"
                : "text-ash hover:bg-white/[0.05] hover:text-white"
            }`}
          >
            {t === "arena"
              ? "Arena"
              : t === "history"
                ? "Duel History"
                : "PvP Stats"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        {/* Main */}
        <div
          className={`flex flex-col gap-5 lg:col-span-2 lg:block ${mobileTab === "arena" ? "block" : "hidden"}`}
        >
          <SlateCarousel
            slates={slates}
            loading={slatesLoading}
            selectedId={effectiveSelectedId}
            onSelect={setSelectedId}
          />

          {selectedSlate &&
            (hasLineup ? (
              <DuelPanel status={pvpStatus} />
            ) : (
              <LineupBuilder
                slate={selectedSlate}
                onSubmitted={() => void refetchStatus()}
              />
            ))}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          <div
            className={`${mobileTab === "stats" ? "block" : "hidden"} lg:block`}
          >
            <PvpSidebarStats
              profile={profile}
              referralsData={referralsData}
              claimedMarketIds={claimedMarketIds}
              onClaimSuccess={onClaimSuccess}
            />
          </div>
          <div
            className={`${mobileTab === "history" ? "block" : "hidden"} lg:block`}
          >
            <DuelHistory />
          </div>
        </div>
      </div>
    </div>
  );
}
