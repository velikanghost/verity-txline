"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/components/providers/AuthModals";
import { useWalletProfile } from "@/hooks/useWalletProfile";
import {
  useActivePvpEventsQuery,
  useMyActivePvpTicketsQuery,
  usePvpStatusQuery,
  useReferralsQuery,
} from "@/store/verity/verityQueries";
import DuelStationStage from "@/components/pvp/DuelStationStage";
import LineupBuilder from "@/components/pvp/LineupBuilder";
import DuelPanel from "@/components/pvp/DuelPanel";
import PvpSidebarStats from "@/components/markets/PvpSidebarStats";
import PvpClaimAllBanner from "@/components/pvp/PvpClaimAllBanner";
import DuelHistory from "@/components/markets/DuelHistory";
import { usePreviewMode } from "@/hooks/usePreviewMode";
import {
  getPreviewPvpSlates,
  PREVIEW_DUEL_MATCHED,
  PREVIEW_DUEL_MATCHING,
  PREVIEW_DUEL_RESOLVED,
} from "@/lib/previewData";

type MobileTab = "arena" | "stats" | "history";

export default function PvpArenaPage() {
  return (
    <Suspense fallback={null}>
      <PvpArenaContent />
    </Suspense>
  );
}

function PvpArenaContent() {
  const { profile } = useWalletProfile();
  const { authenticated, login } = useAuth();
  const previewMode = usePreviewMode();
  const searchParams = useSearchParams();
  const slateParam = searchParams.get("slate");
  const duelPreview = searchParams.get("duel");
  const previewDuelStatus = previewMode
    ? duelPreview === "matching"
      ? PREVIEW_DUEL_MATCHING
      : duelPreview === "matched"
        ? PREVIEW_DUEL_MATCHED
        : duelPreview === "resolved"
          ? PREVIEW_DUEL_RESOLVED
          : null
    : null;

  const {
    data: activeSlates = [],
    isLoading: slatesLoading,
    isError: slatesFailed,
    error: slatesError,
    refetch: refetchSlates,
  } = useActivePvpEventsQuery({ enabled: !previewMode });
  const { data: myTicketSlates = [] } = useMyActivePvpTicketsQuery({
    enabled: authenticated && !previewMode,
  });
  const { data: referralsData } = useReferralsQuery({
    enabled: authenticated && !previewMode,
  });

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
    if (previewMode) return getPreviewPvpSlates();
    const merged = new Map<string, (typeof activeSlates)[number]>();
    for (const s of [...activeSlates, ...myTicketSlates]) {
      if (!merged.has(s.id)) merged.set(s.id, s);
    }
    return Array.from(merged.values()).sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return db - da;
    });
  }, [activeSlates, myTicketSlates, previewMode]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>("arena");

  // Preselect the slate from ?slate= (e.g. arriving from a home market).
  const previewDuelSlateId = previewDuelStatus?.event?.id ?? null;
  const effectiveSelectedId =
    (previewDuelSlateId && slates.some((s) => s.id === previewDuelSlateId)
      ? previewDuelSlateId
      : selectedId ||
        (slateParam && slates.some((s) => s.id === slateParam)
          ? slateParam
          : slates[0]?.id)) || null;
  const selectedSlate =
    slates.find((s) => s.id === effectiveSelectedId) || null;
  const stationSlates = previewDuelSlateId
    ? slates.filter((slate) => slate.id === previewDuelSlateId)
    : slates;
  const shouldFetchStatus =
    authenticated && !previewMode && Boolean(effectiveSelectedId);
  const {
    data: pvpStatus,
    refetch: refetchStatus,
    isLoading: pvpStatusLoading,
    isError: pvpStatusFailed,
    error: pvpStatusError,
  } = usePvpStatusQuery(shouldFetchStatus ? effectiveSelectedId : null);
  const displayedPvpStatus = previewDuelStatus || pvpStatus;
  const hasLineup = Boolean(displayedPvpStatus?.ticket);
  const duelCompleted = displayedPvpStatus?.status === "resolved";
  const statusLoading = shouldFetchStatus && pvpStatusLoading;
  const statusFailed = shouldFetchStatus && pvpStatusFailed;

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
          <DuelStationStage
            slates={stationSlates}
            loading={!previewMode && slatesLoading}
            errorMessage={
              !previewMode && slatesFailed
                ? slatesError instanceof Error
                  ? slatesError.message
                  : "The arena is temporarily unavailable."
                : null
            }
            selectedId={effectiveSelectedId}
            onSelect={setSelectedId}
            onRetry={() => void refetchSlates()}
            authenticated={authenticated || previewMode}
            hasLineup={hasLineup}
            completed={duelCompleted}
            onLogin={login}
          />
        </div>
      </section>

      {(authenticated || previewMode) && (
        <section className="zero-duel-arena" id="duel-arena">
          <PvpClaimAllBanner
            claimedMarketIds={claimedMarketIds}
            onClaimSuccess={onClaimSuccess}
            enabled={authenticated && !previewMode}
          />
          <div className="zero-duel-tabs mb-6 flex gap-2 rounded-full p-1.5 lg:hidden">
            {(["arena", "history", "stats"] as MobileTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setMobileTab(t)}
                className={`flex-1 rounded-full py-2.5 text-[11px] font-black capitalize transition-all clickable ${mobileTab === t ? "is-active" : ""}`}
              >
                {t === "arena"
                  ? "Arena"
                  : t === "history"
                    ? "History"
                    : "Stats"}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
            <div
              id="prediction-ticket"
              className={`flex flex-col gap-6 lg:col-span-2 lg:flex ${mobileTab === "arena" ? "flex" : "hidden"}`}
            >
              {selectedSlate &&
                (statusLoading ? (
                  <div
                    className="verity-card flex min-h-48 flex-col items-center justify-center gap-3 p-6 text-center"
                    aria-live="polite"
                  >
                    <Loader2
                      className="h-6 w-6 animate-spin text-ash"
                      aria-hidden="true"
                    />
                    <strong className="text-sm text-charcoal-primary">
                      Checking your duel entry…
                    </strong>
                  </div>
                ) : statusFailed ? (
                  <div
                    className="verity-card flex min-h-48 flex-col items-center justify-center gap-3 p-6 text-center"
                    role="alert"
                  >
                    <AlertCircle
                      className="h-6 w-6 text-coral-red"
                      aria-hidden="true"
                    />
                    <strong className="text-sm text-charcoal-primary">
                      We could not verify your duel entry.
                    </strong>
                    <span className="max-w-md text-xs text-ash">
                      {pvpStatusError instanceof Error
                        ? pvpStatusError.message
                        : "Try again before building another lineup."}
                    </span>
                    <button
                      type="button"
                      onClick={() => void refetchStatus()}
                      className="game-button-primary clickable min-h-11 rounded-xl px-4 text-sm font-black text-white"
                    >
                      Try again
                    </button>
                  </div>
                ) : hasLineup ? (
                  <DuelPanel status={displayedPvpStatus!} />
                ) : (
                  <LineupBuilder
                    slate={selectedSlate}
                    readOnly={previewMode}
                    onSubmitted={() => void refetchStatus()}
                  />
                ))}
            </div>

            <aside className="zero-duel-sidebar flex flex-col gap-5">
              <div
                className={`${mobileTab === "stats" ? "block" : "hidden"} lg:block`}
              >
                <PvpSidebarStats
                  profile={
                    previewMode
                      ? {
                          arenaXp: 1280,
                          pvpMatchesWonCount: 12,
                          pvpMatchesLostCount: 4,
                          pvpMatchesDrawnCount: 2,
                        }
                      : profile
                  }
                  referralsData={
                    previewMode
                      ? { referralLink: "PLAY-VERITY", activeBoosts: [] }
                      : referralsData
                  }
                />
              </div>
              <div
                className={`${mobileTab === "history" ? "block" : "hidden"} lg:block`}
              >
                <DuelHistory preview={previewMode} />
              </div>
            </aside>
          </div>
        </section>
      )}
    </div>
  );
}
