"use client"

import Link from "next/link"
import { Swords } from "lucide-react"
import { WorldCupMarketsList } from "@/components/worldcup/WorldCupMarketsList"

export default function HomeExperience() {
  return (
    <div className="flex min-h-screen flex-col gap-5 py-2">
      {/* Hero */}
      <div className="verity-card relative overflow-hidden p-6">
        <p className="text-[10px] font-mono font-black uppercase tracking-widest text-brand-primary">
          Social Prediction Market
        </p>
        <h1 className="mt-2 max-w-xl text-3xl font-black leading-[1.05] tracking-tight text-charcoal-primary dark:text-white sm:text-4xl">
          Predict the match. Prove your read.
        </h1>
        <p className="mt-3 max-w-lg text-sm text-ash">
          Back your calls on live World Cup stats — every market settles
          trustlessly on-chain by verifying TxLINE&apos;s signed data feed. Then
          take opponents head-to-head in the PvP Arena.
        </p>
        <Link
          href="/pvp"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-charcoal-primary px-4 py-2 text-sm font-bold text-white transition-all hover:opacity-90 clickable dark:bg-white dark:text-zinc-950"
        >
          <Swords className="h-4 w-4" />
          Enter the PvP Arena
        </Link>
      </div>

      {/* Markets grid */}
      <div>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-black text-charcoal-primary dark:text-white">
            Markets
          </h2>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ash">
            Settles on-chain via TxLINE
          </span>
        </div>
        <WorldCupMarketsList />
      </div>
    </div>
  )
}
