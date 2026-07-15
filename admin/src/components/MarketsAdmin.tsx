"use client"

import { useState } from "react"
import { Target, Swords } from "lucide-react"
import WorldCupTab from "./WorldCupTab"
import SlateBuilderTab from "./SlateBuilderTab"

type Mode = "individual" | "event"

const MODES: { id: Mode; label: string; icon: typeof Target; hint: string }[] = [
  {
    id: "individual",
    label: "Individual Market",
    icon: Target,
    hint: "One TxLINE-settled prop on a single fixture.",
  },
  {
    id: "event",
    label: "PvP Game Event",
    icon: Swords,
    hint: "A slate of props players build lineups from and duel over.",
  },
]

/**
 * The single admin market-creation surface. Admins choose one of two things to
 * create: an individual market, or a PvP game event (slate). Both are built
 * from the same TxLINE market-type catalogue.
 */
export default function MarketsAdmin() {
  const [mode, setMode] = useState<Mode>("individual")
  const active = MODES.find((m) => m.id === mode)!

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="inline-flex w-fit gap-1 rounded-lg border border-stone-200 bg-stone-100 p-1">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                mode === m.id
                  ? "bg-white text-stone-950 shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <m.icon className="h-3.5 w-3.5" />
              {m.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-stone-500">{active.hint}</p>
      </div>

      {mode === "individual" ? <WorldCupTab /> : <SlateBuilderTab />}
    </div>
  )
}
