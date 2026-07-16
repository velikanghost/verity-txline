import { create } from "zustand";

export type AppTheme = "light" | "stadium";

export const THEME_STORAGE_KEY = "verity-ui-theme";

export function isAppTheme(value: unknown): value is AppTheme {
  return value === "light" || value === "stadium";
}

function applyDocumentTheme(theme: AppTheme) {
  if (typeof document === "undefined") return;

  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme =
    theme === "stadium" ? "dark" : "light";
}

interface ThemeStore {
  theme: AppTheme;
  hydrated: boolean;
  hydrate: () => void;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: "light",
  hydrated: false,

  hydrate: () => {
    const documentTheme =
      typeof document === "undefined"
        ? "light"
        : document.documentElement.dataset.theme;
    const theme = isAppTheme(documentTheme) ? documentTheme : "light";

    applyDocumentTheme(theme);
    set({ theme, hydrated: true });
  },

  setTheme: (theme) => {
    if (!isAppTheme(theme)) return;

    applyDocumentTheme(theme);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, theme);
      } catch {
        // Keep the in-memory and document theme usable when storage is blocked.
      }
    }
    set({ theme, hydrated: true });
  },

  toggleTheme: () => {
    get().setTheme(get().theme === "light" ? "stadium" : "light");
  },
}));
