import { useEffect, useRef } from "react";
import {
  Modal as RNModal,
  View,
  Text,
  Pressable,
  Animated,
  AccessibilityInfo,
  Platform,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { spacing, radii, durations, opacity, touchTargets } from "@/lib/design-tokens";
import { useFocusTrap } from "@/lib/accessibility";

export interface ModalButton {
  /** Button label text */
  label: string;
  /** Called when button is pressed */
  onPress: () => void;
  /** Button style variant */
  variant?: 'primary' | 'secondary' | 'destructive';
  /** Whether button is disabled */
  disabled?: boolean;
  /** Test ID for testing */
  testID?: string;
}

export interface ModalProps {
  /** Whether modal is visible */
  visible: boolean;
  /** Called when modal is dismissed (backdrop press, hardware back) */
  onDismiss: () => void;
  /** Modal title text */
  title: string;
  /** Modal message/body text */
  message?: string;
  /** Action buttons array */
  buttons?: ModalButton[];
  /** Modal variant - controls default button configuration */
  variant?: 'alert' | 'confirm';
  /** Custom content to render instead of message */
  children?: React.ReactNode;
  /** Test ID for the modal container */
  testID?: string;
  /** Whether to close on backdrop press (default: true for alerts) */
  dismissOnBackdrop?: boolean;
}

/**
 * Modal component for displaying alerts and confirmation dialogs.
 *
 * Features:
 * - Accessible with proper ARIA roles
 * - Animated fade-in/out
 * - Supports alert (single button) and confirm (two button) variants
 * - Dark mode support via theme colors
 * - Minimum touch targets for gloved use
 *
 * Usage:
 * ```tsx
 * <Modal
 *   visible={showModal}
 *   onDismiss={() => setShowModal(false)}
 *   title="Success"
 *   message="Your feedback has been submitted."
 *   variant="alert"
 * />
 * ```
 */
export function Modal({
  visible,
  onDismiss,
  title,
  message,
  buttons,
  variant = 'alert',
  children,
  testID,
  dismissOnBackdrop = true,
}: ModalProps) {
  const colors = useColors();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  // Focus trap for accessibility (WCAG 2.4.3)
  const { containerRef, containerProps } = useFocusTrap({
    visible,
    onClose: onDismiss,
    allowEscapeClose: true,
  });

  // Default buttons based on variant
  const defaultButtons: ModalButton[] = variant === 'confirm'
    ? [
        { label: 'Cancel', onPress: onDismiss, variant: 'secondary' },
        { label: 'Confirm', onPress: onDismiss, variant: 'primary' },
      ]
    : [{ label: 'OK', onPress: onDismiss, variant: 'primary' }];

  const finalButtons = buttons ?? defaultButtons;

  // Animate modal in/out
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: durations.normal,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: durations.fast,
        useNativeDriver: true,
      }).start();
      scaleAnim.setValue(0.9);
    }
  }, [visible, fadeAnim, scaleAnim]);

  // Announce to screen readers when modal opens
  useEffect(() => {
    if (visible) {
      AccessibilityInfo.announceForAccessibility(`${title}. ${message || ''}`);
    }
  }, [visible, title, message]);

  const handleBackdropPress = () => {
    if (dismissOnBackdrop) {
      onDismiss();
    }
  };

  const getButtonStyle = (buttonVariant: ModalButton['variant'] = 'primary') => {
    switch (buttonVariant) {
      case 'destructive':
        return {
          backgroundColor: colors.error,
          borderColor: colors.error,
        };
      case 'secondary':
        return {
          backgroundColor: 'transparent',
          borderColor: colors.border,
          borderWidth: 1,
        };
      case 'primary':
      default:
        return {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
        };
    }
  };

  const getButtonTextColor = (buttonVariant: ModalButton['variant'] = 'primary') => {
    switch (buttonVariant) {
      case 'secondary':
        return colors.foreground;
      case 'destructive':
      case 'primary':
      default:
        return '#FFFFFF';
    }
  };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
      statusBarTranslucent
      testID={testID}
    >
      <Animated.View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: `rgba(0, 0, 0, ${opacity.overlay})`,
          opacity: fadeAnim,
        }}
        accessibilityViewIsModal
        accessibilityRole="alert"
      >
        {/* Backdrop */}
        <Pressable
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
          onPress={handleBackdropPress}
          accessibilityLabel="Close modal"
          testID={testID ? `${testID}-backdrop` : undefined}
        />

        {/* Modal Content */}
        <Animated.View
          style={{
            backgroundColor: colors.surface,
            borderRadius: radii.xl,
            padding: spacing.xl,
            marginHorizontal: spacing.xl,
            maxWidth: 340,
            width: '100%',
            transform: [{ scale: scaleAnim }],
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 16,
              },
              android: {
                elevation: 8,
              },
            }),
          }}
        >
          {/* Title */}
          <Text
            style={{
              fontSize: 18,
              fontWeight: '600',
              color: colors.foreground,
              textAlign: 'center',
              marginBottom: message || children ? spacing.sm : spacing.lg,
            }}
            accessibilityRole="header"
          >
            {title}
          </Text>

          {/* Message or Custom Content */}
          {message && !children && (
            <Text
              style={{
                fontSize: 14,
                color: colors.muted,
                textAlign: 'center',
                lineHeight: 20,
                marginBottom: spacing.xl,
              }}
            >
              {message}
            </Text>
          )}

          {children && (
            <View style={{ marginBottom: spacing.xl }}>
              {children}
            </View>
          )}

          {/* Buttons */}
          <View
            style={{
              flexDirection: finalButtons.length === 1 ? 'column' : 'row',
              gap: spacing.sm,
            }}
          >
            {finalButtons.map((button, index) => (
              <Pressable
                key={button.label}
                onPress={button.onPress}
                disabled={button.disabled}
                style={({ pressed }) => [
                  {
                    flex: finalButtons.length > 1 ? 1 : undefined,
                    minHeight: touchTargets.minimum,
                    paddingVertical: spacing.md,
                    paddingHorizontal: spacing.lg,
                    borderRadius: radii.lg,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? opacity.pressed : button.disabled ? opacity.disabled : opacity.opaque,
                  },
                  getButtonStyle(button.variant),
                ]}
                accessibilityRole="button"
                accessibilityLabel={button.label}
                accessibilityState={{ disabled: button.disabled }}
                testID={button.testID}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: getButtonTextColor(button.variant),
                  }}
                >
                  {button.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>
      </Animated.View>
    </RNModal>
  );
}

export default Modal;
