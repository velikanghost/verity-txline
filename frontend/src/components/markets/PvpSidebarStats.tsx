"use client";

import { useState, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { useClaimableWinningsQuery } from "@/store/verity/verityQueries";
import { useClaimWinnings } from "@/hooks/useClaimWinnings";
import { Loader2 } from "lucide-react";

interface PvpSidebarStatsProps {
  profile: any;
  referralsData: any;
  claimedMarketIds: Set<string>;
  onClaimSuccess: (marketIds: string[]) => void;
}

export default function PvpSidebarStats({
  profile,
  referralsData,
  claimedMarketIds,
  onClaimSuccess,
}: PvpSidebarStatsProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const queryClient = useQueryClient();
  const { redeemMultipleWinnings } = useClaimWinnings();
  const { data: claimableData } = useClaimableWinningsQuery();
  const [isClaiming, setIsClaiming] = useState(false);

  const claimablePicksFiltered = useMemo(() => {
    return (
      claimableData?.claimablePicks?.filter(
        (p: any) => !claimedMarketIds.has(p.marketId),
      ) || []
    );
  }, [claimableData, claimedMarketIds]);

  const totalWinningsUsdcFiltered = useMemo(() => {
    return claimablePicksFiltered.reduce(
      (sum: number, p: any) => sum + (p.shares ?? 0),
      0,
    );
  }, [claimablePicksFiltered]);

  const claimableMarketIdsFiltered = useMemo(() => {
    return claimablePicksFiltered.map((p: any) => p.marketId);
  }, [claimablePicksFiltered]);

  const handleClaimAll = useCallback(async () => {
    if (claimableMarketIdsFiltered.length === 0) return;

    setIsClaiming(true);
    try {
      await redeemMultipleWinnings(
        claimableMarketIdsFiltered,
        totalWinningsUsdcFiltered,
      );

      onClaimSuccess(claimableMarketIdsFiltered);

      // Invalidate relevant queries after successful claim
      void queryClient.invalidateQueries({
        queryKey: ["pvp-claimable-winnings"],
      });
      void queryClient.invalidateQueries({ queryKey: ["pvp-status"] });
      void queryClient.invalidateQueries({
        queryKey: ["pvp-my-active-tickets"],
      });
      void queryClient.invalidateQueries({ queryKey: ["positions"] });
      void queryClient.invalidateQueries({ queryKey: ["usdcBalance"] });
      void queryClient.invalidateQueries({ queryKey: ["wallet-profile"] });
    } catch (err) {
      console.error("Failed to claim all winnings:", err);
      toast.error("Failed to claim winnings.");
    } finally {
      setIsClaiming(false);
    }
  }, [
    claimableMarketIdsFiltered,
    totalWinningsUsdcFiltered,
    redeemMultipleWinnings,
    queryClient,
    onClaimSuccess,
  ]);

  function handleCopyReferral() {
    if (!referralsData?.referralLink) return;
    const link = `${window.location.origin}/?ref=${referralsData.referralLink}`;
    navigator.clipboard.writeText(link);
    setCopiedCode(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopiedCode(false), 2000);
  }

  const hasClaimable = useMemo(() => {
    if (!claimableData || totalWinningsUsdcFiltered <= 0) return false;

    return claimablePicksFiltered.length > 1;
  }, [claimablePicksFiltered, totalWinningsUsdcFiltered, claimableData]);

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

      {/* Unclaimed Winnings Box */}
      {hasClaimable && (
        <div className="rounded-2xl bg-[#FAF9F6] p-4 shadow-inner text-center border border-stone-200/20 flex flex-col items-center gap-2">
          <span className="text-[10px] font-mono text-ash uppercase font-bold tracking-wider block">
            Unclaimed Winnings
          </span>
          <strong className="text-3xl font-bold font-mono text-charcoal-primary block mt-1">
            {totalWinningsUsdcFiltered.toFixed(2)}
            <span className="text-sm font-sans text-ash font-medium">
              {" "}
              USDC
            </span>
          </strong>
          <button
            onClick={handleClaimAll}
            disabled={isClaiming}
            className="game-button-primary mt-2 flex min-h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-bold text-white transition-all hover:opacity-90 active:opacity-100 disabled:cursor-not-allowed disabled:opacity-60 font-sans"
          >
            {isClaiming ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
              </>
            ) : (
              <>Claim All</>
            )}
          </button>
        </div>
      )}

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
