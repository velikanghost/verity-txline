"use client"

import { useState } from "react"
import { User, Wallet } from "lucide-react"
import ProfileEditor from "@/components/profile/ProfileEditor"
import PortfolioDashboard from "@/components/porfolio/PortfolioDashboard"

type View = "profile" | "portfolio"

/**
 * Unified account surface: identity/activity (Profile) and holdings/positions
 * (Portfolio) behind one segmented toggle. Both /profile and /portfolio render
 * this; each just picks the initial view.
 */
export default function ProfilePortfolio({
  initialView = "profile",
}: {
  initialView?: View
}) {
  const [view, setView] = useState<View>(initialView)

  const tabs: { id: View; label: string; icon: React.ReactNode }[] = [
    { id: "profile", label: "Profile", icon: <User className="h-4 w-4" /> },
    {
      id: "portfolio",
      label: "Portfolio",
      icon: <Wallet className="h-4 w-4" />,
    },
  ]

  return (
    <div className="mx-auto w-full max-w-[960px]">
      {/* Segmented toggle */}
      <div className="pb-2 pt-3">
        <div className="inline-flex gap-1 rounded-xl border border-stone-200/60 bg-stone-100 p-1 dark:border-zinc-800/60 dark:bg-zinc-900">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-all clickable ${
                view === t.id
                  ? "bg-white text-charcoal-primary shadow-sm dark:bg-zinc-800 dark:text-white"
                  : "text-ash hover:text-charcoal-primary dark:hover:text-white"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {view === "profile" ? <ProfileEditor /> : <PortfolioDashboard />}
    </div>
  )
}
