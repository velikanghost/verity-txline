"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import {
  TrendingUp,
  RefreshCw,
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

interface Market {
  id: string
  question: string
  category: string
  deadline: string
  status: string
  resolutionSource?: string
  yesCondition?: string
  noCondition?: string
  outcomes?: string[]
  outcomeCount?: number
  proposalReasoning?: string | null
  proposalCitations?: string[] | null
  proposalProposer?: string | null
  proposalDisputer?: string | null
  disputed?: boolean
  proposedOutcome?: boolean | null
  proposedAt?: string | null
  disputeWindowSeconds?: number
  resolvedOutcome?: string | null
}

interface MarketsTableProps {
  marketsLoading: boolean
  markets: Market[]
  searchQuery: string
  setSearchQuery: (val: string) => void
  categoryFilter: string
  setCategoryFilter: (val: string) => void
  statusFilter: string
  setStatusFilter: (val: string) => void
  sortBy: string
  setSortBy: (val: string) => void
  currentPage: number
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>
  itemsPerPage: number
  fetchMarkets: () => void
  handleApproveTrading: (id: string) => void
  openAddLiquidityModal: (id: string) => void
  handleOpenArbitrateResolve: (market: Market) => void
}

function formatResolvedOutcome(market: Market): string {
  if (!market.resolvedOutcome) return "None"
  const outcome = market.resolvedOutcome.trim()
  if (outcome !== "YES" && outcome !== "NO") {
    return outcome
  }

  const condition = outcome === "YES" ? market.yesCondition : market.noCondition
  if (!condition) return outcome

  const overMatch = condition.match(/over\s+(\d+(?:\.\d+)?)/i)
  if (overMatch) {
    return `Over ${overMatch[1]}`
  }

  const underMatch = condition.match(/under\s+(\d+(?:\.\d+)?)/i)
  if (underMatch) {
    return `Under ${underMatch[1]}`
  }

  const lowerCond = condition.toLowerCase()
  if (lowerCond.includes("red card")) {
    if (lowerCond.includes("at least one") || lowerCond.includes("yes")) {
      return "Red card shown"
    }
    if (lowerCond.includes("no red card") || lowerCond.includes("no red cards")) {
      return "No red card"
    }
  }

  if (lowerCond.includes("both teams to score") || lowerCond.includes("btts")) {
    if (lowerCond.endsWith("yes") || lowerCond.includes("- yes") || lowerCond.includes(" - yes")) {
      return "BTTS - Yes"
    }
    if (lowerCond.endsWith("no") || lowerCond.includes("- no") || lowerCond.includes(" - no")) {
      return "BTTS - No"
    }
  }

  return condition
}

export default function MarketsTable({
  marketsLoading,
  markets,
  searchQuery,
  setSearchQuery,
  categoryFilter,
  setCategoryFilter,
  statusFilter,
  setStatusFilter,
  sortBy,
  setSortBy,
  currentPage,
  setCurrentPage,
  itemsPerPage,
  fetchMarkets,
  handleApproveTrading,
  openAddLiquidityModal,
  handleOpenArbitrateResolve,
}: MarketsTableProps) {
  // Markets sorting, filtering, searching and pagination computations
  const filteredAndSortedMarkets = useMemo(() => {
    let result = [...markets]

    // Searching
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      result = result.filter(
        (m) =>
          m.question.toLowerCase().includes(query) ||
          m.id.toLowerCase().includes(query),
      )
    }

    // Status filtering
    if (statusFilter !== "all") {
      result = result.filter((m) => m.status === statusFilter)
    }

    // Category filtering
    if (categoryFilter !== "all") {
      if (categoryFilter === "pvp") {
        result = result.filter((m) => m.category === "pvp")
      } else {
        result = result.filter((m) => m.category !== "pvp")
      }
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "newest") {
        return b.id.localeCompare(a.id)
      } else if (sortBy === "oldest") {
        return a.id.localeCompare(b.id)
      } else if (sortBy === "deadline-soon") {
        const timeA = new Date(a.deadline).getTime()
        const timeB = new Date(b.deadline).getTime()
        return timeA - timeB
      } else if (sortBy === "deadline-far") {
        const timeA = new Date(a.deadline).getTime()
        const timeB = new Date(b.deadline).getTime()
        return timeB - timeA
      }
      return 0
    })

    return result
  }, [markets, searchQuery, statusFilter, categoryFilter, sortBy])

  // Paginated subset
  const paginatedMarkets = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredAndSortedMarkets.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredAndSortedMarkets, currentPage, itemsPerPage])

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAndSortedMarkets.length / itemsPerPage),
  )

  return (
    <div className="verity-card bg-white border border-stone-200 shadow-xs overflow-hidden flex flex-col">
      {/* Header with Search and Filter panel */}
      <div className="p-5 border-b border-stone-200 bg-stone-50/50 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
              Prediction Market Moderation
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Moderate user generated prediction markets, fund escrow pools, and
              settle resolutions.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto self-stretch md:self-auto justify-end">
            <button
              onClick={fetchMarkets}
              disabled={marketsLoading}
              className="h-9 w-9 rounded-lg hover:bg-stone-100 bg-white border border-stone-200 flex items-center justify-center text-stone-500 hover:text-stone-950 transition-colors shadow-2xs cursor-pointer"
            >
              <RefreshCw
                className={`h-4 w-4 ${marketsLoading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* Filter controls row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search query input */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search markets question or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 border border-stone-200 bg-white text-xs rounded-lg outline-none focus:border-indigo-500 transition-colors placeholder:text-stone-400"
            />
          </div>

          {/* Category filter */}
          <div className="flex items-center gap-2 bg-white border border-stone-200 px-2.5 rounded-lg h-9">
            <Filter className="h-3.5 w-3.5 text-stone-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="flex-1 bg-transparent text-xs outline-none text-stone-700 cursor-pointer"
            >
              <option value="all">All Categories</option>
              <option value="standard">Standard Markets</option>
              <option value="pvp">PvP Arena Markets</option>
            </select>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2 bg-white border border-stone-200 px-2.5 rounded-lg h-9">
            <Filter className="h-3.5 w-3.5 text-stone-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 bg-transparent text-xs outline-none text-stone-700 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="open_for_votes">Open For Votes</option>
              <option value="qualified">Qualified</option>
              <option value="funding_pool">Funding Pool</option>
              <option value="tradable">Tradable</option>
              <option value="resolving">Resolving</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {/* Sorting */}
          <div className="flex items-center gap-2 bg-white border border-stone-200 px-2.5 rounded-lg h-9">
            <ArrowUpDown className="h-3.5 w-3.5 text-stone-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="flex-1 bg-transparent text-xs outline-none text-stone-700 cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="deadline-soon">Deadline (Soonest)</option>
              <option value="deadline-far">Deadline (Furthest)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Markets table content */}
      {marketsLoading && markets.length === 0 ? (
        <div className="p-16 text-center text-sm text-stone-500 animate-pulse font-medium">
          Loading markets...
        </div>
      ) : filteredAndSortedMarkets.length === 0 ? (
        <div className="p-16 text-center text-sm text-stone-400 font-medium">
          No matching markets found. Try updating your filters.
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-stone-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-4">Market Details</th>
                <th className="p-4">Category</th>
                <th className="p-4">Status</th>
                <th className="p-4">Oracle Source</th>
                <th className="p-4">Deadline</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {paginatedMarkets.map((market) => (
                <tr
                  key={market.id}
                  className="hover:bg-stone-50/50 transition-colors"
                >
                  <td className="p-4 max-w-sm">
                    <span className="block font-semibold text-stone-900 text-sm leading-snug">
                      {market.question}
                    </span>
                    <span className="text-[10px] text-stone-400 block mt-1 font-mono uppercase">
                      ID: {market.id}
                    </span>
                  </td>
                  <td className="p-4 align-middle">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        market.category === "pvp"
                          ? "bg-purple-50 text-purple-700 border border-purple-100"
                          : "bg-indigo-50 text-indigo-700 border border-indigo-100"
                      }`}
                    >
                      {market.category}
                    </span>
                  </td>
                  <td className="p-4 align-middle">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                        market.status === "qualified"
                          ? "bg-amber-100 text-amber-855"
                          : market.status === "tradable"
                            ? "bg-emerald-100 text-emerald-855"
                            : market.status === "open_for_votes"
                              ? "bg-blue-100 text-blue-800"
                              : market.status === "resolving"
                                ? "bg-rose-100 text-rose-800"
                                : market.status === "resolved"
                                  ? "bg-stone-200 text-stone-700"
                                  : "bg-stone-100 text-stone-500"
                      }`}
                    >
                      {market.status}
                    </span>
                  </td>
                  <td className="p-4 align-middle text-stone-600 text-xs max-w-[150px] truncate">
                    {market.resolutionSource || "Oracle"}
                  </td>
                  <td className="p-4 align-middle text-stone-600 text-xs">
                    {new Date(market.deadline).toLocaleString()}
                  </td>
                  <td className="p-4 text-right align-middle">
                    <div className="flex items-center justify-end gap-2">
                      {market.status === "qualified" && (
                        <Button
                          onClick={() => handleApproveTrading(market.id)}
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-md text-xs cursor-pointer shadow-xs transition-colors"
                        >
                          Approve Trading
                        </Button>
                      )}
                      {market.status === "funding_pool" && (
                        <Button
                          onClick={() => openAddLiquidityModal(market.id)}
                          size="sm"
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md text-xs cursor-pointer shadow-xs transition-colors"
                        >
                          Add Liquidity
                        </Button>
                      )}
                      {market.status === "tradable" && (
                        <>
                          <Button
                            onClick={() => openAddLiquidityModal(market.id)}
                            variant="outline"
                            size="sm"
                            className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-semibold rounded-md text-xs cursor-pointer transition-colors"
                          >
                            Add Liquidity
                          </Button>
                          <Button
                            onClick={() => handleOpenArbitrateResolve(market)}
                            size="sm"
                            className="bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-md text-xs cursor-pointer shadow-xs transition-colors"
                          >
                            Arbitrate Settle
                          </Button>
                        </>
                      )}
                      {market.status === "resolving" && (
                        <Button
                          onClick={() => handleOpenArbitrateResolve(market)}
                          size="sm"
                          className="bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-md text-xs cursor-pointer shadow-xs transition-colors"
                        >
                          Settle Dispute
                        </Button>
                      )}
                      {![
                        "qualified",
                        "funding_pool",
                        "tradable",
                        "resolving",
                      ].includes(market.status) && (
                        <span className="text-[10px] text-stone-400 font-mono uppercase pr-2">
                          {market.status === "resolved"
                            ? `${formatResolvedOutcome(market)}`
                            : "No Actions"}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Panel */}
      {filteredAndSortedMarkets.length > 0 && (
        <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between">
          <span className="text-xs text-stone-500">
            Showing{" "}
            <span className="font-semibold text-stone-800">
              {(currentPage - 1) * itemsPerPage + 1}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-stone-800">
              {Math.min(
                currentPage * itemsPerPage,
                filteredAndSortedMarkets.length,
              )}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-stone-800">
              {filteredAndSortedMarkets.length}
            </span>{" "}
            markets
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8 w-8 rounded bg-white border border-stone-200 flex items-center justify-center text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-mono px-3 text-stone-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-8 w-8 rounded bg-white border border-stone-200 flex items-center justify-center text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
