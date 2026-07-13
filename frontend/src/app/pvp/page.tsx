"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Swords } from "lucide-react";
import { useAuth } from "@/components/providers/AuthModals";
import { useWalletProfile } from "@/hooks/useWalletProfile";
import { useUsdcBalance } from "@/hooks/useUsdcBalance";
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
  const { authenticated } = useAuth();
  const { profile } = useWalletProfile();
  const { formattedBalance } = useUsdcBalance();

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
    const seen = new Set<string>();
    const merged: any[] = [];
    for (const s of [...activeSlates, ...myTicketSlates]) {
      if (!seen.has(s.id)) {
        seen.add(s.id);
        merged.push(s);
      }
    }
    return merged.sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return db - da;
    });
  }, [activeSlates, myTicketSlates]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>("arena");

  // Default to the first slate once loaded.
  useEffect(() => {
    if (!selectedId && slates.length > 0) setSelectedId(slates[0].id);
  }, [slates, selectedId]);

  const selectedSlate = slates.find((s) => s.id === selectedId) || null;
  const { data: pvpStatus, refetch: refetchStatus } =
    usePvpStatusQuery(selectedId);
  const hasLineup = Boolean(pvpStatus && pvpStatus.ticket);

  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 py-6 font-sans">
      {/* Header */}
      <div className="verity-card game-grid relative mb-5 flex flex-wrap items-center justify-between gap-3 overflow-hidden p-5 sm:p-6">
        <div
          className="absolute -right-8 -top-12 h-32 w-32 rounded-full bg-[#ff6b4a]/22 blur-3xl"
          aria-hidden="true"
        />
        <div className="flex items-center gap-2.5">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff6b4a] to-[#d94a32] text-white shadow-[0_8px_24px_rgba(255,107,74,.26)]">
            <Swords className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-mono text-[8px] font-black uppercase tracking-[0.18em] text-[#ff927b]">
              Head-to-head mode
            </p>
            <h1 className="mt-1 text-2xl font-black leading-none text-charcoal-primary dark:text-white">
              PvP Arena
            </h1>
            <p className="mt-1 text-[11px] font-medium text-ash">
              Build a cross-game lineup. Out-predict your opponent.
            </p>
          </div>
        </div>
        {authenticated && (
          <div className="rounded-xl border border-[#35e881]/15 bg-[#35e881]/10 px-3 py-2 font-mono text-xs font-black text-[#58f09a]">
            {formattedBalance} USDC
          </div>
        )}
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
            selectedId={selectedId}
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
