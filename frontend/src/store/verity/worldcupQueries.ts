import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "../apiClient"
import { usePreviewMode } from "@/hooks/usePreviewMode"

export interface WorldCupMarket {
  id: string
  question: string
  status: string
  /** Set when this market is part of a PvP slate — bets route to that event. */
  parentMarketId: string | null
  fixtureId: number
  matchup: string | null
  statKey: number
  outcomeCount: number
  /** Outcome labels in on-chain order (index 0 = default). */
  outcomes: string[]
  deadline: string
  yesCondition: string
  noCondition: string
  resolvedOutcome: string | null
  winningOutcomeIndex: number | null
  solanaMarketPda: string | null
  solanaCreateTxSig: string | null
  solanaResolveTxSig: string | null
  solanaSettled: boolean
}

export interface PoolState {
  /** USDC staked per outcome, in on-chain order (index 0 = default). */
  pools: string[]
  totalLpDeposits: string
  resolved: boolean
  voided: boolean
  winningOutcome: number
}

/** The caller's on-chain claim state for a single market. */
export interface MarketPosition {
  hasPosition: boolean
  claimed: boolean
  resolved: boolean
  voided: boolean
  winningOutcome: number | null
  /** USDC still owed to the caller (0 once claimed / if they lost). */
  claimableUsdc: number
  stakedUsdc: number
}

const WC_KEY = ["worldcup", "markets"]

export function useWorldCupMarketsQuery(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: WC_KEY,
    queryFn: () => apiRequest<WorldCupMarket[]>("/solana/markets"),
    enabled: options.enabled ?? true,
  })
}

export function usePoolStateQuery(marketId: string | null) {
  return useQuery({
    queryKey: ["worldcup", "pool", marketId],
    enabled: !!marketId,
    queryFn: () => apiRequest<PoolState>(`/solana/market/${marketId}/pool`),
  })
}

/**
 * The authenticated caller's claim state for a market. Only enabled once the
 * market is resolved (there's nothing to claim before that) and the user is
 * signed in. Drives the claim button / "Claimed" state on resolved cards.
 */
export function useMarketPositionQuery(
  marketId: string | null,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: ["worldcup", "position", marketId],
    enabled: !!marketId && (options.enabled ?? true),
    queryFn: () =>
      apiRequest<MarketPosition>(`/solana/market/${marketId}/position`),
  })
}

export function useStakeWorldCupMutation() {
  const qc = useQueryClient()
  const previewMode = usePreviewMode()
  return useMutation({
    mutationFn: (input: {
      marketId: string
      outcome: number
      amountUsdc: number
    }) => {
      if (previewMode) throw new Error("Sample preview is read-only.")
      return apiRequest<{ txSig: string }>("/solana/stake", {
        method: "POST",
        body: JSON.stringify(input),
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: WC_KEY }),
  })
}

export function useClaimWorldCupMutation() {
  const qc = useQueryClient()
  const previewMode = usePreviewMode()
  return useMutation({
    mutationFn: (input: { marketId: string }) => {
      if (previewMode) throw new Error("Sample preview is read-only.")
      return apiRequest<{ txSig: string }>("/solana/claim", {
        method: "POST",
        body: JSON.stringify(input),
      })
    },
    // Broad ["worldcup"] invalidation refreshes the market list, pool, and the
    // per-market position so the claim button flips to its "Claimed" state.
    onSuccess: () => qc.invalidateQueries({ queryKey: ["worldcup"] }),
  })
}
