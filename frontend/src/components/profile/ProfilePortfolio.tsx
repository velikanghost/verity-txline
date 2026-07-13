"use client";

import { useState } from "react";
import { User, Wallet } from "lucide-react";
import ProfileEditor from "@/components/profile/ProfileEditor";
import PortfolioDashboard from "@/components/porfolio/PortfolioDashboard";

type View = "profile" | "portfolio";

/**
 * Unified account surface: identity/activity (Profile) and holdings/positions
 * (Portfolio) behind one segmented toggle. Both /profile and /portfolio render
 * this; each just picks the initial view.
 */
export default function ProfilePortfolio({
  initialView = "profile",
}: {
  initialView?: View;
}) {
  const [view, setView] = useState<View>(initialView);

  const tabs: { id: View; label: string; icon: React.ReactNode }[] = [
    {
      id: "profile",
      label: "Player Card",
      icon: <User className="h-4 w-4" />,
    },
    {
      id: "portfolio",
      label: "Vault",
      icon: <Wallet className="h-4 w-4" />,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[960px]">
      {/* Segmented toggle */}
      <div className="pb-2 pt-3">
        <div className="inline-flex gap-1 rounded-2xl border border-white/10 bg-[#0b0f20]/80 p-1.5 shadow-[0_10px_35px_rgba(4,6,18,.18)]">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              className={`font-game flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black transition-all clickable ${
                view === t.id
                  ? "bg-gradient-to-r from-[#1479ff] to-[#0862d3] text-white shadow-[0_7px_20px_rgba(20,121,255,.24)]"
                  : "text-ash hover:bg-white/[0.05] hover:text-white"
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
  );
}
