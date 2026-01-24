/**
 * Accessibility Props Builders
 *
 * Helper functions for creating WCAG-compliant accessibility props
 * for React Native components.
 */

import { AccessibilityRole, Platform } from "react-native";

/**
 * Accessibility props for interactive elements
 */
export interface A11yProps {
  accessible?: boolean;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityState?: {
    disabled?: boolean;
    selected?: boolean;
    checked?: boolean | "mixed";
    busy?: boolean;
    expanded?: boolean;
  };
  accessibilityValue?: {
    min?: number;
    max?: number;
    now?: number;
    text?: string;
  };
  accessibilityActions?: { name: string; label?: string }[];
  accessibilityLiveRegion?: "none" | "polite" | "assertive";
}

/**
 * Create ARIA-compliant props for buttons
 */
export function createButtonA11y(label: string, hint?: string, disabled = false): A11yProps {
  return {
    accessible: true,
    accessibilityRole: "button",
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityState: { disabled },
  };
}

/**
 * Create ARIA-compliant props for text inputs
 */
export function createTextInputA11y(
  label: string,
  hint?: string,
  required = false
): A11yProps {
  return {
    accessible: true,
    accessibilityLabel: label,
    accessibilityHint: hint || (required ? "Required field" : undefined),
  };
}

/**
 * Create ARIA-compliant props for search inputs
 */
export function createSearchA11y(label = "Search", hint?: string): A11yProps {
  return {
    accessible: true,
    accessibilityRole: "search",
    accessibilityLabel: label,
    accessibilityHint: hint || "Enter search terms and press search",
  };
}

/**
 * Create ARIA-compliant props for lists
 */
export function createListA11y(itemCount: number, label?: string): A11yProps {
  return {
    accessible: true,
    accessibilityRole: "list",
    accessibilityLabel: label,
    accessibilityHint: `Contains ${itemCount} ${itemCount === 1 ? "item" : "items"}`,
  };
}

/**
 * Create ARIA-compliant props for tabs
 */
export function createTabA11y(
  label: string,
  selected: boolean,
  index: number,
  total: number
): A11yProps {
  return {
    accessible: true,
    accessibilityRole: "tab",
    accessibilityLabel: label,
    accessibilityHint: `Tab ${index + 1} of ${total}`,
    accessibilityState: { selected },
  };
}

/**
 * Create ARIA-compliant props for live regions
 */
export function createLiveRegionA11y(
  text: string,
  priority: "polite" | "assertive" = "polite"
): A11yProps {
  return {
    accessible: true,
    accessibilityLabel: text,
    accessibilityLiveRegion: priority,
  };
}

/**
 * Create ARIA-compliant props for status messages
 */
export function createStatusA11y(
  status: string,
  type: "info" | "success" | "warning" | "error" = "info"
): A11yProps {
  const roleMap = {
    info: "text" as AccessibilityRole,
    success: "text" as AccessibilityRole,
    warning: "alert" as AccessibilityRole,
    error: "alert" as AccessibilityRole,
  };

  return {
    accessible: true,
    accessibilityRole: roleMap[type],
    accessibilityLabel: status,
    accessibilityLiveRegion: type === "error" || type === "warning" ? "assertive" : "polite",
  };
}

/**
 * Platform-specific keyboard navigation hints
 */
export const KEYBOARD_HINTS = {
  button: Platform.select({
    web: "Press Enter or Space to activate",
    default: "Double tap to activate",
  }),
  link: Platform.select({
    web: "Press Enter to navigate",
    default: "Double tap to open",
  }),
  input: Platform.select({
    web: "Type to enter text, Tab to move to next field",
    default: "Double tap to edit",
  }),
  search: Platform.select({
    web: "Type your search query and press Enter",
    default: "Double tap to search",
  }),
} as const;
