"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/providers/AuthModals";
import { useClaimWinnings } from "@/hooks/useClaimWinnings";
import { useUsdcBalance } from "@/hooks/useUsdcBalance";
import { apiRequest } from "@/store/apiClient";
import { useSubmitPvpTicketMutation } from "@/store/verity/verityQueries";
import { toast } from "@/lib/toast";
import PvpMatchupCarousel, {
  getCountryFlag,
  parseEventTeams,
} from "./PvpMatchupCarousel";
import PvpClaimBanner from "./PvpClaimBanner";
import { useDrawerStore } from "@/store/drawerStore";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import { X, Lock, ArrowRight, Loader2, Swords } from "lucide-react";

// Sub-components
import PvpArenaSkeleton from "./PvpArenaSkeleton";
import PvpDuelStatus from "./PvpDuelStatus";
import PvpDuelPicks from "./PvpDuelPicks";
import PvpTicketBuilder from "./PvpTicketBuilder";

function formatMarketId(marketId: string): `0x${string}` {
  const clean = marketId.replace(/^0x/, "");
  return `0x${clean.padEnd(64, "0")}` as `0x${string}`;
}

interface PvpArenaTabProps {
  pvpEvents: any[];
  pvpEventsLoading: boolean;
  pvpStatus: any;
  pvpStatusLoading: boolean;
  refetchPvpStatus: () => void;
  profile: any;
  referralsData: any;
  selectedPvpEventId: string | null;
  setSelectedPvpEventId: (id: string | null) => void;
  claimedMarketIds: Set<string>;
  setClaimedMarketIds: React.Dispatch<React.SetStateAction<Set<string>>>;
}

export default function PvpArenaTab({
  pvpEvents,
  pvpEventsLoading,
  pvpStatus,
  pvpStatusLoading,
  refetchPvpStatus,
  profile,
  referralsData,
  selectedPvpEventId,
  setSelectedPvpEventId,
  claimedMarketIds,
  setClaimedMarketIds,
}: PvpArenaTabProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { redeemMultipleWinnings } = useClaimWinnings();
  const { rawBalance } = useUsdcBalance();
  const {
    tradeMarketId,
    isTradeDrawerOpen,
    openTradeDrawer,
    closeTradeDrawer,
  } = useDrawerStore();
  const submitTicketMutation = useSubmitPvpTicketMutation();

  // ─── Local state ────────────────────────────────────────────
  const [mounted, setMounted] = useState<boolean>(false);
  const [showBuilderOverride, setShowBuilderOverride] =
    useState<boolean>(false);
  const [betAmountPerSelection, setBetAmountPerSelection] = useState<number>(5);
  const [allPvpSelections, setAllPvpSelections] = useState<
    Record<string, Record<string, string>>
  >({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isRegisteringQueue, setIsRegisteringQueue] = useState<boolean>(false);
  const [showTooltip, setShowTooltip] = useState<boolean>(false);
  const [liquidityMarketId, setLiquidityMarketId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // ─── Derived data ───────────────────────────────────────────
  const sortedPvpEvents = useMemo(() => {
    if (!pvpEvents) return [];
    return [...pvpEvents].sort((a, b) => {
      const timeA = new Date(a.lockTime || a.deadline || 0).getTime();
      const timeB = new Date(b.lockTime || b.deadline || 0).getTime();
      return timeA - timeB;
    });
  }, [pvpEvents]);

  const selectedPvpEvent = useMemo(() => {
    if (!sortedPvpEvents || sortedPvpEvents.length === 0) return null;
    if (selectedPvpEventId) {
      return (
        sortedPvpEvents.find((e: any) => e.id === selectedPvpEventId) ||
        sortedPvpEvents[0]
      );
    }
    // Find the first open event, or default to the last closed one
    const firstOpen = sortedPvpEvents.find((e) => {
      const timeStr = e.lockTime || e.deadline;
      if (!timeStr) return false;
      const isClosed =
        new Date(timeStr).getTime() <= Date.now() ||
        e.status === "resolved" ||
        e.status === "closed";
      return !isClosed;
    });
    return (
      firstOpen ||
      sortedPvpEvents[sortedPvpEvents.length - 1] ||
      sortedPvpEvents[0]
    );
  }, [sortedPvpEvents, selectedPvpEventId]);

  useEffect(() => {
    if (selectedPvpEvent && selectedPvpEvent.id !== selectedPvpEventId) {
      setSelectedPvpEventId(selectedPvpEvent.id);
    }
  }, [selectedPvpEvent, selectedPvpEventId, setSelectedPvpEventId]);

  const runningScoreUser = useMemo(() => {
    if (!pvpStatus?.ticket?.picks) return 0;
    return pvpStatus.ticket.picks.filter((p: any) => p.isCorrect === true)
      .length;
  }, [pvpStatus]);

  const runningScoreOpponent = useMemo(() => {
    if (!pvpStatus?.opponent?.picks) return 0;
    return pvpStatus.opponent.picks.filter((p: any) => p.isCorrect === true)
      .length;
  }, [pvpStatus]);

  const optionForLP = useMemo(() => {
    if (!liquidityMarketId || !selectedPvpEvent) return null;
    return selectedPvpEvent.options.find(
      (o: any) => o.id === liquidityMarketId,
    );
  }, [liquidityMarketId, selectedPvpEvent]);

  const totalVolume = useMemo(() => {
    if (!selectedPvpEvent?.options) return 0;
    return selectedPvpEvent.options.reduce(
      (sum: number, opt: any) => sum + Number(opt.liquidity ?? 0),
      0,
    );
  }, [selectedPvpEvent]);

  const formattedDeadline = useMemo(() => {
    if (!selectedPvpEvent?.deadline) return "";
    const date = new Date(selectedPvpEvent.deadline);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [selectedPvpEvent]);

  const parsedTeams = useMemo(() => {
    if (!selectedPvpEvent?.question)
      return { teamA: "Team A", teamB: "Team B" };
    const vsMatch = selectedPvpEvent.question.match(/(.+?)\s+vs\.?\s+(.+)/i);
    if (vsMatch) return { teamA: vsMatch[1].trim(), teamB: vsMatch[2].trim() };
    const dashMatch = selectedPvpEvent.question.match(/(.+?)\s+-\s+(.+)/);
    if (dashMatch)
      return { teamA: dashMatch[1].trim(), teamB: dashMatch[2].trim() };
    return { teamA: "Team A", teamB: "Team B" };
  }, [selectedPvpEvent]);

  const groupedOptions = useMemo(() => {
    if (!selectedPvpEvent?.options) return {};
    const groups: Record<string, any[]> = {};
    for (const opt of selectedPvpEvent.options) {
      const group = opt.optionGroup || "other";
      if (!groups[group]) groups[group] = [];
      groups[group].push(opt);
    }
    return groups;
  }, [selectedPvpEvent]);

  const hasActiveDuel =
    pvpStatus?.status === "queued" ||
    pvpStatus?.status === "matched" ||
    pvpStatus?.status === "resolved";

  const isEventEnded =
    selectedPvpEvent &&
    (new Date() >=
      new Date(selectedPvpEvent.lockTime || selectedPvpEvent.deadline) ||
      selectedPvpEvent.status === "resolved" ||
      selectedPvpEvent.status === "closed");

  const pvpSelections = selectedPvpEvent
    ? allPvpSelections[selectedPvpEvent.id] || {}
    : {};

  // ─── Effects ────────────────────────────────────────────────

  // Reset override when event changes
  useEffect(() => {
    if (selectedPvpEvent) {
      setShowBuilderOverride(false);
    }
  }, [selectedPvpEvent]);

  // ─── Handlers ───────────────────────────────────────────────

  const handleToggleSelection = useCallback(
    (optId: string, selection: string) => {
      if (!selectedPvpEvent) return;

      setAllPvpSelections((prevAll) => {
        const eventId = selectedPvpEvent.id;
        const prevEventSelections = prevAll[eventId] || {};
        const nextEventSelections = { ...prevEventSelections };

        if (nextEventSelections[optId] === selection) {
          delete nextEventSelections[optId];
          return { ...prevAll, [eventId]: nextEventSelections };
        }

        const currentOpt = selectedPvpEvent?.options?.find(
          (o: any) => o.id === optId,
        );
        const group = currentOpt?.optionGroup;

        if (group) {
          selectedPvpEvent.options.forEach((otherOpt: any) => {
            if (otherOpt.id !== optId && otherOpt.optionGroup === group) {
              delete nextEventSelections[otherOpt.id];
            }
          });
        }

        nextEventSelections[optId] = selection;
        return { ...prevAll, [eventId]: nextEventSelections };
      });
    },
    [selectedPvpEvent],
  );

  const handleClaim = useCallback(
    async (marketIds: string[], totalWinnings: number) => {
      try {
        await redeemMultipleWinnings(marketIds, totalWinnings);
        setClaimedMarketIds((prev) => {
          const next = new Set(prev);
          marketIds.forEach((id) => next.add(id));
          return next;
        });

        // Invalidate all relevant queries to keep UI in sync
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
        console.error("Failed to claim all winnings", err);
      }
    },
    [redeemMultipleWinnings, queryClient, setClaimedMarketIds],
  );

  async function handleSubmitPvpTicket(couponCode?: string) {
    if (!profile || !user?.walletAddress) {
      toast.error("Connect your wallet to queue for the Arena.");
      return;
    }
    if (!selectedPvpEvent) return;

    const lockTimeLimit = new Date(
      selectedPvpEvent.lockTime || selectedPvpEvent.deadline,
    );
    const txBufferMs = 30000; // 30 seconds buffer for transaction processing
    if (new Date().getTime() + txBufferMs >= lockTimeLimit.getTime()) {
      toast.error(
        "This matchup is too close to kickoff or has already started",
      );
      return;
    }

    const picks = Object.keys(pvpSelections).map((marketId) => {
      const selection = pvpSelections[marketId];
      const opt = selectedPvpEvent.options.find((o: any) => o.id === marketId);

      let price = 0.5;
      const isMulti = opt && opt.outcomeCount && opt.outcomeCount > 2;
      if (isMulti) {
        const outcomeIndex = opt.outcomes.findIndex(
          (o: any) => o.toLowerCase().trim() === selection.toLowerCase().trim(),
        );
        const validIndex = outcomeIndex >= 0 ? outcomeIndex : 0;
        price = opt.outcomePrices?.[validIndex] ?? 1 / opt.outcomeCount;
      } else {
        const yesPool = Number(opt?.usdcYesAmount ?? 0);
        const noPool = Number(opt?.usdcNoAmount ?? 0);
        const totalPool = yesPool + noPool;
        let yesProb = 50;
        if (totalPool > 0) {
          yesProb = (yesPool / totalPool) * 100;
        }
        const noProb = 100 - yesProb;
        price = selection === "YES" ? yesProb / 100 : noProb / 100;
      }
      const shares = betAmountPerSelection / (price || 0.5);

      return {
        marketId,
        selection,
        shares,
        amountUsdc: betAmountPerSelection,
      };
    });

    if (betAmountPerSelection < 1) {
      toast.error(
        "Please enter a bet amount of at least 1 USDC per selection.",
      );
      return;
    }

    if (picks.length < 3) {
      toast.error(
        "Please make a selection for at least 3 options from different categories.",
      );
      return;
    }

    const totalAmount = betAmountPerSelection * picks.length;
    const rawTotalAmount = BigInt(Math.round(totalAmount * 1e6));

    if (rawBalance < rawTotalAmount) {
      toast.error(
        `Insufficient USDC balance. You need at least ${totalAmount} USDC to submit this ticket, but your balance is ${(Number(rawBalance) / 1e6).toFixed(2)} USDC.`,
      );
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Staking picks on-chain…");
    try {
      // Stake each pick on its child market's Solana pool (backend-signed).
      for (const pick of picks) {
        await apiRequest("/solana/stake", {
          method: "POST",
          body: JSON.stringify({
            marketId: pick.marketId,
            side: pick.selection === "YES" ? 1 : 0,
            amountUsdc: betAmountPerSelection,
          }),
        });
      }
      toast.dismiss(toastId);

      setIsRegisteringQueue(true);
      setIsSubmitting(false);
      setShowBuilderOverride(false);
      setAllPvpSelections((prev) => {
        const next = { ...prev };
        delete next[selectedPvpEvent.id];
        return next;
      });

      await submitTicketMutation.mutateAsync({
        parentMarketId: selectedPvpEvent.id,
        picks,
        couponCode,
      });
      await refetchPvpStatus();
      toast.success("Picks staked & ticket submitted! Queued for opponent…");
      setIsRegisteringQueue(false);
    } catch (err: any) {
      toast.dismiss(toastId);
      if (!err.message?.includes("rejected")) {
        toast.error(err?.message || "Failed to submit ticket.");
      }
      setIsSubmitting(false);
      setIsRegisteringQueue(false);
    }
  }

  // Liquidity provisioning was removed with the move to a pure parimutuel
  // (markets are admin-created; there are no LPs). Kept as a no-op so any
  // leftover builder control can't hit the removed endpoint.
  const handleProvideLiquidity = async (_amounts: Record<string, number>) => {
    toast.error("Liquidity provisioning is no longer available.");
  };

  // ─── Loading state ──────────────────────────────────────────
  const isPvpStatusPending =
    !!profile &&
    !!selectedPvpEventId &&
    (!pvpStatus || pvpStatus?.event?.id !== selectedPvpEventId) &&
    pvpStatusLoading;

  if (!mounted || pvpEventsLoading) {
    return <PvpArenaSkeleton optionCount={5} />;
  }

  // ─── Render ─────────────────────────────────────────────────
  return (
    <div className="lg:col-span-2 flex flex-col gap-4">
      {/* Event Selector Header Card (Matchup Carousel) */}
      {sortedPvpEvents.length > 0 && (
        <PvpMatchupCarousel
          pvpEvents={sortedPvpEvents}
          selectedPvpEventId={selectedPvpEventId}
          setSelectedPvpEventId={setSelectedPvpEventId}
        />
      )}

      {isPvpStatusPending ? (
        <PvpArenaSkeleton
          optionCount={selectedPvpEvent?.options?.length || 5}
          hideCarouselHeader={true}
        />
      ) : isRegisteringQueue ? (
        <div className="verity-card relative flex min-h-[300px] flex-col items-center justify-center gap-6 overflow-hidden border border-sky-blue/20 bg-linear-to-b from-sky-blue/5 to-transparent p-8 text-center shadow-sm md:p-10">
          {/* Pulsing blue loading ring */}
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-sky-blue/25 bg-sky-blue/10 shadow-inner">
            <Loader2 className="absolute h-7 w-7 animate-spin text-sky-blue" />
            <Swords className="relative z-10 h-5 w-5 text-coral-red" />
          </div>

          <div className="space-y-2 max-w-sm">
            <h3 className="text-xl font-black font-sans leading-tight text-charcoal-primary ">
              Entering the Arena...
            </h3>
            <p className="text-xs text-ash leading-relaxed font-sans">
              We are finalising your ticket registration and queueing you for an
              opponent.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Active Duel View */}
          {hasActiveDuel && !showBuilderOverride && (
            <div className="flex flex-col gap-4">
              <PvpDuelStatus
                status={pvpStatus.status}
                pvpStatus={pvpStatus}
                runningScoreUser={runningScoreUser}
                runningScoreOpponent={runningScoreOpponent}
                profile={profile}
              />
              <PvpClaimBanner
                picks={pvpStatus.ticket?.picks}
                claimedMarketIds={claimedMarketIds}
                onClaim={handleClaim}
                showEmoji={true}
              />
              <PvpDuelPicks
                pvpStatus={pvpStatus}
                onSelectChildMarketForTrade={(market) =>
                  openTradeDrawer(market.id)
                }
                onAddLiquidity={(id) => setLiquidityMarketId(id)}
              />
            </div>
          )}

          {/* Ticket Builder Form */}
          {(!hasActiveDuel || showBuilderOverride) &&
            (isEventEnded ? (
              <div className="verity-card p-8 md:p-10 flex flex-col gap-6 relative overflow-hidden bg-linear-to-b from-amber-50/40 to-stone-100/30 border border-amber-200/40 shadow-sm">
                {/* Locked Content */}
                <div className="flex flex-col md:flex-row items-center md:items-start gap-5">
                  {/* Circular Gold Icon Container */}
                  <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 border border-amber-200/50 shadow-inner shrink-0">
                    <div className="relative z-10 text-amber-600 ">
                      <Lock className="h-6 w-6" strokeWidth={2.5} />
                    </div>
                  </div>

                  {/* Text Area */}
                  <div className="flex-1 text-center md:text-left space-y-2.5">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-[10px] font-bold text-amber-700 uppercase tracking-wider font-mono">
                      🔒 Predictions Closed
                    </span>
                    <h3 className="text-2xl font-black font-sans leading-tight text-charcoal-primary ">
                      Whistle's blown on {parsedTeams.teamA} vs{" "}
                      {parsedTeams.teamB}
                    </h3>
                    <p className="text-xs text-ash leading-relaxed font-sans max-w-xl">
                      Kickoff has passed — but the arena's still buzzing. Jump
                      into one of these open matches and keep your streak alive.
                    </p>
                  </div>
                </div>

                {/* Recommended Matches Area */}
                {(() => {
                  const recommended = sortedPvpEvents
                    .filter((e) => {
                      if (e.id === selectedPvpEvent.id) return false;
                      const isClosed =
                        new Date() >= new Date(e.lockTime || e.deadline) ||
                        e.status === "resolved" ||
                        e.status === "closed";
                      return !isClosed;
                    })
                    .slice(0, 3);

                  if (recommended.length === 0) return null;

                  return (
                    <div className="border-t border-amber-200/20 pt-6 mt-2">
                      <span className="block text-[10px] font-bold uppercase text-ash tracking-wider mb-4 font-mono">
                        Open now — pick one to play
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {recommended.map((evt) => {
                          const { teamA: recTeamA, teamB: recTeamB } =
                            parseEventTeams(evt.question);
                          const vol =
                            evt.options?.reduce(
                              (sum: number, opt: any) =>
                                sum + Number(opt.liquidity ?? 0),
                              0,
                            ) ?? 0;

                          // Calculate remaining time label
                          let timeLabel = "";
                          const lockTimeStr = evt.lockTime || evt.deadline;
                          if (lockTimeStr) {
                            const target = new Date(lockTimeStr);
                            const diff = target.getTime() - Date.now();
                            if (diff > 0) {
                              const diffHrs = Math.floor(
                                diff / (1000 * 60 * 60),
                              );
                              const diffMins = Math.floor(
                                (diff % (1000 * 60 * 60)) / (1000 * 60),
                              );
                              const diffDays = Math.floor(diffHrs / 24);
                              if (diffDays > 0) {
                                timeLabel = `In ${diffDays}d ${diffHrs % 24}h`;
                              } else {
                                timeLabel = `In ${diffHrs}h ${diffMins}m`;
                              }
                            }
                          }

                          return (
                            <div
                              key={evt.id}
                              onClick={() => setSelectedPvpEventId(evt.id)}
                              className="group flex cursor-pointer items-center justify-between rounded-xl border border-border bg-surface-solid p-3.5 shadow-xs transition-all hover:border-sky-blue hover:shadow-sm"
                            >
                              <div className="text-left space-y-1 min-w-0 flex-1 pr-2">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-charcoal-primary truncate">
                                  <span>{getCountryFlag(recTeamA)}</span>
                                  <span>vs</span>
                                  <span>{getCountryFlag(recTeamB)}</span>
                                  <span className="truncate ml-0.5">
                                    {recTeamA} vs {recTeamB}
                                  </span>
                                </div>
                                <span className="block text-[9px] font-mono text-ash font-medium">
                                  {timeLabel ? `${timeLabel} · ` : ""}$
                                  {vol.toLocaleString()}
                                </span>
                              </div>
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-muted text-charcoal-primary transition-all group-hover:bg-sky-blue group-hover:text-white">
                                <ArrowRight className="h-3.5 w-3.5" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <PvpTicketBuilder
                selectedPvpEvent={selectedPvpEvent}
                pvpEvents={sortedPvpEvents}
                pvpStatus={pvpStatus}
                pvpSelections={pvpSelections}
                betAmountPerSelection={betAmountPerSelection}
                isSubmitting={isSubmitting}
                showTooltip={showTooltip}
                referralsData={referralsData}
                parsedTeams={parsedTeams}
                groupedOptions={groupedOptions}
                onToggleSelection={handleToggleSelection}
                onSetBetAmount={setBetAmountPerSelection}
                onSetShowTooltip={setShowTooltip}
                onSubmitTicket={handleSubmitPvpTicket}
                onAddLiquidity={(id) => setLiquidityMarketId(id)}
                onProvideLiquidity={handleProvideLiquidity}
              />
            ))}
        </>
      )}
    </div>
  );
}
