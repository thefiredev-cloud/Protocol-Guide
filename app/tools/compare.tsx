/**
 * Protocol Comparison Page
 * 
 * Allows users to compare similar protocols side-by-side.
 * Useful for differential diagnosis and understanding regional variations.
 */

import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useColors } from '@/hooks/use-colors';
import { ProtocolComparison } from '@/components/comparison';

export default function ComparePage() {
  const colors = useColors();
  const params = useLocalSearchParams<{ query?: string }>();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ProtocolComparison 
        initialQuery={params.query || ''} 
        onClose={() => router.back()}
      />
    </SafeAreaView>
  );
}
