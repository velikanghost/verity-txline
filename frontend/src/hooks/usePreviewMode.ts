"use client";

import { useEffect, useSyncExternalStore } from "react";

const PREVIEW_SESSION_KEY = "verity-ui-preview";
const PREVIEW_CHANGE_EVENT = "verity:preview-mode-change";

const readStoredPreview = (): boolean => {
  try {
    return window.sessionStorage.getItem(PREVIEW_SESSION_KEY) === "1";
  } catch {
    return false;
  }
};

const getPreviewSnapshot = (): boolean => {
  if (typeof window === "undefined") return false;

  const value = new URLSearchParams(window.location.search).get("preview");
  if (value === "1") return true;
  if (value === "0") return false;
  return readStoredPreview();
};

const subscribeToPreviewMode = (onStoreChange: () => void) => {
  window.addEventListener(PREVIEW_CHANGE_EVENT, onStoreChange);
  window.addEventListener("popstate", onStoreChange);
  window.addEventListener("storage", onStoreChange);

  return () => {
    window.removeEventListener(PREVIEW_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("popstate", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
};

export function usePreviewMode(): boolean {
  const enabled = useSyncExternalStore(
    subscribeToPreviewMode,
    getPreviewSnapshot,
    () => false,
  );

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("preview");

    try {
      if (value === "1") {
        window.sessionStorage.setItem(PREVIEW_SESSION_KEY, "1");
      } else if (value === "0") {
        window.sessionStorage.removeItem(PREVIEW_SESSION_KEY);
      } else {
        return;
      }
      window.dispatchEvent(new Event(PREVIEW_CHANGE_EVENT));
    } catch {
      // Preview still follows the explicit URL when storage is unavailable.
    }
  }, []);

  return enabled;
}
