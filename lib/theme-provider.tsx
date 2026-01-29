import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Appearance, View } from "react-native";
import { colorScheme as nativewindColorScheme, vars } from "nativewind";

import { SchemeColors, type ColorScheme } from "@/constants/theme";

const THEME_STORAGE_KEY = "protocol-guide-theme";

type ThemePreference = ColorScheme | "system";

type ThemeContextValue = {
  colorScheme: ColorScheme;
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
  toggleTheme: () => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

// Get stored theme preference from localStorage (web only)
function getStoredTheme(): ThemePreference | null {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return null;
  }
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch (_e) {
    // localStorage not available
  }
  return null;
}

// Store theme preference in localStorage (web only)
function storeTheme(preference: ThemePreference): void {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch (_e) {
    // localStorage not available
  }
}

// Get system color scheme preference
function getSystemScheme(): ColorScheme {
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return Appearance.getColorScheme() || "dark";
}

// Resolve theme preference to actual color scheme
function resolveScheme(preference: ThemePreference): ColorScheme {
  if (preference === "system") {
    return getSystemScheme();
  }
  return preference;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize with stored preference or default to dark
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>(() => {
    return getStoredTheme() || "dark";
  });
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(() => {
    const stored = getStoredTheme();
    return resolveScheme(stored || "dark");
  });

  const applyScheme = useCallback((scheme: ColorScheme) => {
    nativewindColorScheme.set(scheme);
    Appearance.setColorScheme?.(scheme);
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.dataset.theme = scheme;
      root.classList.toggle("dark", scheme === "dark");
      const palette = SchemeColors[scheme];
      Object.entries(palette).forEach(([token, colorValue]) => {
        root.style.setProperty(`--color-${token}`, colorValue as string);
      });
    }
  }, []);

  // Set theme preference and persist to storage
  const setThemePreference = useCallback((preference: ThemePreference) => {
    setThemePreferenceState(preference);
    storeTheme(preference);
    const resolved = resolveScheme(preference);
    setColorSchemeState(resolved);
    applyScheme(resolved);
  }, [applyScheme]);

  // Toggle between light and dark modes
  const toggleTheme = useCallback(() => {
    const newScheme: ColorScheme = colorScheme === "dark" ? "light" : "dark";
    setThemePreference(newScheme);
  }, [colorScheme, setThemePreference]);

  // Apply scheme on mount and listen for system preference changes
  useEffect(() => {
    applyScheme(colorScheme);

    // Listen for system preference changes when using "system" mode
    if (typeof window !== "undefined" && window.matchMedia && themePreference === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = (e: MediaQueryListEvent) => {
        const newScheme: ColorScheme = e.matches ? "dark" : "light";
        setColorSchemeState(newScheme);
        applyScheme(newScheme);
      };
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [applyScheme, colorScheme, themePreference]);

  const themeVariables = useMemo(
    () =>
      vars({
        "color-primary": SchemeColors[colorScheme].primary,
        "color-background": SchemeColors[colorScheme].background,
        "color-surface": SchemeColors[colorScheme].surface,
        "color-foreground": SchemeColors[colorScheme].foreground,
        "color-muted": SchemeColors[colorScheme].muted,
        "color-border": SchemeColors[colorScheme].border,
        "color-success": SchemeColors[colorScheme].success,
        "color-warning": SchemeColors[colorScheme].warning,
        "color-error": SchemeColors[colorScheme].error,
      }),
    [colorScheme],
  );

  const value = useMemo(
    () => ({
      colorScheme,
      themePreference,
      setThemePreference,
      toggleTheme,
    }),
    [colorScheme, themePreference, setThemePreference, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      <View style={[{ flex: 1 }, themeVariables]}>{children}</View>
    </ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeContext must be used within ThemeProvider");
  }
  return ctx;
}
