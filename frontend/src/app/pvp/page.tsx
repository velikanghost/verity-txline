"use client"

import { useMemo, useState } from "react"
import { Swords } from "lucide-react"
import { useAuth } from "@/components/providers/AuthModals"
import { useUsdcBalance } from "@/hooks/useUsdcBalance"
import {
  useActivePvpEventsQuery,
  useMyActivePvpTicketsQuery,
  usePvpStatusQuery,
} from "@/store/verity/verityQueries"
import SlateGrid from "@/components/pvp/SlateGrid"
import LineupBuilder from "@/components/pvp/LineupBuilder"
import DuelPanel from "@/components/pvp/DuelPanel"
import DuelHistory from "@/components/markets/DuelHistory"

export default function PvpArenaPage() {
  const { authenticated } = useAuth()
  const { formattedBalance } = useUsdcBalance()

  const { data: activeSlates = [], isLoading: slatesLoading } =
    useActivePvpEventsQuery()
  const { data: myTicketSlates = [] } = useMyActivePvpTicketsQuery()

  // Merge open slates with any where the user still has an active lineup.
  const slates = useMemo(() => {
    const seen = new Set<string>()
    const merged: any[] = []
    for (const s of [...activeSlates, ...myTicketSlates]) {
      if (!seen.has(s.id)) {
        seen.add(s.id)
        merged.push(s)
      }
    }
    return merged.sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return db - da
    })
  }, [activeSlates, myTicketSlates])

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selectedSlate = slates.find((s) => s.id === selectedId) || null

  const { data: pvpStatus, refetch: refetchStatus } =
    usePvpStatusQuery(selectedId)

  const hasLineup = Boolean(pvpStatus && pvpStatus.ticket)

  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 py-6 font-sans">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
            <Swords className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-lg font-black leading-none text-charcoal-primary dark:text-white">
              PvP Arena
            </h1>
            <p className="mt-1 text-[11px] font-medium text-ash">
              Build a cross-game lineup. Out-predict your opponent.
            </p>
          </div>
        </div>
        {authenticated && (
          <div className="verity-pill bg-stone-100 dark:bg-zinc-900/60 px-3 py-1.5 text-xs font-bold font-mono text-charcoal-primary dark:text-white">
            {formattedBalance} USDC
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        {/* Main */}
        <div className="lg:col-span-2">
          {!selectedSlate ? (
            <SlateGrid
              slates={slates}
              loading={slatesLoading}
              onSelect={setSelectedId}
            />
          ) : hasLineup ? (
            <DuelPanel
              status={pvpStatus}
              onBack={() => setSelectedId(null)}
            />
          ) : (
            <LineupBuilder
              slate={selectedSlate}
              onBack={() => setSelectedId(null)}
              onSubmitted={() => void refetchStatus()}
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          <DuelHistory />
        </div>
      </div>
    </div>
  )
}
