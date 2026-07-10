import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "../apiClient"

export interface WorldCupMarket {
  id: string
  question: string
  status: string
  fixtureId: number
  matchup: string | null
  statKey: number
  threshold: number | null
  comparison: number | null
  deadline: string
  yesCondition: string
  noCondition: string
  resolvedOutcome: string | null
  solanaMarketPda: string | null
  solanaCreateTxSig: string | null
  solanaResolveTxSig: string | null
  solanaSettled: boolean
}

export interface PoolState {
  yesPool: string
  noPool: string
  totalLpDeposits: string
  resolved: boolean
  voided: boolean
  winningSide: number
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
    mutationFn: (input: { marketId: string; side: number; amountUsdc: number }) =>
      apiRequest<{ txSig: string }>("/solana/stake", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: WC_KEY }),
  })
}

export function useAddLiquidityWorldCupMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { marketId: string; amountUsdc: number }) =>
      apiRequest<{ txSig: string }>("/solana/add-liquidity", {
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

export interface CreateWorldCupMarketInput {
  fixtureId: number
  statKey: number
  statPeriod: number
  threshold: number
  comparison: number
  question: string
  deadlineUnix: number
}

export function useCreateWorldCupMarketMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateWorldCupMarketInput) =>
      apiRequest<{ marketId: string; solanaMarketPda: string; solanaCreateTxSig: string }>(
        "/solana/admin/create-market",
        { method: "POST", body: JSON.stringify(input) },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: WC_KEY }),
  })
}
