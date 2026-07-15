"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { ArrowRight, Swords } from "lucide-react"
import { useAuth } from "@/components/providers/AuthModals"
import { useWalletProfile } from "@/hooks/useWalletProfile"
import { useUsdcBalance } from "@/hooks/useUsdcBalance"
import {
  useActivePvpEventsQuery,
  useMyActivePvpTicketsQuery,
  usePvpStatusQuery,
  useReferralsQuery,
} from "@/store/verity/verityQueries"
import SlateCarousel from "@/components/pvp/SlateCarousel"
import LineupBuilder from "@/components/pvp/LineupBuilder"
import DuelPanel from "@/components/pvp/DuelPanel"
import PvpSidebarStats from "@/components/markets/PvpSidebarStats"
import DuelHistory from "@/components/markets/DuelHistory"

type MobileTab = "arena" | "stats" | "history"

export default function PvpArenaPage() {
  return (
    <Suspense fallback={null}>
      <PvpArenaContent />
    </Suspense>
  )
}

function PvpArenaContent() {
  const { authenticated, login } = useAuth()
  const searchParams = useSearchParams()
  const slateParam = searchParams.get("slate")
  const { profile } = useWalletProfile()
  const { formattedBalance } = useUsdcBalance()

  const { data: activeSlates = [], isLoading: slatesLoading } =
    useActivePvpEventsQuery()
  const { data: myTicketSlates = [] } = useMyActivePvpTicketsQuery()
  const { data: referralsData } = useReferralsQuery()

  const [claimedMarketIds, setClaimedMarketIds] = useState<Set<string>>(
    new Set(),
  )
  const onClaimSuccess = useCallback((ids: string[]) => {
    setClaimedMarketIds((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => next.add(id))
      return next
    })
  }, [])

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
  const [mobileTab, setMobileTab] = useState<MobileTab>("arena")

  // Preselect the slate from ?slate= (e.g. arriving from a home market),
  // otherwise default to the first slate once loaded.
  useEffect(() => {
    if (selectedId || slates.length === 0) return
    if (slateParam && slates.some((s) => s.id === slateParam)) {
      setSelectedId(slateParam)
    } else {
      setSelectedId(slates[0].id)
    }
  }, [slates, selectedId, slateParam])

  const selectedSlate = slates.find((s) => s.id === selectedId) || null
  const { data: pvpStatus, refetch: refetchStatus } =
    usePvpStatusQuery(selectedId)
  const hasLineup = Boolean(pvpStatus && pvpStatus.ticket)

  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 py-6 font-sans">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
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
          <div className="verity-pill bg-stone-100 px-3 py-1.5 font-mono text-xs font-bold text-charcoal-primary dark:bg-zinc-900/60 dark:text-white">
            {formattedBalance} USDC
          </div>
        )}
      </div>

      {/* Mobile sub-tabs */}
      <div className="mb-4 flex gap-1 rounded-xl border border-stone-200/60 bg-stone-100 p-1 dark:border-zinc-800/60 dark:bg-zinc-900 lg:hidden">
        {(["arena", "history", "stats"] as MobileTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setMobileTab(t)}
            className={`flex-1 rounded-lg py-2 text-xs font-bold capitalize transition-all clickable ${
              mobileTab === t
                ? "bg-white text-charcoal-primary shadow-sm dark:bg-zinc-800 dark:text-white"
                : "text-ash hover:text-charcoal-primary dark:hover:text-white"
            }`}
          >
            {t === "arena" ? "Arena" : t === "history" ? "Duel History" : "PvP Stats"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        {/* Main */}
        <div
          className={`flex flex-col gap-5 lg:col-span-2 lg:block ${mobileTab === "arena" ? "block" : "hidden"}`}
        >
          <SlateCarousel
            slates={slates}
            loading={slatesLoading}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />

          {!authenticated ? (
            <div className="verity-card flex flex-col items-center gap-3 p-8 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-primary">
                <Swords className="h-5 w-5" />
              </span>
              <h2 className="text-xl font-black text-charcoal-primary dark:text-white">
                Get started to duel
              </h2>
              <p className="max-w-sm text-sm text-ash">
                Sign up in seconds with your email — we&apos;ll set up your
                wallet. Then build a lineup from the slate above and get matched
                head-to-head.
              </p>
              <button
                onClick={login}
                className="clickable mt-1 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-charcoal-primary px-6 text-sm font-black text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-zinc-950"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            selectedSlate &&
            (hasLineup ? (
              <DuelPanel status={pvpStatus} />
            ) : (
              <LineupBuilder
                slate={selectedSlate}
                onSubmitted={() => void refetchStatus()}
              />
            ))
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          <div className={`${mobileTab === "stats" ? "block" : "hidden"} lg:block`}>
            <PvpSidebarStats
              profile={profile}
              referralsData={referralsData}
              claimedMarketIds={claimedMarketIds}
              onClaimSuccess={onClaimSuccess}
            />
          </div>
          <div
            className={`${mobileTab === "history" ? "block" : "hidden"} lg:block`}
          >
            <DuelHistory />
          </div>
        </div>
      </div>
    </div>
  )
}
