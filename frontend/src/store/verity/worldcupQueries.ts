import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "../apiClient"

export interface WorldCupMarket {
  id: string
  question: string
  status: string
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

const WC_KEY = ["worldcup", "markets"]

export function useWorldCupMarketsQuery() {
  return useQuery({
    queryKey: WC_KEY,
    queryFn: () => apiRequest<WorldCupMarket[]>("/solana/markets"),
  })
}

export function usePoolStateQuery(marketId: string | null) {
  return useQuery({
    queryKey: ["worldcup", "pool", marketId],
    enabled: !!marketId,
    queryFn: () => apiRequest<PoolState>(`/solana/market/${marketId}/pool`),
  })
}

export function useStakeWorldCupMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { marketId: string; outcome: number; amountUsdc: number }) =>
      apiRequest<{ txSig: string }>("/solana/stake", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: WC_KEY }),
  })
}

export function useClaimWorldCupMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { marketId: string }) =>
      apiRequest<{ txSig: string }>("/solana/claim", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: WC_KEY }),
  })
}

