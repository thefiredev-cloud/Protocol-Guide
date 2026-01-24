/**
 * Styles for SimulationSection component
 */

import { StyleSheet, Platform } from "react-native";
import { COLORS } from "./constants";

export const styles = StyleSheet.create({
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
});
