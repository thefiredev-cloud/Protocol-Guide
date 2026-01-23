import { Component, ErrorInfo, ReactNode } from "react";
import { View, Text, Pressable, ScrollView, Platform } from "react-native";
import { spacing, radii, touchTargets } from "@/lib/design-tokens";

interface ErrorBoundaryProps {
  /** Child components to wrap */
  children: ReactNode;
  /** Optional fallback UI to render on error */
  fallback?: ReactNode;
  /** Called when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Whether to show error details (dev only) */
  showDetails?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// Colors for error boundary (hardcoded to avoid hook issues in class component)
const errorColors = {
  background: '#0F172A',
  surface: '#1E293B',
  foreground: '#F1F5F9',
  muted: '#94A3B8',
  error: '#EF4444',
  primary: '#EF4444',
  border: '#334155',
};

/**
 * Error Boundary component that catches JavaScript errors in child components.
 *
 * Features:
 * - Catches render errors anywhere in child component tree
 * - Displays friendly error UI with retry option
 * - Logs errors to console (and optionally to external service)
 * - Shows error details in development mode
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary onError={(error) => logToSentry(error)}>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);

    // Update state with error info
    this.setState({ errorInfo });

    // Call optional error handler (for Sentry, etc.)
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo } = this.state;
      const showDetails = this.props.showDetails ?? __DEV__;

      return (
        <View
          style={{
            flex: 1,
            backgroundColor: errorColors.background,
            padding: spacing.xl,
            justifyContent: 'center',
            alignItems: 'center',
          }}
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
        >
          <View
            style={{
              backgroundColor: errorColors.surface,
              borderRadius: radii.xl,
              padding: spacing.xl,
              maxWidth: 400,
              width: '100%',
              alignItems: 'center',
            }}
          >
            {/* Error Icon */}
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: `${errorColors.error}20`,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: spacing.lg,
              }}
            >
              <Text style={{ fontSize: 32 }}>!</Text>
            </View>

            {/* Title */}
            <Text
              style={{
                fontSize: 20,
                fontWeight: '700',
                color: errorColors.foreground,
                textAlign: 'center',
                marginBottom: spacing.sm,
              }}
              accessibilityRole="header"
            >
              Something went wrong
            </Text>

            {/* Description */}
            <Text
              style={{
                fontSize: 14,
                color: errorColors.muted,
                textAlign: 'center',
                lineHeight: 20,
                marginBottom: spacing.xl,
              }}
            >
              We encountered an unexpected error. Please try again or restart the app if the problem persists.
            </Text>

            {/* Error Details (dev only) */}
            {showDetails && error && (
              <ScrollView
                style={{
                  maxHeight: 150,
                  width: '100%',
                  backgroundColor: errorColors.background,
                  borderRadius: radii.md,
                  padding: spacing.md,
                  marginBottom: spacing.xl,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                    color: errorColors.error,
                    marginBottom: spacing.xs,
                  }}
                >
                  {error.name}: {error.message}
                </Text>
                {errorInfo?.componentStack && (
                  <Text
                    style={{
                      fontSize: 10,
                      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                      color: errorColors.muted,
                    }}
                  >
                    {errorInfo.componentStack.slice(0, 500)}
                    {errorInfo.componentStack.length > 500 ? '...' : ''}
                  </Text>
                )}
              </ScrollView>
            )}

            {/* Retry Button */}
            <Pressable
              onPress={this.handleRetry}
              style={({ pressed }) => ({
                minHeight: touchTargets.minimum,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing['2xl'],
                borderRadius: radii.lg,
                backgroundColor: errorColors.primary,
                opacity: pressed ? 0.7 : 1,
                alignItems: 'center',
                justifyContent: 'center',
              })}
              accessibilityRole="button"
              accessibilityLabel="Try again"
              accessibilityHint="Attempts to render the component again"
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#FFFFFF',
                }}
              >
                Try Again
              </Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component to wrap a component with ErrorBoundary
 *
 * Usage:
 * ```tsx
 * export default withErrorBoundary(MyComponent, {
 *   onError: (error) => logToSentry(error),
 * });
 * ```
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const ComponentWithErrorBoundary = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;

  return ComponentWithErrorBoundary;
}

export default ErrorBoundary;
