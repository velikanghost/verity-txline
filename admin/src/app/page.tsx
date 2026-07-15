"use client"

import { useState, useEffect } from "react"
import { apiRequest } from "@/store/apiClient"
import { io } from "socket.io-client"
import { toast } from "react-hot-toast"
import { LogOut, BarChart4, Store } from "lucide-react"

// Import modular sub-components
import LoginPanel from "@/components/LoginPanel"
import BalancesCard from "@/components/BalancesCard"
import MetricsTab from "@/components/MetricsTab"
import MarketsAdmin from "@/components/MarketsAdmin"

interface AdminMetrics {
  users: {
    total: number
    real: number
    bots: number
  }
  pvpUsers: {
    submitted: {
      total: number
      real: number
      bots: number
    }
    played: {
      total: number
      real: number
      bots: number
    }
  }
  pvpMatchesCount: number
  volumeAndFees: {
    overallVolume: number
    overallFees: number
    standardVolume: number
    standardFees: number
    pvpVolume: number
    pvpFees: number
    creationFeesCollected: number
    combinedFees: number
  }
  recentTrades: {
    marketId: string
    marketQuestion: string
    amountUsdc: number
    createdAt: string
  }[]
  activityTimeline: {
    label: string
    signups: number
    trades: number
    tickets: number
  }[]
}

export default function AdminPage() {
  const [token, setToken] = useState("")
  const [isAuthorized, setIsAuthorized] = useState(false)

  const [activeTab, setActiveTab] = useState<"markets" | "metrics">("markets")

  // Admin Wallet & Balance State
  const [adminBalances, setAdminBalances] = useState<{
    adminAddress: string
    solBalance: number
    usdcBalance: number
  } | null>(null)

  // Contract Balances State
  const [contractBalances, setContractBalances] = useState<{
    adminAddress: string
    solBalance: number
    usdcBalance: number
  } | null>(null)
  const [contractBalancesLoading, setContractBalancesLoading] = useState(false)

  // Metrics Data State
  const [metricsData, setMetricsData] = useState<AdminMetrics | null>(null)
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [metricsTimeframe, setMetricsTimeframe] = useState<string>("7d")

  // Fetch admin status/balances
  async function fetchAdminStatus() {
    try {
      const data = await apiRequest<any>("/pvp/admin-status")
      setAdminBalances(data)
    } catch (err: any) {
      console.error("Failed to fetch admin status/balances:", err)
    }
  }

  // Fetch metrics data
  async function fetchMetricsData(timeframe?: string) {
    setMetricsLoading(true)
    try {
      const tf = timeframe || metricsTimeframe
      const data = await apiRequest<AdminMetrics>(
        `/pvp/admin-metrics?timeframe=${tf}`,
      )
      setMetricsData(data)
    } catch (err: any) {
      toast.error(err.message || "Failed to load admin metrics.")
    } finally {
      setMetricsLoading(false)
    }
  }

  // Fetch contract balances
  async function fetchContractBalances() {
    setContractBalancesLoading(true)
    try {
      const data = await apiRequest<any>("/pvp/contract-balances")
      setContractBalances(data)
    } catch (err: any) {
      console.error("Failed to fetch contract balances:", err)
    } finally {
      setContractBalancesLoading(false)
    }
  }

  // Check auth on load
  useEffect(() => {
    const storedToken = localStorage.getItem("verity_admin_auth_token")
    if (storedToken) {
      setToken(storedToken)
      setIsAuthorized(true)
      void fetchAdminStatus()
      void fetchMetricsData()
      void fetchContractBalances()
    }
  }, [])

  // Re-fetch metrics when timeframe changes
  useEffect(() => {
    if (isAuthorized) {
      void fetchMetricsData(metricsTimeframe)
    }
  }, [metricsTimeframe, isAuthorized])

  // Real-time socket updates listener
  useEffect(() => {
    if (!isAuthorized) return

    const socketUrl =
      process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ||
      "http://localhost:5080"
    const socket = io(`${socketUrl}/socket`, {
      transports: ["websocket"],
    })

    socket.on("connect", () => {
      socket.emit("join-room", "feed")
    })

    socket.on("feed-updated", () => {
      void fetchMetricsData()
      void fetchAdminStatus()
      void fetchContractBalances()
    })

    return () => {
      socket.disconnect()
    }
  }, [isAuthorized, metricsTimeframe])

  function handleLogOut() {
    localStorage.removeItem("verity_admin_auth_token")
    setIsAuthorized(false)
    setToken("")
    toast.success("Logged out successfully.")
  }

  const handleAuthSuccess = () => {
    void fetchAdminStatus()
    void fetchMetricsData()
    void fetchContractBalances()
  }

  if (!isAuthorized) {
    return (
      <LoginPanel
        token={token}
        setToken={setToken}
        setIsAuthorized={setIsAuthorized}
        onSuccess={handleAuthSuccess}
      />
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900 font-sans">
      {/* Navbar Header */}
      <header className="border-b border-stone-200 bg-white sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-indigo-600 text-white font-bold text-lg shadow-sm">
                V
              </div>
              <div>
                <h1 className="font-bold text-sm leading-tight text-stone-900">
                  Verity Console
                </h1>
                <span className="text-[10px] font-mono text-stone-500 uppercase tracking-wider">
                  Admin Platform
                </span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab("markets")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  activeTab === "markets"
                    ? "bg-white text-stone-950 shadow-xs"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <Store className="h-3.5 w-3.5" />
                Markets
              </button>
              <button
                onClick={() => setActiveTab("metrics")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  activeTab === "metrics"
                    ? "bg-white text-stone-950 shadow-xs"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <BarChart4 className="h-3.5 w-3.5" />
                Metrics
              </button>
            </nav>
          </div>

          <button
            onClick={handleLogOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-all font-mono text-xs text-stone-500 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 py-6 flex flex-col gap-6 flex-1 w-full">
        {/* Balances Top Row */}
        <BalancesCard
          adminBalances={adminBalances}
          contractBalances={contractBalances}
          contractBalancesLoading={contractBalancesLoading}
          onRefreshContractBalances={fetchContractBalances}
        />

        {/* Tab content */}
        {activeTab === "markets" && <MarketsAdmin />}
        {activeTab === "metrics" && (
          <MetricsTab
            metricsLoading={metricsLoading}
            metricsData={metricsData}
            fetchMetricsData={fetchMetricsData}
            timeframe={metricsTimeframe}
            setTimeframe={setMetricsTimeframe}
            contractBalances={contractBalances}
            contractBalancesLoading={contractBalancesLoading}
          />
        )}
      </main>
    </div>
  )
}
