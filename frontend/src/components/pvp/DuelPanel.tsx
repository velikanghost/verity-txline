"use client";

import { useEffect, useState } from "react";
import { Swords, Trophy, LockKeyhole } from "lucide-react";

export interface Pick {
  marketId: string;
  optionName: string;
  matchup?: string | null;
  selection: string;
  isCorrect: boolean | null;
  yesCondition?: string;
  noCondition?: string;
  status?: string;
  resolvedOutcome?: string | null;
}

export interface DuelStatus {
  status: "queued" | "matched" | "resolved";
  ticket: {
    id: string;
    status: string;
    score: number;
    xpEarned: number;
    picks: Pick[];
  };
  match: { id: string; divergenceScore: number; status: string } | null;
  opponent: {
    id: string;
    username: string;
    avatarUrl: string | null;
    picks: Pick[];
  } | null;
  event: { id: string; question: string } | null;
}

const correctCount = (picks: Pick[]) =>
  picks.filter((p) => p.isCorrect === true).length;

function AnimatedScore({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const reducedMotionFrame = requestAnimationFrame(() => setDisplay(value));
      return () => cancelAnimationFrame(reducedMotionFrame);
    }

    const startedAt = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / 420);
      setDisplay(Math.round(value * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <div
      aria-hidden="true"
      className="pvp-score-pop text-3xl font-black text-charcoal-primary "
    >
      {display}
    </div>
  );
}

const displaySelection = (
  value: string | null | undefined,
  pick: Pick,
): string => {
  if (!value) return "—";
  if (value === "YES") return pick.yesCondition || "Yes";
  if (value === "NO") return pick.noCondition || "No";
  return value;
};

function PredictionComparisonRow({
  pick,
  opponentPick,
  isSearching = false,
}: {
  pick: Pick;
  opponentPick?: Pick;
  isSearching?: boolean;
}) {
  const result = pick.resolvedOutcome ?? opponentPick?.resolvedOutcome ?? null;
  const isSettled =
    result !== null ||
    pick.isCorrect !== null ||
    (opponentPick?.isCorrect ?? null) !== null;

  return (
    <article
      className={`pvp-comparison-row ${isSettled ? "is-settled" : ""}`}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          {pick.matchup && (
            <span className="block truncate font-mono text-[9px] font-black uppercase tracking-[0.12em] text-ash">
              {pick.matchup}
            </span>
          )}
          <h4 className="mt-1 truncate text-sm font-black text-charcoal-primary">
            {pick.optionName}
          </h4>
        </div>
        {isSettled && (
          <span className="pvp-comparison-result-badge">Result in</span>
        )}
      </div>

      <div
        className={`mt-3 grid grid-cols-2 gap-2 ${
          isSettled
            ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_76px]"
            : "lg:grid-cols-2"
        }`}
      >
        <div className="pvp-comparison-cell">
          <span>You</span>
          <strong>{displaySelection(pick.selection, pick)}</strong>
        </div>
        <div
          className={`pvp-comparison-cell ${isSearching ? "is-searching" : ""}`}
        >
          <span>Rival</span>
          {isSearching ? (
            <strong className="pvp-rival-searching">
              Looking for rival
              <i aria-hidden="true" />
              <i aria-hidden="true" />
              <i aria-hidden="true" />
            </strong>
          ) : (
            <strong>
              {opponentPick
                ? displaySelection(opponentPick.selection, opponentPick)
                : "—"}
            </strong>
          )}
        </div>

        {isSettled && (
          <>
            <div className="pvp-comparison-cell is-result">
              <span>Result</span>
              <strong>{displaySelection(result, pick)}</strong>
            </div>
            <div
              className={`pvp-comparison-cell is-points ${
                pick.isCorrect ? "is-correct" : ""
              }`}
            >
              <span>Points</span>
              <strong>{pick.isCorrect ? "+1" : "0"}</strong>
            </div>
          </>
        )}
      </div>
    </article>
  );
}

export default function DuelPanel({ status }: { status: DuelStatus }) {
  const myScore = correctCount(status.ticket.picks);
  const oppScore = status.opponent ? correctCount(status.opponent.picks) : 0;
  const resolved = status.status === "resolved";
  const won = resolved && myScore > oppScore;
  const tied = resolved && myScore === oppScore;

  return (
    <div className="pvp-duel-panel flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-charcoal-primary leading-tight">
          {status.event?.question || "Your duel"}
        </h1>
        <span
          aria-atomic="true"
          aria-live="polite"
          className="text-[10px] font-mono font-bold uppercase tracking-wider text-ash"
          role="status"
        >
          {status.status === "queued"
            ? "Waiting for an opponent"
            : status.status === "matched"
              ? "Duel live"
              : won
                ? "You won"
                : tied
                  ? "Draw"
                  : "You lost"}
        </span>
      </div>

      {/* Scoreboard */}
      {status.opponent ? (
        <div className="pvp-scoreboard verity-card flex items-center justify-between gap-3 p-5">
          <p
            aria-atomic="true"
            aria-live="polite"
            className="sr-only"
            role="status"
          >
            Current score: You {myScore}, @{status.opponent.username} {oppScore}.
          </p>
          <div className="flex-1 text-center">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-ash">
              You
            </div>
            <AnimatedScore value={myScore} />
          </div>
          <div className="flex flex-col items-center gap-1 text-ash">
            {resolved && won ? (
              <Trophy className="h-5 w-5 text-amber-500" />
            ) : (
              <Swords className="h-5 w-5" />
            )}
            <span className="text-[9px] font-mono font-bold uppercase">vs</span>
          </div>
          <div className="flex-1 text-center">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-ash truncate">
              @{status.opponent.username}
            </div>
            <AnimatedScore value={oppScore} />
          </div>
        </div>
      ) : (
        <div
          aria-atomic="true"
          aria-live="polite"
          className="pvp-matchmaking-card verity-card relative overflow-hidden p-5 sm:p-7"
          role="status"
        >
          <div className="pvp-matchmaking-beam" aria-hidden="true" />
          <div className="relative z-10">
            <div className="flex items-center justify-between gap-3">
              <span className="pvp-matchmaking-live">
                <i aria-hidden="true" /> Live matchmaking
              </span>
              <span className="pvp-matchmaking-locked">
                <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
                Lineup locked
              </span>
            </div>

            <div className="pvp-matchmaking-versus mt-7 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
              <div className="flex min-w-0 flex-col items-center text-center">
                <span className="pvp-matchmaking-avatar is-player">Y</span>
                <strong className="mt-2 truncate text-sm">You</strong>
                <small>Ready</small>
              </div>

              <div className="pvp-matchmaking-radar" aria-hidden="true">
                <span />
                <Swords className="h-5 w-5" />
              </div>

              <div className="flex min-w-0 flex-col items-center text-center">
                <span className="pvp-matchmaking-avatar is-rival">?</span>
                <strong className="mt-2 truncate text-sm">Finding rival</strong>
                <small>Searching</small>
              </div>
            </div>

            <div className="mt-7 text-center">
              <p className="font-black text-charcoal-primary">
                Scanning the World Cup arena
                <span className="pvp-matchmaking-dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
              </p>
              <p className="mx-auto mt-2 max-w-[390px] text-xs leading-relaxed text-ash">
                We&apos;re finding someone who locked a lineup for this same
                contest. Your ticket is safe while the search runs.
              </p>
            </div>
          </div>
        </div>
      )}

      {resolved && status.ticket.xpEarned > 0 && (
        <div
          aria-atomic="true"
          aria-live="polite"
          className="pvp-success-reveal pixel-reward verity-card flex items-center justify-center gap-2 bg-amber-500/5 p-4 text-xs font-bold text-amber-600"
          role="status"
        >
          <Trophy className="h-4 w-4" /> +{status.ticket.xpEarned} Arena XP
        </div>
      )}

      <section className="pvp-comparison-list">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-charcoal-primary">
              Predictions
            </h3>
            <p className="mt-0.5 text-xs text-ash">
              {status.opponent
                ? `Your picks beside @${status.opponent.username}.`
                : "Your picks are locked while we find your rival."}
            </p>
          </div>
          <span className="shrink-0 font-mono text-[9px] font-black uppercase tracking-[0.12em] text-ash">
            {resolved
              ? "Final results"
              : status.opponent
                ? "Duel live"
                : "Searching"}
          </span>
        </div>
        <div className="flex flex-col gap-3">
          {status.ticket.picks.map((pick) => (
            <PredictionComparisonRow
              key={pick.marketId}
              pick={pick}
              opponentPick={status.opponent?.picks.find(
                (opponentPick) => opponentPick.marketId === pick.marketId,
              )}
              isSearching={!status.opponent}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
