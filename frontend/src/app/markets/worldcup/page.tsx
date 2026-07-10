"use client"

import { WorldCupMarketsList } from "@/components/worldcup/WorldCupMarketsList"

export default function WorldCupMarketsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">World Cup Markets</h1>
      </header>
      <WorldCupMarketsList />
    </div>
  )
}
