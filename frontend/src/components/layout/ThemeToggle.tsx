"use client";

import { MoonStar, Sun } from "lucide-react";

import { useThemeStore } from "@/store/themeStore";

export default function ThemeToggle() {
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const isStadium = theme === "stadium";
  const nextThemeLabel = isStadium ? "Light" : "Stadium Dusk";

  return (
    <button
      aria-label={`Switch to ${nextThemeLabel} theme`}
      aria-pressed={isStadium}
      className="arcade-alert-button arcade-theme-toggle relative flex h-10 w-10 items-center justify-center rounded-[14px] border border-white/[0.09] bg-[#0b0f1a]/85 text-[#7b859f] transition-colors hover:text-white"
      onClick={toggleTheme}
      title={`Switch to ${nextThemeLabel}`}
      type="button"
    >
      {isStadium ? (
        <Sun aria-hidden="true" className="h-4 w-4" />
      ) : (
        <MoonStar aria-hidden="true" className="h-4 w-4" />
      )}
    </button>
  );
}
