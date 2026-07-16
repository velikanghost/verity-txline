"use client";

import { useState } from "react";
import { toast } from "@/lib/toast";

interface PvpSidebarStatsProps {
  profile?: {
    arenaXp?: number | null;
    pvpMatchesWonCount?: number | null;
    pvpMatchesLostCount?: number | null;
    pvpMatchesDrawnCount?: number | null;
  } | null;
  referralsData?: {
    referralLink?: string | null;
    activeBoosts?: unknown[];
    hasWonFirstPvpDuel?: boolean;
    welcomeBoosts?: unknown;
    referees?: unknown[];
  } | null;
}

export default function PvpSidebarStats({
  profile,
  referralsData,
}: PvpSidebarStatsProps) {
  const [copiedCode, setCopiedCode] = useState(false);

  function handleCopyReferral() {
    if (!referralsData?.referralLink) return;
    const link = `${window.location.origin}/?ref=${referralsData.referralLink}`;
    navigator.clipboard.writeText(link);
    setCopiedCode(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopiedCode(false), 2000);
  }

  return (
    <div className="pvp-stats-card verity-card flex flex-col gap-5 bg-white p-5 ">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <h3 className="font-sans text-xs font-black uppercase tracking-wider text-charcoal-primary ">
          PVP STATS
        </h3>
      </div>

      {/* Arena XP Box */}
      <div className="rounded-2xl bg-[#FAF9F6] p-4 shadow-inner text-center border border-stone-200/20 ">
        <span className="text-[10px] font-mono text-ash uppercase font-bold tracking-wider block">
          Arena XP
        </span>
        <strong className="text-5xl font-family text-[#FF4D00] block mt-1.5">
          {profile?.arenaXp ?? 0}
        </strong>
      </div>

      {/* Record Details Row */}
      <div className="flex items-center justify-between text-xs font-sans border-b border-dashed border-border pb-3 mt-1">
        <span className="text-ash font-medium">Record</span>
        <span className="font-bold text-charcoal-primary font-mono">
          {profile?.pvpMatchesWonCount ?? 0}W ·{" "}
          {profile?.pvpMatchesLostCount ?? 0}L ·{" "}
          {profile?.pvpMatchesDrawnCount ?? 0}D
        </span>
      </div>

      {/* Referral Link Row */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-ash font-semibold">Referral link</span>
          <span className="text-[10px] font-mono text-ash/80">
            Earn XP boosts
          </span>
        </div>
        <div className="flex h-11 items-center rounded-xl bg-[#FAF9F6] px-3.5 border border-stone-200/10 transition-colors">
          <span className="pvp-referral-code w-full truncate font-mono text-xs font-bold select-all">
            {referralsData?.referralLink
              ? `${window.location.origin.replace(/^https?:\/\//, "")}/?ref=${referralsData.referralLink}`
              : "Loading link..."}
          </span>
          <button
            onClick={handleCopyReferral}
            disabled={!referralsData?.referralLink}
            className="ml-2 inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border bg-white px-3 text-[10px] font-bold uppercase tracking-wider text-charcoal-primary shadow-xs transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50 "
          >
            {copiedCode ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}
