/**
 * Quick Reference List Component
 * 
 * Displays a grid of quick reference cards with category filtering.
 */

import { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { QuickReferenceCard, QuickReferenceCardData } from "./QuickReferenceCard";
import Animated, { FadeIn } from "react-native-reanimated";

type Category = 'all' | 'cardiac' | 'respiratory' | 'neurological' | 'trauma' | 'medical' | 'pediatric' | 'obstetric' | 'toxicology';

const CATEGORIES: { key: Category; label: string; icon: string; color: string }[] = [
  { key: 'all', label: 'All', icon: 'square.grid.2x2.fill', color: '#6B7280' },
  { key: 'cardiac', label: 'Cardiac', icon: 'heart.fill', color: '#DC2626' },
  { key: 'respiratory', label: 'Respiratory', icon: 'lungs.fill', color: '#0D9488' },
  { key: 'neurological', label: 'Neuro', icon: 'brain.head.profile', color: '#7C3AED' },
  { key: 'trauma', label: 'Trauma', icon: 'cross.fill', color: '#DC2626' },
  { key: 'medical', label: 'Medical', icon: 'cross.case.fill', color: '#EA580C' },
  { key: 'pediatric', label: 'Peds', icon: 'figure.child', color: '#EC4899' },
  { key: 'toxicology', label: 'Tox', icon: 'pills.fill', color: '#0EA5E9' },
];

export function QuickReferenceList() {
  const colors = useColors();
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');
  const [selectedCard, setSelectedCard] = useState<QuickReferenceCardData | null>(null);

  // Fetch all quick reference cards
  const { data, isLoading, error } = trpc.quickReference.getAll.useQuery();

  // Filter cards by category
  const filteredCards = useMemo(() => {
    if (!data?.cards) return [];
    if (selectedCategory === 'all') return data.cards;
    return data.cards.filter(card => card.category === selectedCategory);
  }, [data?.cards, selectedCategory]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.muted, marginTop: 12 }}>Loading quick references...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
        <IconSymbol name="exclamationmark.triangle.fill" size={48} color={colors.error} />
        <Text style={{ color: colors.text, marginTop: 12, textAlign: 'center' }}>
          Failed to load quick reference cards
        </Text>
        <Text style={{ color: colors.muted, marginTop: 4, fontSize: 13 }}>
          {error.message}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Category filter tabs */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={CATEGORIES}
        keyExtractor={(item) => item.key}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setSelectedCategory(item.key)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 20,
              marginRight: 8,
              backgroundColor: selectedCategory === item.key ? item.color + '20' : colors.surface,
              borderWidth: 1,
              borderColor: selectedCategory === item.key ? item.color : colors.border,
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: selectedCategory === item.key }}
          >
            <IconSymbol
              name={item.icon as any}
              size={16}
              color={selectedCategory === item.key ? item.color : colors.muted}
            />
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: selectedCategory === item.key ? item.color : colors.muted,
                marginLeft: 6,
              }}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Results count */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <Text style={{ fontSize: 13, color: colors.muted }}>
          {filteredCards.length} quick reference{filteredCards.length !== 1 ? 's' : ''}
          {selectedCategory !== 'all' && ` in ${CATEGORIES.find(c => c.key === selectedCategory)?.label}`}
        </Text>
      </View>

      {/* Cards grid */}
      <FlatList
        data={filteredCards}
        keyExtractor={(item) => item.id}
        numColumns={1}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        renderItem={({ item, index }) => (
          <Animated.View
            entering={FadeIn.delay(index * 50).duration(200)}
            style={{ marginBottom: 12 }}
          >
            <QuickReferenceCard
              card={item as QuickReferenceCardData}
              variant="compact"
              onPress={() => setSelectedCard(item as QuickReferenceCardData)}
            />
          </Animated.View>
        )}
        ListEmptyComponent={
          <View style={{ padding: 40, alignItems: 'center' }}>
            <IconSymbol name="doc.text.magnifyingglass" size={48} color={colors.muted} />
            <Text style={{ color: colors.muted, marginTop: 12, textAlign: 'center' }}>
              No quick references found for this category
            </Text>
          </View>
        }
      />

      {/* Full card modal */}
      <Modal
        visible={!!selectedCard}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedCard(null)}
      >
        {selectedCard && (
          <QuickReferenceCard
            card={selectedCard}
            variant="full"
            isExpanded
            onClose={() => setSelectedCard(null)}
          />
        )}
      </Modal>
    </View>
  );
}

export default QuickReferenceList;
