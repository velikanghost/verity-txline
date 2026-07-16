"use client";

import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Trophy } from "lucide-react";
import { toast } from "@/lib/toast";
import { useClaimableWinningsQuery } from "@/store/verity/verityQueries";
import { useClaimWinnings } from "@/hooks/useClaimWinnings";

interface PvpClaimAllBannerProps {
  /** Market ids already claimed this session (optimistic hide). */
  claimedMarketIds: Set<string>;
  onClaimSuccess: (marketIds: string[]) => void;
  enabled?: boolean;
}

/**
 * Prominent "Claim all" banner for the PvP page. Aggregates every unclaimed,
 * still-paying winning pick across the user's resolved duels (read on-chain by
 * the backend) and claims them in one action. Renders nothing when there's
 * nothing to claim.
 */
export default function PvpClaimAllBanner({
  claimedMarketIds,
  onClaimSuccess,
  enabled = true,
}: PvpClaimAllBannerProps) {
  const queryClient = useQueryClient();
  const { redeemMultipleWinnings } = useClaimWinnings();
  const { data } = useClaimableWinningsQuery({ enabled });
  const [isClaiming, setIsClaiming] = useState(false);

  const picks = useMemo(
    () =>
      data?.claimablePicks?.filter(
        (pick) => !claimedMarketIds.has(pick.marketId),
      ) ?? [],
    [data, claimedMarketIds],
  );

  const total = useMemo(
    () => picks.reduce((sum, pick) => sum + (pick.shares ?? 0), 0),
    [picks],
  );

  const marketIds = useMemo(() => picks.map((p) => p.marketId), [picks]);

  const handleClaimAll = useCallback(async () => {
    if (marketIds.length === 0) return;
    setIsClaiming(true);
    try {
      const results = await redeemMultipleWinnings(marketIds);
      const claimed = results.filter((r) => r.txSig).map((r) => r.marketId);
      const failed = results.filter((r) => r.error);

      if (claimed.length > 0) onClaimSuccess(claimed);
      if (failed.length === 0) {
        toast.success(
          `Claimed ${total.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC across ${claimed.length} market${claimed.length === 1 ? "" : "s"}.`,
        );
      } else if (claimed.length > 0) {
        toast.error(`Claimed ${claimed.length}, ${failed.length} failed.`);
      } else {
        toast.error("Failed to claim winnings.");
      }

      void queryClient.invalidateQueries({
        queryKey: ["pvp-claimable-winnings"],
      });
      void queryClient.invalidateQueries({ queryKey: ["worldcup"] });
      void queryClient.invalidateQueries({ queryKey: ["wallet-profile"] });
      void queryClient.invalidateQueries({ queryKey: ["usdcBalance"] });
    } catch {
      toast.error("Failed to claim winnings.");
    } finally {
      setIsClaiming(false);
    }
  }, [marketIds, total, redeemMultipleWinnings, onClaimSuccess, queryClient]);

  if (!enabled || picks.length === 0 || total <= 0) return null;

  return (
    <div className="mb-5 flex flex-col items-center justify-between gap-3 rounded-2xl border-2 border-meadow-green/40 bg-meadow-green/10 p-4 sm:flex-row">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-meadow-green/40 bg-white text-meadow-green">
          <Trophy className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h4 className="font-sans text-sm font-black text-meadow-green">
            You have unclaimed winnings
          </h4>
          <p className="mt-0.5 font-mono text-xs font-bold text-ash">
            {total.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC
            across {picks.length} market{picks.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>
      <button
        onClick={handleClaimAll}
        disabled={isClaiming}
        className="game-button-primary clickable flex min-h-11 w-full shrink-0 items-center justify-center gap-1.5 rounded-xl px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {isClaiming ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          "Claim all"
        )}
      </button>
    </div>
  );
}
