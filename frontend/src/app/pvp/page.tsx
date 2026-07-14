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

  const {
    data: activeSlates = [],
    isLoading: slatesLoading,
    isError: slatesFailed,
    error: slatesError,
    refetch: refetchSlates,
  } = useActivePvpEventsQuery();
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
    <div className="zero-duel-page -mx-4 overflow-hidden font-sans sm:mx-0 sm:my-6 sm:rounded-[28px]">
      <section className="zero-duel-hero relative overflow-hidden">
        <div
          className="zero-duel-spark zero-duel-spark-one"
          aria-hidden="true"
        />
        <div
          className="zero-duel-spark zero-duel-spark-two"
          aria-hidden="true"
        />

        <div className="zero-duel-topbar relative z-10 flex items-center justify-between gap-3">
          <span className="zero-duel-brand">
            <span aria-hidden="true">◀</span> World Cup PvP
          </span>
          <span className="zero-duel-live">
            <i aria-hidden="true" /> Season live
          </span>
        </div>

        <div className="zero-duel-hero-grid relative z-10">
          <div
            className="zero-duel-poster"
            role="img"
            aria-label="Duel Station: you versus rival"
          >
            <span className="zero-duel-poster-ribbon">Duel station</span>
            <div className="zero-duel-poster-icon">
              <DuelNavIcon active className="h-24 w-28" />
            </div>
            <div className="zero-duel-versus">
              <span>YOU</span>
              <strong>VS</strong>
              <span>RIVAL</span>
            </div>
            <span className="zero-duel-ball" />
          </div>
        </div>
      </section>

      <section className="zero-duel-arena" id="duel-arena">
        <div className="zero-duel-arena-head">
          <div>
            <span className="zero-duel-section-label">
              One round live · play now
            </span>
            <h2>Enter the arena</h2>
            <p>
              Choose a contest, build your card, and back your football read.
            </p>
          </div>
          <span className="zero-duel-round">
            <i aria-hidden="true" /> Knockout mode
          </span>
        </div>

        <div className="zero-duel-tabs mb-6 flex gap-2 rounded-full p-1.5 lg:hidden">
          {(["arena", "history", "stats"] as MobileTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setMobileTab(t)}
              className={`flex-1 rounded-full py-2.5 text-[11px] font-black capitalize transition-all clickable ${mobileTab === t ? "is-active" : ""}`}
            >
              {t === "arena" ? "Arena" : t === "history" ? "History" : "Stats"}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
          <div
            className={`flex flex-col gap-6 lg:col-span-2 lg:flex ${mobileTab === "arena" ? "flex" : "hidden"}`}
          >
            <SlateCarousel
              slates={slates}
              loading={slatesLoading}
              errorMessage={
                slatesFailed
                  ? slatesError instanceof Error
                    ? slatesError.message
                    : "The arena is temporarily unavailable."
                  : null
              }
              selectedId={effectiveSelectedId}
              onSelect={setSelectedId}
              onRetry={() => void refetchSlates()}
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

          <aside className="zero-duel-sidebar flex flex-col gap-5">
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
          </aside>
        </div>
      </section>
    </div>
  );
}
