import { View, Text, TouchableOpacity, Platform, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "@/lib/haptics";
import { useState, useMemo, useCallback, memo } from "react";
import { IconSymbol } from "./ui/icon-symbol";
import { useRouter } from "expo-router";
import { MedicalDisclaimer } from "./MedicalDisclaimer";

type ResponseCardProps = {
  text: string;
  protocolRefs?: string[];
  timestamp?: Date;
};

export const ResponseCard = memo(function ResponseCard({ text, protocolRefs, timestamp }: ResponseCardProps) {
  const colors = useColors();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const sections = useMemo(() => parseResponse(text), [text]);

  const handleCopy = useCallback(async () => {
    await Clipboard.setStringAsync(text);
    setCopied(true);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    const timer = setTimeout(() => setCopied(false), 2000);
    // Note: Timer is self-contained in callback, cleanup happens when component unmounts
    // Store timer ref if component might unmount during the 2s window
    return () => clearTimeout(timer);
  }, [text]);

  const handleReportError = useCallback(() => {
    const protocolRef = sections.protocol || protocolRefs?.[0] || "";
    router.push(`/feedback?category=error&protocolRef=${encodeURIComponent(protocolRef)}` as any);
  }, [sections.protocol, protocolRefs, router]);

  const toggleActions = useCallback(() => {
    setShowActions(prev => !prev);
  }, []);

  return (
    <Animated.View 
      entering={FadeInDown.duration(300)}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      {/* Protocol Header */}
      {sections.protocol && (
        <View style={styles.header}>
          <View style={[styles.protocolBadge, { backgroundColor: `${colors.primary}10` }]}>
            <IconSymbol name="doc.text.fill" size={14} color={colors.primary} />
            <Text style={[styles.protocolText, { color: colors.primary }]}>
              {sections.protocol}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={handleCopy}
              activeOpacity={0.7}
              style={styles.iconButton}
            >
              <IconSymbol 
                name={copied ? "checkmark" : "doc.on.doc"} 
                size={16} 
                color={copied ? colors.success : colors.muted} 
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={toggleActions}
              activeOpacity={0.7}
              style={styles.iconButton}
            >
              <IconSymbol name="ellipsis.vertical" size={16} color={colors.muted} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Action Menu */}
      {showActions && (
        <Animated.View 
          entering={FadeIn.duration(150)}
          style={[styles.actionMenu, { borderColor: colors.border }]}
        >
          <TouchableOpacity
            onPress={() => { handleCopy(); setShowActions(false); }}
            activeOpacity={0.7}
            style={[styles.menuItem, { borderBottomWidth: 1, borderBottomColor: colors.border }]}
          >
            <IconSymbol name="doc.on.doc" size={16} color={colors.foreground} />
            <Text style={[styles.menuText, { color: colors.foreground }]}>Copy Response</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { handleReportError(); setShowActions(false); }}
            activeOpacity={0.7}
            style={styles.menuItem}
          >
            <IconSymbol name="exclamationmark.triangle.fill" size={16} color={colors.warning} />
            <Text style={[styles.menuText, { color: colors.foreground }]}>Report Error</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Main Content */}
      {sections.content && (
        <Text style={[styles.content, { color: colors.foreground }]}>
          {sections.content}
        </Text>
      )}

      {/* Dosages - Highlighted */}
      {sections.dosages && sections.dosages.length > 0 && (
        <View style={[styles.dosageBox, { backgroundColor: `${colors.primary}08`, borderColor: `${colors.primary}20` }]}>
          <View style={styles.dosageHeader}>
            <IconSymbol name="pills.fill" size={14} color={colors.primary} />
            <Text style={[styles.dosageTitle, { color: colors.primary }]}>
              Medications
            </Text>
          </View>
          {sections.dosages.map((dosage, index) => (
            <View key={index} style={styles.dosageItem}>
              <View style={[styles.dosageBullet, { backgroundColor: colors.primary }]} />
              <Text style={[styles.dosageText, { color: colors.foreground }]}>{dosage}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Actions List */}
      {sections.actions && sections.actions.length > 0 && (
        <View style={styles.actionsList}>
          {sections.actions.map((action, index) => (
            <View key={index} style={styles.actionItem}>
              <Text style={[styles.actionNumber, { color: colors.primary }]}>{index + 1}</Text>
              <Text style={[styles.actionText, { color: colors.foreground }]}>{action}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Reference Footer */}
      {sections.ref && (
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Text style={[styles.refText, { color: colors.muted }]}>
            {sections.ref}
          </Text>
          {!sections.protocol && (
            <View style={styles.footerActions}>
              <TouchableOpacity onPress={handleCopy} activeOpacity={0.7} style={styles.smallIconButton}>
                <IconSymbol name={copied ? "checkmark" : "doc.on.doc"} size={14} color={copied ? colors.success : colors.muted} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleReportError} activeOpacity={0.7} style={styles.smallIconButton}>
                <IconSymbol name="exclamationmark.triangle.fill" size={14} color={colors.muted} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Medical Disclaimer - Required for legal compliance */}
      <MedicalDisclaimer variant="inline" />
    </Animated.View>
  );
});

// User message bubble
export const UserMessageCard = memo(function UserMessageCard({ text, timestamp }: { text: string; timestamp?: Date }) {
  const colors = useColors();

  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.userMessageContainer}>
      <View style={[styles.userMessage, { backgroundColor: colors.primary }]}>
        <Text style={styles.userMessageText}>{text}</Text>
      </View>
    </Animated.View>
  );
});

// Loading indicator
export const LoadingCard = memo(function LoadingCard() {
  const colors = useColors();

  return (
    <Animated.View 
      entering={FadeIn.duration(200)}
      style={[styles.loadingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={styles.loadingContent}>
        <View style={styles.loadingDots}>
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <View style={[styles.dot, { backgroundColor: colors.primary, opacity: 0.6 }]} />
          <View style={[styles.dot, { backgroundColor: colors.primary, opacity: 0.3 }]} />
        </View>
        <Text style={[styles.loadingText, { color: colors.muted }]}>Searching protocols...</Text>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  protocolBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  protocolText: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 6,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    marginLeft: 4,
  },
  actionMenu: {
    marginBottom: 12,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  menuText: {
    fontSize: 14,
    marginLeft: 10,
  },
  content: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 12,
  },
  dosageBox: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  dosageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  dosageTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 6,
  },
  dosageItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  dosageBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
    marginRight: 10,
  },
  dosageText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    lineHeight: 20,
  },
  actionsList: {
    marginBottom: 8,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  actionNumber: {
    fontSize: 13,
    fontWeight: '700',
    width: 20,
    marginRight: 8,
  },
  actionText: {
    fontSize: 15,
    flex: 1,
    lineHeight: 22,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  refText: {
    fontSize: 12,
    flex: 1,
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallIconButton: {
    padding: 4,
    marginLeft: 8,
  },
  userMessageContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 12,
  },
  userMessage: {
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 16,
    maxWidth: '85%',
  },
  userMessageText: {
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  loadingCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 4,
    marginRight: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  loadingText: {
    fontSize: 14,
  },
});

// Parse response text into structured sections
function parseResponse(text: string): {
  protocol?: string;
  content?: string;
  actions?: string[];
  dosages?: string[];
  ref?: string;
} {
  const result: {
    protocol?: string;
    content?: string;
    actions?: string[];
    dosages?: string[];
    ref?: string;
  } = {};

  const protocolMatch = text.match(/^PROTOCOL:\s*(.+?)(?:\n|$)/im);
  if (protocolMatch) {
    result.protocol = protocolMatch[1].trim();
  }

  const refMatch = text.match(/^REF:\s*(.+?)(?:\n|$)/im);
  if (refMatch) {
    result.ref = refMatch[1].trim();
  }

  const actionsMatch = text.match(/ACTIONS:\s*\n((?:•\s*.+\n?)+)/im);
  if (actionsMatch) {
    result.actions = actionsMatch[1]
      .split('\n')
      .map(line => line.replace(/^•\s*/, '').trim())
      .filter(line => line.length > 0);
  }

  const dosagePattern = /(?:^|\n)([^•\n]*(?:\d+\s*(?:mg|mcg|mL|g|units?|IU)(?:\/(?:kg|min|hr|dose))?)[^•\n]*)/gi;
  const dosageMatches = text.match(dosagePattern);
  if (dosageMatches && dosageMatches.length > 0) {
    result.dosages = dosageMatches
      .map(d => d.trim())
      .filter(d => d.length > 10 && d.length < 200)
      .slice(0, 5);
  }

  let content = text;
  content = content.replace(/^PROTOCOL:\s*.+?\n/im, '');
  content = content.replace(/ACTIONS:\s*\n(?:•\s*.+\n?)+/im, '');
  content = content.replace(/^REF:\s*.+?$/im, '');
  
  content = content.trim();
  if (content) {
    result.content = content;
  }

  if (!result.protocol && !result.actions && !result.ref) {
    result.content = text;
  }

  return result;
}
