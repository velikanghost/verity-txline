"use client"

import { useState } from "react"
import { apiRequest } from "@/store/apiClient"
import { toast } from "react-hot-toast"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Trophy, Clock, AlertTriangle, Info, ExternalLink } from "lucide-react"

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

interface ResolveMarketDrawerProps {
  isOpen: boolean
  onClose: () => void
  selectedMarketId: string | null
  markets: Market[]
  fetchMarkets: () => void
  fetchAdminStatus: () => void
  fetchMetricsData: () => void
  winningOutcome: string
  setWinningOutcome: (val: string) => void
  resolveTxHash: string
  setResolveTxHash: (val: string) => void
  adminAddress: string
  setAdminAddress: (val: string) => void
  now: number
}

export default function ResolveMarketDrawer({
  isOpen,
  onClose,
  selectedMarketId,
  markets,
  fetchMarkets,
  fetchAdminStatus,
  fetchMetricsData,
  winningOutcome,
  setWinningOutcome,
  resolveTxHash,
  setResolveTxHash,
  adminAddress,
  setAdminAddress,
  now,
}: ResolveMarketDrawerProps) {
  const [loading, setLoading] = useState(false)

  const selectedMarket = markets.find((m) => m.id === selectedMarketId)

  async function handleResolveMarket(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedMarketId) return
    setLoading(true)
    try {
      await apiRequest(`/markets/${selectedMarketId}/resolve`, {
        method: "POST",
        body: JSON.stringify({
          winningOutcome,
          txHash: resolveTxHash ? resolveTxHash.trim() : undefined,
          adminAddress: adminAddress.trim(),
        }),
      })
      toast.success("Market resolved successfully!")
      onClose()
      void fetchMarkets()
      void fetchAdminStatus()
      void fetchMetricsData()
    } catch (err: any) {
      toast.error(err.message || "Failed to resolve market.")
    } finally {
      setLoading(false)
    }
  }

  async function handleDisputeMarket(marketId: string) {
    setLoading(true)
    try {
      await apiRequest(`/markets/${marketId}/dispute`, {
        method: "POST",
        body: JSON.stringify({
          adminAddress: adminAddress.trim(),
        }),
      })
      toast.success("Market disputed successfully!")
      onClose()
      void fetchMarkets()
    } catch (err: any) {
      toast.error(err.message || "Failed to dispute market.")
    } finally {
      setLoading(false)
    }
  }

  if (!selectedMarket) return null

  const outcomes =
    selectedMarket.outcomes && selectedMarket.outcomes.length > 0
      ? selectedMarket.outcomes
      : ["YES", "NO"]

  const hasProposal = !!selectedMarket.proposalProposer

  // Countdown calculation
  const proposedTime = selectedMarket.proposedAt
    ? new Date(selectedMarket.proposedAt).getTime()
    : 0
  const disputeWindowSeconds = selectedMarket.disputeWindowSeconds ?? 120
  const endTime = proposedTime + disputeWindowSeconds * 1000
  const remainingMs = endTime - now
  const remainingSecs = Math.max(0, Math.floor(remainingMs / 1000))
  const isWindowActive = remainingSecs > 0

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}m ${s}s`
  }

  const getProposedOutcomeText = (market: Market) => {
    if (market.proposedOutcome === null || market.proposedOutcome === undefined)
      return "None"
    const opts =
      market.outcomes && market.outcomes.length > 0
        ? market.outcomes
        : ["YES", "NO"]
    return market.proposedOutcome ? opts[0] || "YES" : opts[1] || "NO"
  }

  return (
    <Drawer
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      direction="right"
    >
      <DrawerContent className="p-6 h-full flex flex-col bg-white border-l border-stone-200 data-[vaul-drawer-direction=right]:sm:max-w-2xl">
        <DrawerHeader className="px-0">
          <DrawerTitle className="text-lg font-bold text-stone-900 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Arbitrate Settle Prediction Market
          </DrawerTitle>
          <DrawerDescription className="text-xs text-stone-500">
            Settle the resolution of a prediction market on-chain to distribute
            pools to winning selectors, or dispute a pending AI agent
            resolution.
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1 mt-4">
          {/* General market details */}
          <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 flex flex-col gap-1.5 text-xs">
            <span className="font-bold text-[10px] text-stone-400 uppercase tracking-wider">
              Market Question
            </span>
            <div className="font-bold text-stone-900 text-sm leading-snug">
              {selectedMarket.question}
            </div>
            <div className="text-[10px] text-stone-500 font-mono mt-1">
              ID: {selectedMarket.id}
            </div>
            <div className="text-[10px] text-stone-500 font-mono">
              Category: {selectedMarket.category}
            </div>
            <div className="text-[10px] text-stone-500 font-mono">
              Deadline: {new Date(selectedMarket.deadline).toLocaleString()}
            </div>
          </div>

          {/* Proposal Details Card */}
          {hasProposal && (
            <div className="border border-indigo-100 bg-indigo-50/20 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                <span className="text-xs font-bold text-indigo-700 flex items-center gap-1">
                  <Info className="h-3.5 w-3.5" /> LLM Proposal Details
                </span>
                <span className="text-[9px] font-mono text-stone-400">
                  Oracle Proposer: {selectedMarket.proposalProposer}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-stone-400 block text-[9px] uppercase font-bold tracking-wider">
                    Proposed Outcome
                  </span>
                  <span className="font-bold text-stone-900">
                    {getProposedOutcomeText(selectedMarket)}
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[9px] uppercase font-bold tracking-wider">
                    Proposed At
                  </span>
                  <span className="font-bold text-stone-900">
                    {selectedMarket.proposedAt
                      ? new Date(selectedMarket.proposedAt).toLocaleTimeString()
                      : "N/A"}
                  </span>
                </div>
              </div>

              {selectedMarket.proposalReasoning && (
                <div className="text-xs">
                  <span className="text-stone-400 block text-[9px] uppercase font-bold tracking-wider mb-1">
                    Reasoning
                  </span>
                  <p className="text-stone-700 leading-relaxed font-sans bg-white p-3 rounded-lg border border-stone-150">
                    {selectedMarket.proposalReasoning}
                  </p>
                </div>
              )}

              {selectedMarket.proposalCitations &&
                selectedMarket.proposalCitations.length > 0 && (
                  <div className="text-xs">
                    <span className="text-stone-400 block text-[9px] uppercase font-bold tracking-wider mb-1">
                      Citations
                    </span>
                    <ul className="list-disc pl-4 text-stone-500 space-y-1">
                      {selectedMarket.proposalCitations.map((citation, i) => {
                        const isUrl =
                          citation.startsWith("http://") ||
                          citation.startsWith("https://")
                        return (
                          <li key={i} className="truncate max-w-[320px]">
                            {isUrl ? (
                              <a
                                href={citation}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-600 hover:text-indigo-800 underline inline-flex items-center gap-0.5"
                              >
                                {citation}{" "}
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            ) : (
                              citation
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}

              {/* Dispute Window Countdown and Action */}
              <div className="border-t border-indigo-100 pt-3 mt-1 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-500 flex items-center gap-1 font-semibold">
                    <Clock className="h-3.5 w-3.5" /> Dispute Window:
                  </span>
                  {selectedMarket.disputed ? (
                    <span className="text-red-600 font-bold flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" /> DISPUTED
                    </span>
                  ) : isWindowActive ? (
                    <span className="text-amber-600 font-bold bg-amber-100/50 px-2 py-0.5 rounded">
                      ACTIVE ({formatCountdown(remainingSecs)})
                    </span>
                  ) : (
                    <span className="text-stone-400 font-bold">CLOSED</span>
                  )}
                </div>

                {selectedMarket.disputed ? (
                  <div className="bg-red-50 text-red-700 p-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-red-200">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>
                      This proposal is disputed (Disputer:{" "}
                      {selectedMarket.proposalDisputer}). Settle manually below.
                    </span>
                  </div>
                ) : isWindowActive ? (
                  <Button
                    type="button"
                    onClick={() => handleDisputeMarket(selectedMarket.id)}
                    disabled={loading}
                    className="w-full h-9 bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-wider text-[10px] shadow-sm flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" /> Dispute LLM
                    Proposal
                  </Button>
                ) : (
                  <div className="bg-stone-50 text-stone-500 p-2.5 rounded-lg text-[11px] border border-stone-200/50">
                    Dispute window has closed. You can now finalize resolution
                    below using the proposed outcome or publish your own manual
                    arbitrated outcome.
                  </div>
                )}
              </div>
            </div>
          )}

          <form
            onSubmit={handleResolveMarket}
            className="flex flex-col gap-4 border-t border-stone-150 pt-4 mt-1"
          >
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Select Winning Outcome
              </label>
              <div className="flex flex-wrap gap-2">
                {outcomes.map((outcome) => {
                  const isSelected = winningOutcome === outcome
                  return (
                    <button
                      key={outcome}
                      type="button"
                      onClick={() => setWinningOutcome(outcome)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
                        isSelected
                          ? "bg-amber-500 border-amber-500 text-white shadow-sm"
                          : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50 cursor-pointer"
                      }`}
                    >
                      Settle as "{outcome}"
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                On-Chain Settlement TX Hash (Optional)
              </label>
              <input
                type="text"
                value={resolveTxHash}
                onChange={(e) => setResolveTxHash(e.target.value)}
                placeholder="0x..."
                className="w-full h-11 px-3 border border-stone-200 bg-white font-mono text-[11px] rounded-[10px] outline-none focus:border-amber-500 transition-colors"
              />
              <p className="text-[10px] text-stone-400">
                If left blank, the backend submits resolution on-chain using the
                admin wallet key automatically.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Fee Collector / Admin Wallet Address
              </label>
              <input
                type="text"
                required
                value={adminAddress}
                onChange={(e) => setAdminAddress(e.target.value)}
                className="w-full h-11 px-3 border border-stone-200 bg-white font-mono text-[11px] rounded-[10px] outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 pt-4 border-t border-stone-100">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 h-11 border border-stone-200 text-stone-700 text-xs font-semibold uppercase tracking-wider rounded-lg cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-2 h-11 bg-amber-500 hover:bg-amber-600 text-white font-bold uppercase tracking-wider text-xs shadow-md disabled:opacity-50 cursor-pointer transition-colors"
              >
                {loading ? "Settling Pool..." : "Confirm Settlement"}
              </Button>
            </div>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
