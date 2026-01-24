/**
 * Simulation Section - Animated bar chart comparing manual search vs Protocol Guide
 * Features: pulsing CTA, spring animations, celebration effects, hover cards, live timer
 *
 * Accessibility: Reduced-motion support, ARIA labels, keyboard accessible button
 */

import { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  Animated,
  Easing,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from "react-native";
import { SimulationTimer } from "./simulation/simulation-timer";
import { useSimulationTimer } from "../../hooks/useSimulationTimer";
import {
  PulsingButton,
  CelebrationEffect,
  ComparisonCard,
  COLORS,
  MANUAL_SEARCH_TIME,
  PROTOCOL_GUIDE_TIME,
  MAX_TIME,
  SimulationState,
} from "./simulation";

export function SimulationSection() {
  const { width } = useWindowDimensions();

  // Three-tier responsive breakpoints
  const isMobile = width < 640;
  const isTablet = width >= 640 && width < 1024;

  const [state, setState] = useState<SimulationState>("idle");
  const [showCelebration, setShowCelebration] = useState(false);
  const [manualElapsedTime, setManualElapsedTime] = useState(0);
  const [protocolElapsedTime, setProtocolElapsedTime] = useState(0);
  const [protocolComplete, setProtocolComplete] = useState(false);

  // Live simulation timer with pause/resume support
  const simulationTimer = useSimulationTimer(100);

  const manualWidth = useRef(new Animated.Value(0)).current;
  const protocolWidth = useRef(new Animated.Value(0)).current;
  const protocolBounce = useRef(new Animated.Value(1)).current;
  const completeBadgeScale = useRef(new Animated.Value(0)).current;
  const protocolFoundScale = useRef(new Animated.Value(0)).current;
  const checkmarkRotate = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const protocolTimerRef = useRef<NodeJS.Timeout | null>(null);
  const celebrationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (protocolTimerRef.current) clearInterval(protocolTimerRef.current);
      if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current);
    };
  }, []);

  const resetAnimation = useCallback(() => {
    // Clear any running timers
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (protocolTimerRef.current) {
      clearInterval(protocolTimerRef.current);
      protocolTimerRef.current = null;
    }
    if (celebrationTimerRef.current) {
      clearTimeout(celebrationTimerRef.current);
      celebrationTimerRef.current = null;
    }

    // Reset the live timer
    simulationTimer.reset();

    manualWidth.setValue(0);
    protocolWidth.setValue(0);
    protocolBounce.setValue(1);
    completeBadgeScale.setValue(0);
    protocolFoundScale.setValue(0);
    checkmarkRotate.setValue(0);
    setShowCelebration(false);
    setManualElapsedTime(0);
    setProtocolElapsedTime(0);
    setProtocolComplete(false);
    setState("idle");
  }, [manualWidth, protocolWidth, protocolBounce, completeBadgeScale, protocolFoundScale, checkmarkRotate, simulationTimer]);

  const runSimulation = useCallback(() => {
    if (state === "complete") {
      resetAnimation();
      return;
    }

    setState("running");
    startTimeRef.current = Date.now();

    // Start the live timer
    simulationTimer.start();

    // Start main elapsed time timer (updates every 100ms)
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      // Map 4 seconds of real time to 90 seconds of simulated time
      const simulatedTime = (elapsed / 4) * MANUAL_SEARCH_TIME;
      setManualElapsedTime(Math.min(simulatedTime, MANUAL_SEARCH_TIME));
    }, 100);

    // Start protocol elapsed time timer (faster, finishes at 2.3s simulated)
    protocolTimerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      // Protocol finishes in ~200ms real time, mapping to 2.3s simulated
      const simulatedTime = (elapsed / 0.2) * PROTOCOL_GUIDE_TIME;
      if (simulatedTime >= PROTOCOL_GUIDE_TIME) {
        setProtocolElapsedTime(PROTOCOL_GUIDE_TIME);
        if (protocolTimerRef.current) {
          clearInterval(protocolTimerRef.current);
          protocolTimerRef.current = null;
        }
        // Show "Protocol Found" badge with checkmark animation
        setProtocolComplete(true);
        Animated.parallel([
          Animated.spring(protocolFoundScale, {
            toValue: 1,
            friction: 5,
            tension: 200,
            useNativeDriver: true,
          }),
          Animated.timing(checkmarkRotate, {
            toValue: 1,
            duration: 300,
            easing: Easing.out(Easing.back(1.5)),
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        setProtocolElapsedTime(simulatedTime);
      }
    }, 50);

    // Protocol Guide finishes fast with enhanced spring bounce
    Animated.sequence([
      Animated.timing(protocolWidth, {
        toValue: (PROTOCOL_GUIDE_TIME / MAX_TIME) * 100,
        duration: 200,
        easing: Easing.bezier(0.22, 1, 0.36, 1), // Enhanced easing curve
        useNativeDriver: false,
      }),
      // Subtle overshoot bounce
      Animated.spring(protocolBounce, {
        toValue: 1.08,
        friction: 4,
        tension: 250,
        useNativeDriver: true,
      }),
      // Settle back with gentle spring
      Animated.spring(protocolBounce, {
        toValue: 1,
        friction: 6,
        tension: 120,
        useNativeDriver: true,
      }),
    ]).start();

    // Manual search with smooth ease-out curve
    Animated.timing(manualWidth, {
      toValue: (MANUAL_SEARCH_TIME / MAX_TIME) * 100,
      duration: 4000,
      easing: Easing.bezier(0.33, 1, 0.68, 1), // Smoother ease-out
      useNativeDriver: false,
    }).start(() => {
      // Stop the timer when animation completes
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setManualElapsedTime(MANUAL_SEARCH_TIME);

      // Pause the live timer when simulation completes
      simulationTimer.pause();

      setState("complete");
      setShowCelebration(true);

      // Animate completion badge with playful bounce
      Animated.spring(completeBadgeScale, {
        toValue: 1,
        friction: 5,
        tension: 150,
        useNativeDriver: true,
      }).start();

      // Hide celebration after delay
      if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current);
      celebrationTimerRef.current = setTimeout(() => setShowCelebration(false), 2500);
    });
  }, [state, resetAnimation, protocolWidth, protocolBounce, manualWidth, completeBadgeScale, protocolFoundScale, checkmarkRotate, simulationTimer]);

  const getStatusText = () => {
    switch (state) {
      case "idle":
        return "Waiting to start...";
      case "running":
        return "Simulating cardiac arrest protocol lookup...";
      case "complete":
        return "Complete - Protocol Guide is 39x faster";
    }
  };

  const getButtonText = () => {
    return state === "complete" ? "Reset" : "Simulate Call";
  };

  return (
    <View style={[styles.container, isTablet && { paddingVertical: 56 }]}>
      {/* Background pattern overlay */}
      <View style={styles.backgroundPattern} />

      <View style={[styles.content, isMobile && { paddingHorizontal: 16 }, isTablet && { paddingHorizontal: 32 }]}>
        {/* Section Label */}
        <Text style={styles.sectionLabel}>Live Simulation</Text>

        {/* Title */}
        <Text style={[styles.title, isMobile && { fontSize: 24 }, isTablet && { fontSize: 30 }]}>The Cognitive Load Gap</Text>

        {/* Subtitle */}
        <Text style={[styles.subtitle, isMobile && { fontSize: 15 }, isTablet && { fontSize: 16, marginBottom: 28 }]}>
          {`Click "Simulate Call" to visualize the time difference\nin a cardiac arrest scenario.`}
        </Text>

        {/* Live Timer Display */}
        <View style={[styles.timerContainer, isMobile && { marginBottom: 16 }]}>
          <SimulationTimer
            formattedTime={simulationTimer.formattedTimeWithDeciseconds}
            isRunning={simulationTimer.isRunning}
            isPaused={simulationTimer.isPaused}
            onTogglePause={simulationTimer.togglePause}
            label="Real-Time Elapsed"
            compact={isMobile}
            showPauseButton={state === "running"}
          />
        </View>

        {/* Chart Card */}
        <View style={[styles.chartCard, isMobile && { padding: 16 }, isTablet && { padding: 20 }]}>
          {/* Celebration Effect */}
          <CelebrationEffect visible={showCelebration} />

          {/* Header Row */}
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Protocol Retrieval Time</Text>
            <PulsingButton
              onPress={runSimulation}
              label={getButtonText()}
              isRunning={state === "running"}
            />
          </View>

          {/* Status */}
          <View style={styles.statusRow}>
            <Text style={styles.statusText}>Status: {getStatusText()}</Text>
            {state === "complete" && (
              <Animated.View
                style={[styles.completeBadge, { transform: [{ scale: completeBadgeScale }] }]}
              >
                <Text style={styles.completeBadgeText}>39x Faster</Text>
              </Animated.View>
            )}
          </View>

          {/* Manual Search Bar */}
          <View style={styles.barSection}>
            <View style={styles.barLabelRow}>
              <Text style={styles.barLabel}>Manual Search</Text>
              {state !== "idle" && (
                <Text style={styles.elapsedTime}>
                  {manualElapsedTime.toFixed(1)}s
                </Text>
              )}
            </View>
            <View style={styles.barTrack}>
              <Animated.View
                style={[
                  styles.barFillManual,
                  {
                    width: manualWidth.interpolate({
                      inputRange: [0, 100],
                      outputRange: ["0%", "100%"],
                    }),
                  },
                ]}
              />
            </View>
            <Text style={styles.barTime}>~{MANUAL_SEARCH_TIME}s average</Text>
          </View>

          {/* Protocol Guide Bar */}
          <View style={styles.barSection}>
            <View style={styles.barLabelRow}>
              <Text style={styles.barLabel}>Protocol Guide</Text>
              <View style={styles.protocolStatusRow}>
                {state !== "idle" && (
                  <Text style={styles.elapsedTimeProtocol}>
                    {protocolElapsedTime.toFixed(1)}s
                  </Text>
                )}
                {protocolComplete && (
                  <Animated.View
                    style={[
                      styles.protocolFoundBadge,
                      {
                        transform: [
                          { scale: protocolFoundScale },
                          {
                            rotate: checkmarkRotate.interpolate({
                              inputRange: [0, 1],
                              outputRange: ["-15deg", "0deg"],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <Text style={styles.protocolFoundText}>Protocol Found</Text>
                    <Text style={styles.checkmark}>{" \u2713"}</Text>
                  </Animated.View>
                )}
              </View>
            </View>
            <View style={styles.barTrack}>
              <Animated.View
                style={[
                  styles.barFillProtocol,
                  {
                    width: protocolWidth.interpolate({
                      inputRange: [0, 100],
                      outputRange: ["0%", "100%"],
                    }),
                    transform: [{ scaleY: protocolBounce }],
                  },
                ]}
              />
            </View>
            <Text style={styles.barTime}>~{PROTOCOL_GUIDE_TIME}s average</Text>
          </View>

          {/* X-axis labels - reduced to 4 on mobile */}
          <View style={styles.xAxis}>
            {(isMobile ? [0, 30, 60, 95] : [0, 10, 20, 30, 40, 50, 60, 70, 80, 95]).map((val) => (
              <Text key={val} style={styles.xAxisLabel}>
                {val}
              </Text>
            ))}
          </View>
          <Text style={styles.xAxisTitle}>Seconds Elapsed</Text>
        </View>

        {/* Comparison Cards - stack on mobile, side by side on tablet/desktop */}
        <View style={[styles.cardsRow, isMobile && styles.cardsRowMobile, isTablet && { gap: 16 }]}>
          <ComparisonCard
            label="Current Standard"
            value="~90s"
            description="PDF Scrolling / App Fumbling"
            variant="standard"
          />
          <ComparisonCard
            label="Protocol Guide"
            value="2.3s"
            description="Natural Language AI"
            variant="protocol"
          />
        </View>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.bgDark,
    paddingVertical: 48,
    position: "relative",
    overflow: "hidden",
  },
  backgroundPattern: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.4,
    ...(Platform.OS === "web"
      ? {
          backgroundImage: `radial-gradient(circle, ${COLORS.border} 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }
      : {}),
  },
  content: {
    paddingHorizontal: 24,
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
    position: "relative",
    zIndex: 1,
  },
  sectionLabel: {
    color: COLORS.primaryRed,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    textAlign: "center",
    marginBottom: 8,
  },
  title: {
    color: COLORS.textWhite,
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  timerContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  chartCard: {
    backgroundColor: COLORS.bgSurface,
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
    position: "relative",
    overflow: "hidden",
    ...(Platform.OS === "web"
      ? {
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        }
      : {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }),
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  chartTitle: {
    color: COLORS.textWhite,
    fontSize: 14,
    fontWeight: "600",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
  },
  statusText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  completeBadge: {
    backgroundColor: COLORS.celebrationGreen,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completeBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  barSection: {
    marginBottom: 16,
  },
  barLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  barLabel: {
    color: COLORS.textWhite,
    fontSize: 13,
  },
  elapsedTime: {
    color: COLORS.chartYellow,
    fontSize: 14,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  elapsedTimeProtocol: {
    color: COLORS.primaryRed,
    fontSize: 14,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  protocolStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  protocolFoundBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.celebrationGreen,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  protocolFoundText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  checkmark: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  barTrack: {
    height: 24,
    backgroundColor: COLORS.bgDark,
    borderRadius: 4,
    overflow: "hidden",
  },
  barFillManual: {
    height: "100%",
    backgroundColor: COLORS.chartYellow,
    borderRadius: 4,
  },
  barFillProtocol: {
    height: "100%",
    backgroundColor: COLORS.primaryRed,
    borderRadius: 4,
  },
  barTime: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  xAxis: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
  },
  xAxisLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  xAxisTitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: "center",
    marginTop: 4,
  },
  cardsRow: {
    flexDirection: "row",
    gap: 16,
  },
  cardsRowMobile: {
    flexDirection: "column",
  },
  // PulsingButton styles
  buttonContainer: {
    position: "relative",
  },
  buttonGlow: {
    position: "absolute",
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    backgroundColor: COLORS.primaryRed,
    borderRadius: 10,
    opacity: 0.3,
    ...(Platform.OS === "web"
      ? {
          filter: "blur(8px)",
        }
      : {}),
  },
  button: {
    backgroundColor: COLORS.bgSurface,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 110,
    alignItems: "center",
  },
  buttonPrimary: {
    backgroundColor: COLORS.primaryRed,
    borderColor: COLORS.primaryRed,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: COLORS.textWhite,
    fontSize: 13,
    fontWeight: "600",
  },
  buttonTextPrimary: {
    color: "#FFFFFF",
  },
  buttonTextDisabled: {
    color: COLORS.textMuted,
  },
  // CelebrationEffect styles
  celebrationContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  flashOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.celebrationGreen,
    borderRadius: 12,
  },
  confettiPiece: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  // ComparisonCard styles
  card: {
    flex: 1,
    backgroundColor: COLORS.bgSurface,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    position: "relative",
    overflow: "hidden",
    ...(Platform.OS === "web"
      ? {
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
          cursor: "pointer",
          transition: "box-shadow 0.2s ease",
        }
      : {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }),
  },
  cardProtocol: {
    borderColor: COLORS.primaryRed,
    borderWidth: 2,
  },
  cardLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  cardValue: {
    color: COLORS.textWhite,
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 4,
  },
  cardValueProtocol: {
    color: COLORS.primaryRed,
  },
  cardDescription: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  cardBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: COLORS.primaryRed,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  cardBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});

export default SimulationSection;
