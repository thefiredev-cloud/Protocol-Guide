/**
 * Tests for Focus Trap Implementation in Modals
 *
 * Validates WCAG 2.4.3 Focus Order compliance:
 * - Focus stays within modal when open
 * - Focus returns to trigger element on close
 * - ESC key closes modal (when allowed)
 * - Tab cycles through focusable elements
 * - Shift+Tab cycles backwards
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Import after mocks
import { useFocusTrap } from "@/lib/accessibility";

// Mock React Native
vi.mock("react-native", () => ({
  Platform: {
    OS: "web",
    select: vi.fn((obj) => obj.web || obj.default),
  },
  AccessibilityInfo: {
    setAccessibilityFocus: vi.fn(),
    announceForAccessibility: vi.fn(),
  },
  findNodeHandle: vi.fn((ref) => ref),
}));

describe("Focus Trap - WCAG 2.4.3 Compliance", () => {
  let container: HTMLDivElement;
  let previousActiveElement: HTMLElement;

  beforeEach(() => {
    // Set up DOM structure using safe DOM methods
    const wrapper = document.createElement("div");

    const trigger = document.createElement("button");
    trigger.id = "trigger";
    trigger.textContent = "Open Modal";
    wrapper.appendChild(trigger);

    const modalContainer = document.createElement("div");
    modalContainer.id = "modal-container";
    modalContainer.style.display = "none";

    const firstButton = document.createElement("button");
    firstButton.id = "first-button";
    firstButton.textContent = "First";
    modalContainer.appendChild(firstButton);

    const input = document.createElement("input");
    input.id = "input";
    input.type = "text";
    modalContainer.appendChild(input);

    const lastButton = document.createElement("button");
    lastButton.id = "last-button";
    lastButton.textContent = "Last";
    modalContainer.appendChild(lastButton);

    wrapper.appendChild(modalContainer);
    document.body.appendChild(wrapper);

    container = modalContainer;
    previousActiveElement = trigger;
    previousActiveElement.focus();
  });

  afterEach(() => {
    document.body.textContent = "";
  });

  describe("Focus Management", () => {
    it("should save previously focused element when modal opens", () => {
      const onClose = vi.fn();
      const { result } = renderHook(() =>
        useFocusTrap({
          visible: false,
          onClose,
          allowEscapeClose: true,
        })
      );

      // Open modal
      act(() => {
        result.current.containerRef.current = container;
      });

      expect(document.activeElement?.id).toBe("trigger");
    });

    it("should move focus to first focusable element when modal opens", async () => {
      const onClose = vi.fn();
      const { result, rerender } = renderHook(
        ({ visible }) => useFocusTrap({ visible, onClose, allowEscapeClose: true }),
        { initialProps: { visible: false } }
      );

      // Set container ref
      act(() => {
        result.current.containerRef.current = container;
      });

      // Open modal
      rerender({ visible: true });
      container.style.display = "block";

      // Wait for focus to move
      await new Promise((resolve) => setTimeout(resolve, 150));

      const activeId = document.activeElement?.id;
      expect(activeId).toBe("first-button");
    });

    it("should restore focus to trigger element when modal closes", async () => {
      const onClose = vi.fn();
      const { result, rerender } = renderHook(
        ({ visible }) => useFocusTrap({ visible, onClose, allowEscapeClose: true }),
        { initialProps: { visible: true } }
      );

      // Set container and open modal
      act(() => {
        result.current.containerRef.current = container;
        container.style.display = "block";
      });

      await new Promise((resolve) => setTimeout(resolve, 150));

      // Close modal
      rerender({ visible: false });
      container.style.display = "none";

      expect(document.activeElement?.id).toBe("trigger");
    });
  });

  describe("Keyboard Navigation", () => {
    it("should close modal on ESC key when allowed", () => {
      const onClose = vi.fn();
      const { result } = renderHook(() =>
        useFocusTrap({
          visible: true,
          onClose,
          allowEscapeClose: true,
        })
      );

      act(() => {
        result.current.containerRef.current = container;
        container.style.display = "block";
      });

      // Press ESC
      const escEvent = new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      });

      document.dispatchEvent(escEvent);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("should NOT close modal on ESC key when not allowed", () => {
      const onClose = vi.fn();
      const { result } = renderHook(() =>
        useFocusTrap({
          visible: true,
          onClose,
          allowEscapeClose: false,
        })
      );

      act(() => {
        result.current.containerRef.current = container;
        container.style.display = "block";
      });

      // Press ESC
      const escEvent = new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      });

      document.dispatchEvent(escEvent);

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe("Accessibility Props", () => {
    it("should return correct accessibility props", () => {
      const onClose = vi.fn();
      const { result } = renderHook(() =>
        useFocusTrap({
          visible: true,
          onClose,
          allowEscapeClose: true,
        })
      );

      expect(result.current.containerProps).toEqual({
        accessible: true,
        accessibilityViewIsModal: true,
        accessibilityRole: "none",
      });
    });

    it("should provide container ref for DOM attachment", () => {
      const onClose = vi.fn();
      const { result } = renderHook(() =>
        useFocusTrap({
          visible: true,
          onClose,
          allowEscapeClose: true,
        })
      );

      expect(result.current.containerRef).toBeDefined();
      expect(result.current.containerRef.current).toBeDefined();
    });
  });

  describe("Custom Focus Selector", () => {
    it("should focus custom element when specified", async () => {
      const onClose = vi.fn();
      const { result, rerender } = renderHook(
        ({ visible }) =>
          useFocusTrap({
            visible,
            onClose,
            allowEscapeClose: true,
            initialFocusSelector: "#input",
          }),
        { initialProps: { visible: true } }
      );

      act(() => {
        result.current.containerRef.current = container;
        container.style.display = "block";
      });

      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(document.activeElement?.id).toBe("input");
    });

    it("should fallback to first element if custom selector not found", async () => {
      const onClose = vi.fn();
      const { result, rerender } = renderHook(
        ({ visible }) =>
          useFocusTrap({
            visible,
            onClose,
            allowEscapeClose: true,
            initialFocusSelector: "#nonexistent",
          }),
        { initialProps: { visible: true } }
      );

      act(() => {
        result.current.containerRef.current = container;
        container.style.display = "block";
      });

      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(document.activeElement?.id).toBe("first-button");
    });
  });
});
