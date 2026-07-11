"use client"

import { ChevronLeft, Check, X, Clock, Swords, Trophy } from "lucide-react"

interface Pick {
  marketId: string
  optionName: string
  matchup?: string | null
  selection: string
  isCorrect: boolean | null
}

interface DuelStatus {
  status: "queued" | "matched" | "resolved"
  ticket: {
    id: string
    status: string
    score: number
    xpEarned: number
    picks: Pick[]
  }
  match: { id: string; divergenceScore: number; status: string } | null
  opponent: {
    id: string
    username: string
    avatarUrl: string | null
    picks: Pick[]
  } | null
  event: { id: string; question: string } | null
}

const correctCount = (picks: Pick[]) =>
  picks.filter((p) => p.isCorrect === true).length

function PickRow({ pick }: { pick: Pick }) {
  const state =
    pick.isCorrect === true
      ? "correct"
      : pick.isCorrect === false
        ? "wrong"
        : "pending"
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-[#FAF9F6] dark:bg-zinc-900/40 px-3 py-2.5">
      <div className="min-w-0">
        {pick.matchup && (
          <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-ash truncate">
            {pick.matchup}
          </div>
        )}
        <div className="text-xs font-bold text-charcoal-primary dark:text-white truncate">
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
  )
}

export default function DuelPanel({
  status,
  onBack,
}: {
  status: DuelStatus
  onBack: () => void
}) {
  const myScore = correctCount(status.ticket.picks)
  const oppScore = status.opponent ? correctCount(status.opponent.picks) : 0
  const resolved = status.status === "resolved"
  const won = resolved && myScore > oppScore
  const tied = resolved && myScore === oppScore

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1 self-start text-xs font-bold font-mono uppercase tracking-wider text-ash hover:text-charcoal-primary dark:hover:text-white transition-colors clickable"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> All slates
      </button>

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-charcoal-primary dark:text-white leading-tight">
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
        <div className="verity-card flex items-center justify-between gap-3 p-4">
          <div className="flex-1 text-center">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-ash">
              You
            </div>
            <div className="text-3xl font-black text-charcoal-primary dark:text-white">
              {myScore}
            </div>
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
            <div className="text-3xl font-black text-charcoal-primary dark:text-white">
              {oppScore}
            </div>
          </div>
        </div>
      ) : (
        <div className="verity-card p-6 text-center">
          <Clock className="mx-auto h-6 w-6 text-ash" />
          <p className="mt-2 text-sm font-bold text-charcoal-primary dark:text-white">
            Lineup locked in
          </p>
          <p className="mt-1 text-xs text-ash">
            You&apos;ll be matched with an opponent when lineups lock.
          </p>
        </div>
      )}

      {resolved && status.ticket.xpEarned > 0 && (
        <div className="verity-card flex items-center justify-center gap-2 bg-amber-500/5 p-3 text-xs font-bold text-amber-600">
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
  )
}
