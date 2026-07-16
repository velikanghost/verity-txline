"use client"

import { useAuth } from "@/components/providers/AuthModals"
import { useUsdcBalance } from "@/hooks/useUsdcBalance"
import { shortAddress } from "@/lib/solana"
import { displayHandle, displayName as getDisplayName } from "@/lib/verity"
import { LogIn, LogOut, Copy, Check, Wallet } from "lucide-react"
import { useState } from "react"
import { toast } from "@/lib/toast"
import Link from "next/link"

export default function SidebarProfile() {
  const { user, authenticated, loading, login, logout } = useAuth()
  const { formattedBalance, isLoading: isBalanceLoading } = useUsdcBalance()
  const [copied, setCopied] = useState(false)

  if (loading) {
    return (
      <div className="verity-card animate-pulse p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-stone-surface" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 rounded bg-stone-surface" />
            <div className="h-3 w-5/6 rounded bg-stone-surface" />
          </div>
        </div>
      </div>
    )
  }

  if (!authenticated || !user) {
    return (
      <button
        aria-label="Log in"
        className="sidebar-login-button flex h-11 w-full items-center justify-center gap-2 px-2 font-game text-sm font-black text-white transition-all hover:-translate-y-0.5 cursor-pointer xl:px-4"
        onClick={login}
        type="button"
      >
        <LogIn className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="hidden xl:inline">Log in</span>
      </button>
    )
  }

  const walletAddr = user.walletAddress || ""
  const displayAddress = shortAddress(walletAddr)

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!walletAddr) return
    navigator.clipboard.writeText(walletAddr)
    setCopied(true)
    toast.success("Address copied!")
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="sidebar-account-card verity-card flex flex-col items-center gap-2 border border-border bg-surface-solid p-2 shadow-subtle xl:items-stretch xl:gap-3 xl:p-4">
      {/* Top Section: Avatar, User Details, Logout */}
      <div className="flex flex-col items-center gap-2 xl:flex-row xl:justify-between">
        <Link
          href="/profile"
          className="flex items-center gap-3 min-w-0 hover:opacity-85 transition-opacity"
        >
          <div className="verity-blob h-10 w-10 bg-sky-blue shrink-0">
            <span className="verity-blob-smile" />
          </div>
          <div className="hidden xl:flex flex-col min-w-0">
            <span className="text-sm font-semibold tracking-[-0.18px] text-charcoal-primary truncate">
              {getDisplayName(user)}
            </span>
            <span className="font-mono text-xs text-ash truncate">
              {displayHandle(user)}
            </span>
          </div>
        </Link>
        <button
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ash hover:bg-stone-surface hover:text-coral-red transition-colors cursor-pointer shrink-0"
          onClick={logout}
          title="Sign out"
          type="button"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>

      <div
        className="sidebar-compact-balance flex w-full flex-col items-center gap-1 rounded-lg px-1.5 py-1.5 font-mono text-[8px] font-black xl:hidden"
        title={isBalanceLoading ? "Loading USDC balance" : `${formattedBalance} USDC`}
      >
        <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="max-w-full truncate">
          {isBalanceLoading ? "..." : `$${formattedBalance}`}
        </span>
      </div>

      <div className="hidden xl:block h-px bg-stone-surface" />

      {/* Bottom Section: Wallet Address & Balance (Only visible on wide layout) */}
      <div className="hidden xl:flex items-center justify-between gap-2">
        {/* Wallet Address (Click to copy) */}
        <button
          className="flex items-center gap-1.5 font-mono text-xs text-ash hover:text-charcoal-primary transition-colors cursor-pointer min-w-0"
          onClick={handleCopy}
          title="Click to copy address"
        >
          <span className="truncate">{displayAddress}</span>
          {copied ? (
            <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />
          ) : (
            <Copy className="h-3.5 w-3.5 shrink-0" />
          )}
        </button>

        {/* Balance */}
        <div className="flex shrink-0 items-center gap-1 font-mono text-xs font-bold text-charcoal-primary">
          <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
          {isBalanceLoading ? "..." : `${formattedBalance} USDC`}
        </div>
      </div>
    </div>
  )
}
