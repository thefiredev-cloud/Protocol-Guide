/**
 * Accessibility Utilities
 *
 * Helper functions and constants for WCAG 2.1 AA/AAA compliance.
 * Provides utilities for ARIA labels, focus management, and color contrast.
 */

import { useRef, useEffect, useCallback, RefObject } from "react";
import { AccessibilityRole, Platform, AccessibilityInfo, findNodeHandle } from "react-native";

/**
 * WCAG 2.1 Color Contrast Ratios
 * AA: 4.5:1 for normal text, 3:1 for large text
 * AAA: 7:1 for normal text, 4.5:1 for large text
 */
export const CONTRAST_RATIOS = {
  AA_NORMAL: 4.5,
  AA_LARGE: 3.0,
  AAA_NORMAL: 7.0,
  AAA_LARGE: 4.5,
} as const;

/**
 * Calculate relative luminance for WCAG contrast calculations
 */
function getLuminance(hex: string): number {
  const rgb = parseInt(hex.slice(1), 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = (rgb >> 0) & 0xff;

  const rsRGB = r / 255;
  const gsRGB = g / 255;
  const bsRGB = b / 255;

  const rLinear = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const gLinear = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const bLinear = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Calculate contrast ratio between two colors (WCAG formula)
 */
export function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if color contrast meets WCAG AA standards
 */
export function meetsContrastAA(foreground: string, background: string, isLargeText = false): boolean {
  const ratio = getContrastRatio(foreground, background);
  return isLargeText ? ratio >= CONTRAST_RATIOS.AA_LARGE : ratio >= CONTRAST_RATIOS.AA_NORMAL;
}

/**
 * Check if color contrast meets WCAG AAA standards
 */
export function meetsContrastAAA(foreground: string, background: string, isLargeText = false): boolean {
  const ratio = getContrastRatio(foreground, background);
  return isLargeText ? ratio >= CONTRAST_RATIOS.AAA_LARGE : ratio >= CONTRAST_RATIOS.AAA_NORMAL;
}

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

/**
 * Common accessibility labels for EMS/medical app
 */
export const MEDICAL_A11Y_LABELS = {
  search: {
    input: "Search protocols",
    button: "Search for medical protocols",
    clear: "Clear search query",
    voiceSearch: "Start voice search",
    stopVoice: "Stop voice recording",
  },
  voice: {
    recording: "Recording your voice",
    processing: "Processing voice input",
    transcribing: "Transcribing speech to text",
    error: "Voice search failed",
    permission: "Microphone permission required",
  },
  navigation: {
    home: "Navigate to home screen",
    search: "Navigate to search screen",
    profile: "Navigate to profile screen",
    back: "Go back to previous screen",
    close: "Close current screen",
  },
  protocol: {
    view: "View protocol details",
    currency: "Protocol currency information",
    source: "View protocol source",
    relevance: "Protocol relevance score",
  },
  filter: {
    state: "Filter protocols by state",
    clear: "Clear state filter",
    apply: "Apply filter",
  },
} as const;

/**
 * Announce message to screen readers
 * For dynamic content updates
 */
export function announceForAccessibility(message: string) {
  if (Platform.OS === "web") {
    // Web: Use ARIA live region
    const liveRegion = document.getElementById("a11y-announcer");
    if (liveRegion) {
      liveRegion.textContent = message;
      // Clear after announcement
      setTimeout(() => {
        liveRegion.textContent = "";
      }, 1000);
    }
  } else {
    // React Native: Use native announcer
    const { AccessibilityInfo } = require("react-native");
    AccessibilityInfo.announceForAccessibility(message);
  }
}

/**
 * Focus management for keyboard navigation
 */
export class FocusManager {
  private focusableRefs: any[] = [];
  private currentIndex = 0;

  registerFocusable(ref: any) {
    this.focusableRefs.push(ref);
  }

  clearFocusables() {
    this.focusableRefs = [];
    this.currentIndex = 0;
  }

  focusNext() {
    this.currentIndex = (this.currentIndex + 1) % this.focusableRefs.length;
    this.focusCurrent();
  }

  focusPrevious() {
    this.currentIndex =
      (this.currentIndex - 1 + this.focusableRefs.length) % this.focusableRefs.length;
    this.focusCurrent();
  }

  focusFirst() {
    this.currentIndex = 0;
    this.focusCurrent();
  }

  focusLast() {
    this.currentIndex = this.focusableRefs.length - 1;
    this.focusCurrent();
  }

  private focusCurrent() {
    const ref = this.focusableRefs[this.currentIndex];
    if (ref?.current?.focus) {
      ref.current.focus();
    }
  }
}

/**
 * Focus trap hook for modals (WCAG 2.4.3)
 *
 * Traps keyboard focus within a modal when visible.
 * Supports ESC key to close on web.
 * Returns focus to trigger element on close.
 */
export interface UseFocusTrapOptions {
  visible: boolean;
  onClose: () => void;
  /** Allow ESC key to close modal (default: true) */
  allowEscapeClose?: boolean;
  /** Selector for first focusable element (web only) */
  initialFocusSelector?: string;
}

export interface UseFocusTrapReturn {
  /** Ref to attach to modal container */
  containerRef: React.RefObject<any>;
  /** Props to spread on modal container for a11y */
  containerProps: {
    accessible: boolean;
    accessibilityViewIsModal: boolean;
    accessibilityRole: AccessibilityRole;
  };
}

/**
 * Hook for managing focus trap within modals
 *
 * Usage:
 * ```tsx
 * const { containerRef, containerProps } = useFocusTrap({
 *   visible,
 *   onClose,
 * });
 *
 * return (
 *   <Modal visible={visible}>
 *     <View ref={containerRef} {...containerProps}>
 *       {content}
 *     </View>
 *   </Modal>
 * );
 * ```
 */
export function useFocusTrap(options: UseFocusTrapOptions): UseFocusTrapReturn {
  const { useRef, useEffect, useCallback } = require("react");

  const { visible, onClose, allowEscapeClose = true, initialFocusSelector } = options;

  const containerRef = useRef<any>(null);
  const previousActiveElementRef = useRef<Element | null>(null);

  // Handle ESC key press (web only)
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!visible) return;

      // ESC key closes modal
      if (event.key === "Escape" && allowEscapeClose) {
        event.preventDefault();
        onClose();
        return;
      }

      // Tab key traps focus within modal
      if (event.key === "Tab" && containerRef.current) {
        const focusableElements = containerRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        // Shift + Tab from first element -> focus last element
        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
        // Tab from last element -> focus first element
        else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    },
    [visible, onClose, allowEscapeClose]
  );

  // Focus management effect
  useEffect(() => {
    if (Platform.OS !== "web") return;

    if (visible) {
      // Store the previously focused element to restore later
      previousActiveElementRef.current = document.activeElement;

      // Add keydown listener for focus trapping
      document.addEventListener("keydown", handleKeyDown);

      // Focus first focusable element in modal
      setTimeout(() => {
        if (containerRef.current) {
          let elementToFocus: HTMLElement | null = null;

          // Try initial focus selector first
          if (initialFocusSelector) {
            elementToFocus = containerRef.current.querySelector(initialFocusSelector);
          }

          // Fall back to first focusable element
          if (!elementToFocus) {
            const focusableElements = containerRef.current.querySelectorAll(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            elementToFocus = focusableElements[0] as HTMLElement;
          }

          if (elementToFocus) {
            elementToFocus.focus();
          }
        }
      }, 100); // Small delay to ensure modal is rendered
    } else {
      // Modal closing - restore focus to previous element
      if (previousActiveElementRef.current && "focus" in previousActiveElementRef.current) {
        (previousActiveElementRef.current as HTMLElement).focus();
      }
    }

    return () => {
      if (Platform.OS === "web") {
        document.removeEventListener("keydown", handleKeyDown);
      }
    };
  }, [visible, handleKeyDown, initialFocusSelector]);

  // Native focus management (iOS/Android)
  useEffect(() => {
    if (Platform.OS === "web") return;

    if (visible && containerRef.current) {
      // Use React Native's AccessibilityInfo to set focus
      const { AccessibilityInfo, findNodeHandle } = require("react-native");
      const node = findNodeHandle(containerRef.current);
      if (node) {
        AccessibilityInfo.setAccessibilityFocus(node);
      }
    }
  }, [visible]);

  return {
    containerRef,
    containerProps: {
      accessible: true,
      accessibilityViewIsModal: true,
      accessibilityRole: "none" as AccessibilityRole,
    },
  };
}
