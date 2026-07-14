"use client";

import { WorldCupMarketsList } from "@/components/worldcup/WorldCupMarketsList";

export default function WorldCupMarketsPage() {
  return (
    <div className="tournament-worldcup mx-auto max-w-4xl px-4 py-6">
      <header className="verity-card game-grid relative mb-6 overflow-hidden p-5 sm:p-6">
        <div
          className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#1479ff]/22 blur-3xl"
          aria-hidden="true"
        />
        <p className="font-mono text-[9px] font-black uppercase tracking-[0.18em] text-[#59a2ff]">
          Live match arena
        </p>
        <h1 className="mt-1 text-3xl font-black">World Cup fixtures</h1>
        <p className="mt-2 max-w-lg text-sm text-graphite">
          Choose a side and settle every result against a signed TxLINE proof.
        </p>
      </header>
      <WorldCupMarketsList />
    </div>
  );
}
