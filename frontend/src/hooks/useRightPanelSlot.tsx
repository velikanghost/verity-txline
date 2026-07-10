"use client"

import { useEffect, type ReactNode } from "react"
import { create } from "zustand"

interface RightPanelSlotState {
  slotContent: ReactNode
  setSlotContent: (content: ReactNode) => void
  clearSlotContent: () => void
}

const useRightPanelSlotStore = create<RightPanelSlotState>((set) => ({
  slotContent: null,
  setSlotContent: (content) => set({ slotContent: content }),
  clearSlotContent: () => set({ slotContent: null }),
}))

/** Read the current slot content (used by the layout shell). */
export function useRightPanelSlot() {
  return useRightPanelSlotStore((s) => s.slotContent)
}

/** Set slot content from a page component. */
export function useSetRightPanelSlot(content: ReactNode, slotKey = "default") {
  const setSlotContent = useRightPanelSlotStore((s) => s.setSlotContent)
  const clearSlotContent = useRightPanelSlotStore((s) => s.clearSlotContent)

  useEffect(() => {
    setSlotContent(content)
  }, [setSlotContent, content, slotKey])

  useEffect(() => clearSlotContent, [clearSlotContent])
}
