"use client";

import { useEffect, useState } from "react";
import { Check, X, Clock, Swords, Trophy } from "lucide-react";

interface Pick {
  marketId: string;
  optionName: string;
  matchup?: string | null;
  selection: string;
  isCorrect: boolean | null;
}

interface DuelStatus {
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
    <div className="pvp-score-pop text-3xl font-black text-charcoal-primary ">
      {display}
    </div>
  );
}

function PickRow({ pick }: { pick: Pick }) {
  const state =
    pick.isCorrect === true
      ? "correct"
      : pick.isCorrect === false
        ? "wrong"
        : "pending";
  return (
    <div className="pvp-pick-row flex items-center justify-between gap-3 rounded-xl bg-[#FAF9F6] px-3 py-3 ">
      <div className="min-w-0">
        {pick.matchup && (
          <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-ash truncate">
            {pick.matchup}
          </div>
        )}
        <div className="text-xs font-bold text-charcoal-primary truncate">
          {pick.optionName}
        </div>
        <div className="text-[10px] font-mono text-ash truncate">
          Pick: {pick.selection}
        </div>
      </div>
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
          state === "correct"
            ? "bg-emerald-500/15 text-emerald-600"
            : state === "wrong"
              ? "bg-rose-500/15 text-rose-500"
              : "bg-stone-400/15 text-ash"
        }`}
      >
        {state === "correct" ? (
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        ) : state === "wrong" ? (
          <X className="h-3.5 w-3.5" strokeWidth={3} />
        ) : (
          <Clock className="h-3.5 w-3.5" />
        )}
      </span>
    </div>
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
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ash">
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
        <div className="verity-card p-6 text-center">
          <Clock className="mx-auto h-6 w-6 text-ash" />
          <p className="mt-2 text-sm font-bold text-charcoal-primary ">
            Lineup locked in
          </p>
          <p className="mt-1 text-xs text-ash">
            You&apos;ll be matched with an opponent when lineups lock.
          </p>
        </div>
      )}

      {resolved && status.ticket.xpEarned > 0 && (
        <div className="pvp-success-reveal pixel-reward verity-card flex items-center justify-center gap-2 bg-amber-500/5 p-4 text-xs font-bold text-amber-600">
          <Trophy className="h-4 w-4" /> +{status.ticket.xpEarned} Arena XP
        </div>
      )}

      {/* Picks side by side */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <h3 className="text-[10px] font-mono font-black uppercase tracking-wider text-ash">
            Your lineup
          </h3>
          {status.ticket.picks.map((p) => (
            <PickRow key={p.marketId} pick={p} />
          ))}
        </div>
        {status.opponent && (
          <div className="flex flex-col gap-2">
            <h3 className="text-[10px] font-mono font-black uppercase tracking-wider text-ash">
              @{status.opponent.username}
            </h3>
            {status.opponent.picks.map((p) => (
              <PickRow key={p.marketId} pick={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
