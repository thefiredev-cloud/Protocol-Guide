/**
 * ThemeToggle Component
 *
 * A compact toggle for switching between light, dark, and system themes.
 * Designed for use in settings screens or navigation headers.
 */

import { View, Text, TouchableOpacity } from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeContext } from "@/lib/theme-provider";
import { useColors } from "@/hooks/use-colors";
import type { ColorScheme } from "@/constants/theme";

type ThemeOption = ColorScheme | "system";

type ThemeToggleProps = {
  /** Show labels next to icons */
  showLabels?: boolean;
  /** Compact mode shows only current theme with dropdown-style behavior */
  compact?: boolean;
};

const themeOptions: { value: ThemeOption; icon: string; label: string }[] = [
  { value: "light", icon: "sun.max.fill", label: "Light" },
  { value: "dark", icon: "moon.fill", label: "Dark" },
  { value: "system", icon: "gear", label: "System" },
];

export function ThemeToggle({ showLabels = false, compact = false }: ThemeToggleProps) {
  const { themePreference, setThemePreference, toggleTheme } = useThemeContext();
  const colors = useColors();

  // Compact mode: single button that cycles through options
  if (compact) {
    const currentOption = themeOptions.find((o) => o.value === themePreference) || themeOptions[1];

    return (
      <TouchableOpacity
        onPress={toggleTheme}
        style={{
          backgroundColor: colors.surface,
          padding: 12,
          borderRadius: 8,
          minWidth: 48,
          minHeight: 48,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        accessibilityLabel={`Theme: ${currentOption.label}. Tap to change.`}
        accessibilityRole="button"
      >
        <IconSymbol
          name={currentOption.icon as any}
          size={22}
          color={colors.primary}
        />
      </TouchableOpacity>
    );
  }

  // Full mode: show all options as segmented control
  return (
    <View
      className="flex-row rounded-xl p-1"
      style={{ backgroundColor: colors.surface }}
      accessibilityRole="radiogroup"
      accessibilityLabel="Theme selection"
    >
      {themeOptions.map((option) => {
        const isActive = themePreference === option.value;

        return (
          <TouchableOpacity
            key={option.value}
            onPress={() => setThemePreference(option.value)}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              paddingVertical: 12,
              paddingHorizontal: 12,
              minHeight: 48,
              backgroundColor: isActive ? colors.primary : "transparent",
            }}
            accessibilityRole="radio"
            accessibilityState={{ checked: isActive }}
            accessibilityLabel={option.label}
          >
            <IconSymbol
              name={option.icon as any}
              size={18}
              color={isActive ? colors.background : colors.muted}
            />
            {showLabels && (
              <Text
                style={{
                  color: isActive ? colors.background : colors.muted,
                  fontSize: 14,
                  fontWeight: '500',
                  marginLeft: 8,
                }}
              >
                {option.label}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default ThemeToggle;
