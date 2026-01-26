/**
 * Voice Search Modal Styles
 *
 * StyleSheet definitions for the VoiceSearchModal component.
 */

import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  closeButton: {
    position: "absolute",
    top: 64,
    right: 24,
    // Ensure minimum 44x44 touch target (WCAG 2.1 AAA)
    minWidth: 44,
    minHeight: 44,
    padding: 12,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 32,
  },
  micContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    width: 160,
    height: 160,
    marginBottom: 32,
  },
  pulseRing: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  durationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  durationText: {
    fontSize: 18,
    fontWeight: "600",
  },
  transcriptionBox: {
    width: "100%",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  transcriptionLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  transcriptionText: {
    fontSize: 16,
  },
  errorBox: {
    width: "100%",
    padding: 16,
    borderRadius: 12,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 12,
  },
  retryButton: {
    marginTop: 12,
    // Ensure minimum 44px height for touch target (WCAG 2.1 AAA)
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignSelf: "flex-start",
    justifyContent: "center",
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  tipsContainer: {
    width: "100%",
  },
  tipsText: {
    fontSize: 12,
    textAlign: "center",
  },
  bottomHint: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 24,
    textAlign: "center",
  },
});
