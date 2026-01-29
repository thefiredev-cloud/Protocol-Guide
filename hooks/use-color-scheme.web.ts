import { useContext, useEffect, useState } from "react";
import { ThemeContext } from "@/lib/theme-provider";

/**
 * Web-specific color scheme hook.
 * Uses ThemeContext to ensure consistency between:
 * - CSS variables (set by ThemeProvider)
 * - useColors() hook colors (returned based on this hook)
 *
 * Previously used useRNColorScheme which caused a mismatch where
 * CSS variables were dark mode but useColors() returned light mode colors,
 * resulting in invisible text (light text on light background).
 *
 * Falls back to reading from DOM during SSR/initial hydration.
 */
export function useColorScheme() {
  const ctx = useContext(ThemeContext);
  const [fallbackScheme, setFallbackScheme] = useState<"light" | "dark">("dark");

  // During SSR or before hydration, read from DOM if available
  useEffect(() => {
    if (!ctx && typeof document !== "undefined") {
      const theme = document.documentElement.dataset.theme;
      if (theme === "light" || theme === "dark") {
        setFallbackScheme(theme);
      }
    }
  }, [ctx]);

  // Prefer context value, fall back to DOM-based or default
  return ctx?.colorScheme ?? fallbackScheme;
}
