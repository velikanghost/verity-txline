"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search, Swords, X } from "lucide-react";
import { SearchNavIcon } from "@/components/icons/ArcadeNavIcons";
import { useActivePvpEventsQuery } from "@/store/verity/verityQueries";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const { data: slates = [], isLoading } = useActivePvpEventsQuery();
  const normalizedQuery = query.trim().toLowerCase();
  const results = useMemo(
    () =>
      normalizedQuery
        ? slates.filter((slate) =>
            String(slate.question || "")
              .toLowerCase()
              .includes(normalizedQuery),
          )
        : slates,
    [normalizedQuery, slates],
  );

  return (
    <div className="mx-auto min-h-[calc(100vh-170px)] w-full max-w-[672px] pb-10 pt-4 sm:pt-6">
      <section className="duel-search-hero relative overflow-hidden rounded-[26px] border border-white/[0.09] bg-[#080d18]/86 p-5 shadow-[0_22px_80px_rgba(2,5,15,.28)] sm:p-7">
        <div className="absolute -right-4 -top-4 opacity-25" aria-hidden="true">
          <SearchNavIcon active className="h-28 w-32" />
        </div>
        <div className="relative max-w-[430px]">
          <p className="font-mono text-[9px] font-black uppercase tracking-[0.2em] text-[#35e881]">
            Duel scanner
          </p>
          <h1 className="font-game mt-2 text-3xl font-black leading-none text-white">
            Find your next matchup.
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#8792ad]">
            Search every open World Cup duel by team, player, or event.
          </p>
        </div>

        <div className="relative mt-6">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#59a2ff]" />
          <input
            autoFocus
            className="duel-search-input h-14 w-full rounded-[17px] border border-[#1479ff]/55 bg-[#050912]/90 pl-12 pr-12 font-mono text-sm font-semibold text-white outline-none transition focus:border-[#59a2ff] focus:shadow-[0_0_0_3px_rgba(20,121,255,.13)]"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search duels..."
            type="search"
            value={query}
          />
          {query && (
            <button
              aria-label="Clear search"
              className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#77819b] hover:bg-white/[0.06] hover:text-white"
              onClick={() => setQuery("")}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </section>

      <div className="mt-5 flex items-center justify-between px-1">
        <p className="font-mono text-[9px] font-black uppercase tracking-[0.18em] text-[#7b859f]">
          {normalizedQuery
            ? `${results.length} matches found`
            : "Open duel rooms"}
        </p>
        <span className="h-px flex-1 bg-gradient-to-r from-white/[0.08] to-transparent ml-4" />
      </div>

      <div className="mt-3 grid gap-3">
        {isLoading ? (
          [0, 1, 2].map((item) => (
              <div
                className="duel-search-skeleton h-28 animate-pulse rounded-[20px] border border-white/[0.07] bg-white/[0.035]"
              key={item}
            />
          ))
        ) : results.length ? (
          results.map((slate) => (
            <Link
              className="duel-search-result group flex items-center gap-4 rounded-[20px] border border-white/[0.09] bg-[#0a101c]/88 p-4 transition duration-200 hover:-translate-y-0.5 hover:border-[#1479ff]/40 hover:bg-[#0d1728]"
              href="/pvp"
              key={slate.id}
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] border border-[#ff6b4a]/25 bg-[#ff6b4a]/10 text-[#ff8d75]">
                <Swords className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-game text-lg font-black text-white">
                  {slate.question}
                </span>
                <span className="mt-1 block font-mono text-[9px] font-bold uppercase tracking-wider text-[#75809b]">
                  {slate.options?.length || 0} predictions · open room
                </span>
              </span>
              <ArrowUpRight className="h-5 w-5 shrink-0 text-[#4f5b75] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#59a2ff]" />
            </Link>
          ))
        ) : (
          <div className="duel-search-empty rounded-[22px] border border-dashed border-white/[0.12] bg-[#080d17]/65 px-6 py-14 text-center">
            <Search className="mx-auto h-7 w-7 text-[#45516a]" />
            <p className="font-game mt-3 text-xl font-black text-white">
              No duel found.
            </p>
            <p className="mt-1 text-xs text-[#77819b]">
              Try a team name or clear your search.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
