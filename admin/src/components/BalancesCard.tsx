"use client"

import { toast } from "react-hot-toast"
import { Wallet, Copy, Coins, RefreshCw } from "lucide-react"

interface BalancesCardProps {
  adminBalances: {
    adminAddress: string
    solBalance: number
    usdcBalance: number
  } | null
  contractBalances: {
    adminAddress: string
    solBalance: number
    usdcBalance: number
  } | null
  contractBalancesLoading: boolean
  onRefreshContractBalances: () => void
}

export default function BalancesCard({
  adminBalances,
  contractBalances,
  contractBalancesLoading,
  onRefreshContractBalances,
}: BalancesCardProps) {
  if (!adminBalances) return null

  function copyToClipboard(text: string) {
    void navigator.clipboard.writeText(text)
    toast.success("Address copied to clipboard!")
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
      {/* Admin Wallet Card */}
      <div className="p-5 bg-white border border-stone-200 rounded-2xl flex items-center gap-4 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full -mr-8 -mt-8 opacity-50 pointer-events-none" />
        <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shrink-0">
          <Wallet className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-indigo-700">
            Admin Wallet
          </h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="font-mono text-xs font-semibold text-stone-800 truncate block">
              {adminBalances.adminAddress}
            </span>
            <button
              type="button"
              onClick={() => copyToClipboard(adminBalances.adminAddress)}
              className="text-indigo-600 hover:text-indigo-800 p-1 rounded-md hover:bg-indigo-50 transition-colors cursor-pointer shrink-0"
              title="Copy Address"
            >
              <Copy className="h-3 w-3" />
            </button>
          </div>
          <div className="mt-1.5 flex items-baseline gap-3">
            <span className="font-mono text-base font-bold text-stone-900">
              {adminBalances.solBalance.toLocaleString(undefined, {
                minimumFractionDigits: 3,
                maximumFractionDigits: 3,
              })}{" "}
              SOL
              <span className="ml-1 text-[9px] font-semibold uppercase tracking-wide text-stone-400">
                gas
              </span>
            </span>
            <span className="font-mono text-sm font-semibold text-stone-500">
              {adminBalances.usdcBalance.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              USDC
            </span>
          </div>
        </div>
      </div>

      {/* Contract Balances Card */}
      <div className="p-5 bg-white border border-stone-200 rounded-2xl flex items-start gap-4 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full -mr-8 -mt-8 opacity-50 pointer-events-none" />
        <div className="h-10 w-10 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-md shrink-0">
          <Coins className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-amber-700">
              Keeper (Settlement Signer)
            </h3>
            <button
              onClick={onRefreshContractBalances}
              disabled={contractBalancesLoading}
              className="text-stone-400 hover:text-stone-600 p-1 rounded-md hover:bg-stone-50 transition-all cursor-pointer"
              title="Refresh keeper balances"
            >
              <RefreshCw className={`h-3 w-3 ${contractBalancesLoading ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-500 font-medium">SOL (gas):</span>
              <span className="font-mono font-semibold text-stone-900">
                {contractBalances ? (
                  `${contractBalances.solBalance.toLocaleString(undefined, {
                    minimumFractionDigits: 3,
                    maximumFractionDigits: 3,
                  })} SOL`
                ) : (
                  <span className="text-stone-300">...</span>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-500 font-medium">USDC:</span>
              <span className="font-mono font-semibold text-stone-900">
                {contractBalances ? (
                  `${contractBalances.usdcBalance.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} USDC`
                ) : (
                  <span className="text-stone-300">...</span>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
