/**
 * Quick Reference Cards Page
 * 
 * Displays high-frequency EMS protocols in a quick-reference card format
 * optimized for field use. Accessible without authentication.
 */

import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useColors } from '@/hooks/use-colors';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { QuickReferenceList } from '@/components/quick-reference';

export default function QuickReferencePage() {
  const colors = useColors();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.surface,
            justifyContent: 'center',
            alignItems: 'center',
          }}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <IconSymbol name="chevron.left" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>
            Quick Reference
          </Text>
          <Text style={{ fontSize: 13, color: colors.muted }}>
            High-frequency protocols at a glance
          </Text>
        </View>
      </View>

      {/* Quick Reference List */}
      <QuickReferenceList />

      {/* Disclaimer */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingHorizontal: 16,
          paddingVertical: 10,
          paddingBottom: 24,
        }}
      >
        <Text style={{ fontSize: 11, color: colors.muted, textAlign: 'center', lineHeight: 14 }}>
          For reference only. Always verify with local protocols and medical direction.
        </Text>
      </View>
    </SafeAreaView>
  );
}
