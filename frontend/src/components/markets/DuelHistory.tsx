"use client";

import Link from "next/link";
import { useState } from "react";
import { History, X, Swords, Award } from "lucide-react";
import { parseEventTeams } from "./PvpMatchupCarousel";
import { usePvpMatchHistoryQuery } from "@/store/verity/verityQueries";
import { PREVIEW_DUEL_HISTORY } from "@/lib/previewData";

interface DuelHistoryPick {
  marketId: string;
  optionName: string;
  selection: string;
  isCorrect: boolean | null;
  yesCondition?: string | null;
  noCondition?: string | null;
  resolvedOutcome?: string | null;
  investedUsdc?: number;
  winningsUsdc?: number;
}

interface DuelHistoryMatch {
  matchId: string;
  resolvedAt: string;
  parentMarketId?: string;
  eventQuestion: string;
  outcome: "WIN" | "LOSS" | "DRAW";
  myScore: number;
  oppScore: number;
  xpEarned: number;
  doubleBoostActive?: boolean;
  myPicks: DuelHistoryPick[];
  oppPicks: DuelHistoryPick[];
  opponent: {
    id?: string;
    username: string;
    displayName?: string | null;
    avatarUrl?: string | null;
  } | null;
}

export default function DuelHistory({
  preview = false,
}: {
  preview?: boolean;
}) {
  const { data: liveMatchHistory = [] } = usePvpMatchHistoryQuery({
    enabled: !preview,
  });
  const matchHistory: DuelHistoryMatch[] = preview
    ? (PREVIEW_DUEL_HISTORY as DuelHistoryMatch[])
    : (liveMatchHistory as DuelHistoryMatch[]);
  const [selectedMatch, setSelectedMatch] = useState<DuelHistoryMatch | null>(
    null,
  );

  return (
    <div className="pvp-history-card verity-card overflow-hidden flex flex-col bg-white ">
      <div className="p-4 border-b border-border flex items-center gap-2">
        <h3 className="font-sans text-xs font-black uppercase tracking-wider text-charcoal-primary ">
          DUEL HISTORY
        </h3>
      </div>

      {matchHistory.length === 0 ? (
        <div className="pvp-history-empty flex min-h-44 flex-col items-center justify-center p-6 text-center">
          <span className="pvp-state-icon flex h-11 w-11 items-center justify-center rounded-2xl">
            <History className="h-5 w-5" />
          </span>
          <p className="mt-3 text-sm font-bold text-charcoal-primary ">
            No completed duels yet
          </p>
          <p className="mt-1 max-w-64 text-xs text-ash">
            Your verified results, scores and XP will appear here.
          </p>
          <Link
            href="/pvp#duel-arena"
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-current bg-white px-4 text-sm font-bold text-charcoal-primary"
          >
            Enter a duel
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 p-4 max-h-[360px] overflow-y-auto">
          {matchHistory.map((item) => {
            const { teamA, teamB } = parseEventTeams(item.eventQuestion);
            return (
              <button
                type="button"
                key={item.matchId}
                onClick={() => setSelectedMatch(item)}
                className="flex min-h-14 w-full cursor-pointer items-center justify-between rounded-2xl border border-stone-200/20 bg-[#FAF9F6] p-3.5 text-left shadow-xs transition-all hover:bg-[#F3F1EC] hover:shadow-sm "
              >
                {/* Left Column: Match Details */}
                <div className="space-y-1 min-w-0 flex-1 pr-3">
                  <h4 className="text-xs font-bold tracking-tight text-charcoal-primary truncate">
                    {teamA} vs {teamB}
                  </h4>
                  <div className="flex items-center gap-1.5 text-[10px] font-medium text-ash">
                    <span className="truncate max-w-[90px]">
                      @{item.opponent?.username || "opponent"}
                    </span>
                    <span>·</span>
                    <span className="font-mono">
                      Score {item.myScore} – {item.oppScore}
                    </span>
                  </div>
                </div>

                {/* Right Column: Status & XP Pills */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[9px] font-bold font-mono uppercase tracking-wider ${
                      item.outcome === "WIN"
                        ? "bg-emerald-50 text-emerald-600 "
                        : item.outcome === "LOSS"
                          ? "bg-[#FFEBE5] text-[#FF4D00] "
                          : "bg-zinc-100 text-zinc-600 "
                    }`}
                  >
                    {item.outcome}
                  </span>
                  <span className="pixel-reward text-[10px] text-emerald-600 ">
                    +{item.xpEarned} XP
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Duel Details Modal */}
      {selectedMatch && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="game-modal-surface flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden text-left animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-stone-50 ">
              <div className="flex items-center gap-2">
                <Swords className="h-5 w-5 text-coral-red" />
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-charcoal-primary ">
                  Duel Match Details
                </span>
              </div>
              <button
                onClick={() => setSelectedMatch(null)}
                className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-ash transition-colors hover:bg-stone-200 hover:text-charcoal-primary "
                aria-label="Close duel details"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-5">
              {/* Event Question */}
              <div>
                <span className="font-mono text-[9px] font-bold text-ash uppercase tracking-wider block">
                  Match Event
                </span>
                <h4 className="text-base font-bold text-charcoal-primary leading-snug mt-1">
                  {selectedMatch.eventQuestion}
                </h4>
                <span className="text-[10px] font-mono text-ash mt-1 block">
                  Resolved At:{" "}
                  {new Date(selectedMatch.resolvedAt).toLocaleString()}
                </span>
              </div>

              {/* Outcome Banner & Stats Summary */}
              <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-border bg-linear-to-br from-sky-blue/5 via-transparent to-transparent p-4 md:flex-row">
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div
                    className={`h-11 w-11 rounded-full flex items-center justify-center shrink-0 border ${
                      selectedMatch.outcome === "WIN"
                        ? "bg-meadow-green/10 border-meadow-green/20 text-meadow-green"
                        : selectedMatch.outcome === "LOSS"
                          ? "bg-ember-orange/10 border-ember-orange/20 text-ember-orange"
                          : "bg-zinc-500/10 border-zinc-500/20 text-zinc-500"
                    }`}
                  >
                    <Award className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-[9px] font-mono font-bold text-ash uppercase tracking-wider block">
                      Outcome
                    </span>
                    <span
                      className={`text-base font-extrabold tracking-tight ${
                        selectedMatch.outcome === "WIN"
                          ? "text-meadow-green"
                          : selectedMatch.outcome === "LOSS"
                            ? "text-ember-orange"
                            : "text-ash"
                      }`}
                    >
                      {selectedMatch.outcome === "WIN"
                        ? "YOU WON"
                        : selectedMatch.outcome === "LOSS"
                          ? "YOU LOST"
                          : "DRAW"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 w-full md:w-auto flex-1 md:justify-end">
                  <div className="bg-stone-50 p-2.5 rounded-lg border border-border text-center">
                    <span className="text-[9px] font-mono text-ash block">
                      Score
                    </span>
                    <strong className="pixel-reward mt-1 block text-xs text-charcoal-primary ">
                      {selectedMatch.myScore} - {selectedMatch.oppScore}
                    </strong>
                  </div>
                  <div className="bg-stone-50 p-2.5 rounded-lg border border-border text-center">
                    <span className="text-[9px] font-mono text-ash block">
                      XP Earned
                    </span>
                    <strong className="text-sm font-bold font-sans text-charcoal-primary mt-0.5 block">
                      +{selectedMatch.xpEarned} XP
                    </strong>
                  </div>
                  <div className="bg-stone-50 p-2.5 rounded-lg border border-border text-center">
                    <span className="text-[9px] font-mono text-ash block">
                      Profit/Loss
                    </span>
                    {(() => {
                      const totalBet =
                        selectedMatch.myPicks?.reduce(
                          (acc, pick) => acc + (pick.investedUsdc ?? 5),
                          0,
                        ) ?? 0;
                      const totalWon =
                        selectedMatch.myPicks?.reduce(
                          (acc, pick) => acc + (pick.winningsUsdc ?? 0),
                          0,
                        ) ?? 0;
                      const net = totalWon - totalBet;
                      return (
                        <strong
                          className={`text-sm font-bold font-mono mt-0.5 block ${net >= 0 ? "text-meadow-green" : "text-ember-orange"}`}
                        >
                          {net >= 0 ? "+" : ""}
                          {net.toFixed(2)} USDC
                        </strong>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Picks list comparison */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-xs font-mono font-bold text-ash uppercase tracking-wider">
                    Predictions Comparison
                  </span>
                  <span className="text-[10px] text-ash font-mono font-medium">
                    Opponent: @{selectedMatch.opponent?.username || "Opponent"}
                  </span>
                </div>

                <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
                  {selectedMatch.myPicks?.map((pick) => {
                    const oppPick = selectedMatch.oppPicks?.find(
                      (candidate) => candidate.marketId === pick.marketId,
                    );
                    const bet = pick.investedUsdc ?? 5;
                    const won = pick.winningsUsdc ?? 0;
                    const resolvedLabel =
                      pick.resolvedOutcome === "YES"
                        ? pick.yesCondition || "YES"
                        : pick.resolvedOutcome === "NO"
                          ? pick.noCondition || "NO"
                          : pick.resolvedOutcome || "Pending";

                    return (
                      <div
                        key={pick.marketId}
                        className="p-3.5 rounded-xl bg-stone-50 border border-border flex flex-col gap-2"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-xs font-bold text-charcoal-primary uppercase tracking-tight">
                            {pick.optionName}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold ${
                              pick.isCorrect === true
                                ? "bg-meadow-green/10 text-meadow-green border border-meadow-green/20"
                                : pick.isCorrect === false
                                  ? "bg-ember-orange/10 text-ember-orange border border-ember-orange/20"
                                  : "bg-stone-100 text-ash"
                            }`}
                          >
                            {pick.isCorrect === true
                              ? "CORRECT"
                              : pick.isCorrect === false
                                ? "WRONG"
                                : "PENDING"}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mt-1">
                          <div className="bg-white-surface p-2 rounded-[8px] border border-border/80 ">
                            <span className="text-[8px] font-mono text-ash uppercase block">
                              You Picked
                            </span>
                            <span
                              className={`text-xs font-bold mt-0.5 block ${
                                pick.selection === "YES"
                                  ? "text-meadow-green"
                                  : pick.selection === "NO"
                                    ? "text-ember-orange"
                                    : "text-sky-blue"
                              }`}
                            >
                              {pick.selection === "YES"
                                ? pick.yesCondition || "YES"
                                : pick.selection === "NO"
                                  ? pick.noCondition || "NO"
                                  : pick.selection}
                            </span>
                          </div>

                          <div className="bg-white-surface p-2 rounded-[8px] border border-border/80 ">
                            <span className="text-[8px] font-mono text-ash uppercase block">
                              Opponent Picked
                            </span>
                            <span
                              className={`text-xs font-bold mt-0.5 block ${
                                oppPick?.selection === "YES"
                                  ? "text-meadow-green"
                                  : oppPick?.selection === "NO"
                                    ? "text-ember-orange"
                                    : "text-sky-blue"
                              }`}
                            >
                              {oppPick
                                ? oppPick.selection === "YES"
                                  ? pick.yesCondition || "YES"
                                  : oppPick.selection === "NO"
                                    ? pick.noCondition || "NO"
                                    : oppPick.selection
                                : "N/A"}
                            </span>
                          </div>

                          <div className="bg-white-surface p-2 rounded-[8px] border border-border/80 ">
                            <span className="text-[8px] font-mono text-ash uppercase block">
                              Outcome
                            </span>
                            <span className="text-xs font-bold text-charcoal-primary mt-0.5 block truncate">
                              {resolvedLabel}
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-[9px] font-mono text-ash border-t border-dashed border-border/60 pt-2 mt-1">
                          <span>Staked: {bet.toFixed(2)} USDC</span>
                          <span
                            className={
                              won > 0 ? "text-meadow-green font-bold" : ""
                            }
                          >
                            Winnings: {won.toFixed(2)} USDC
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border flex justify-end bg-stone-50 ">
              <button
                onClick={() => setSelectedMatch(null)}
                className="game-button-primary min-h-11 cursor-pointer rounded-[10px] px-5 text-xs font-bold text-white transition-all"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
