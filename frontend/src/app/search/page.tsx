"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowUpRight, Search, Swords, X } from "lucide-react"
import { useActivePvpEventsQuery } from "@/store/verity/verityQueries"

export default function SearchPage() {
  const [query, setQuery] = useState("")
  const { data: slates = [], isLoading } = useActivePvpEventsQuery()
  const normalizedQuery = query.trim().toLowerCase()
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
  )

  return (
    <div className="mx-auto min-h-[calc(100vh-170px)] w-full max-w-[672px] pb-10 pt-4 sm:pt-6">
      <section className="verity-card relative overflow-hidden p-5 sm:p-7">
        <div
          className="absolute -right-16 -top-16 -z-10 h-56 w-56 rounded-full bg-brand-primary/10 blur-[80px]"
          aria-hidden="true"
        />
        <div className="relative max-w-[430px]">
          <p className="font-mono text-[9px] font-black uppercase tracking-[0.2em] text-meadow-green">
            Duel scanner
          </p>
          <h1 className="mt-2 text-3xl font-black leading-none text-charcoal-primary dark:text-white">
            Find your next matchup.
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ash">
            Search every open World Cup duel by team, player, or event.
          </p>
        </div>

        <div className="relative mt-6">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-primary" />
          <input
            autoFocus
            className="h-14 w-full rounded-2xl border border-stone-surface bg-white-surface pl-12 pr-12 font-mono text-sm font-semibold text-charcoal-primary outline-none transition focus:border-brand-primary focus:shadow-[0_0_0_3px_rgba(20,121,255,0.12)] dark:bg-zinc-900/40 dark:text-white"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search duels..."
            type="search"
            value={query}
          />
          {query && (
            <button
              aria-label="Clear search"
              className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-ash transition-colors hover:bg-stone-surface hover:text-charcoal-primary"
              onClick={() => setQuery("")}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </section>

      <div className="mt-5 flex items-center justify-between px-1">
        <p className="font-mono text-[9px] font-black uppercase tracking-[0.18em] text-ash">
          {normalizedQuery
            ? `${results.length} matches found`
            : "Open duel rooms"}
        </p>
        <span className="ml-4 h-px flex-1 bg-gradient-to-r from-stone-surface to-transparent" />
      </div>

      <div className="mt-3 grid gap-3">
        {isLoading ? (
          [0, 1, 2].map((item) => (
            <div
              className="verity-card h-24 animate-pulse bg-stone-100 dark:bg-zinc-900/40"
              key={item}
            />
          ))
        ) : results.length ? (
          results.map((slate) => (
            <Link
              className="verity-card verity-card-hover group flex items-center gap-4 p-4"
              href="/pvp"
              key={slate.id}
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-ember-orange/25 bg-ember-orange/10 text-ember-orange">
                <Swords className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-lg font-black text-charcoal-primary dark:text-white">
                  {slate.question}
                </span>
                <span className="mt-1 block font-mono text-[9px] font-bold uppercase tracking-wider text-ash">
                  {slate.options?.length || 0} predictions · open room
                </span>
              </span>
              <ArrowUpRight className="h-5 w-5 shrink-0 text-ash transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-primary" />
            </Link>
          ))
        ) : (
          <div className="verity-card border border-dashed border-stone-surface px-6 py-14 text-center">
            <Search className="mx-auto h-7 w-7 text-ash" />
            <p className="mt-3 text-xl font-black text-charcoal-primary dark:text-white">
              No duel found.
            </p>
            <p className="mt-1 text-xs text-ash">
              Try a team name or clear your search.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
