/**
 * Protocol Comparison Component
 * 
 * Allows users to compare similar protocols side-by-side for differential diagnosis.
 * Shows medication variations, key differences, and contraindications.
 */

import { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { IconSymbol } from "@/components/ui/icon-symbol";
import Animated, { FadeIn, SlideInRight } from "react-native-reanimated";

// Types matching the backend
type MedicationInfo = {
  name: string;
  dose: string | null;
  route: string | null;
  indication: string | null;
};

type ComparisonProtocol = {
  id: number;
  protocolNumber: string;
  protocolTitle: string;
  section: string | null;
  content: string;
  fullContent: string;
  agencyId: number;
  agencyName: string;
  stateCode: string | null;
  similarity: number;
  keyPoints: string[];
  medications: MedicationInfo[];
  contraindications: string[];
};

type ComparisonSummary = {
  commonMedications: string[];
  varyingMedications: string[];
  doseVariations: { medication: string; variations: string[] }[];
  keyDifferences: string[];
};

type Props = {
  initialQuery?: string;
  onClose?: () => void;
};

export function ProtocolComparison({ initialQuery = '', onClose }: Props) {
  const colors = useColors();
  const [query, setQuery] = useState(initialQuery);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedProtocolIndex, setSelectedProtocolIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'summary' | 'medications' | 'details'>('summary');

  // Get tRPC utils for imperative queries
  const trpcUtils = trpc.useUtils();
  const [isSearching, setIsSearching] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<{
    query: string;
    primaryCondition: string;
    protocols: ComparisonProtocol[];
    comparisonSummary: ComparisonSummary;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Related conditions query
  const relatedQuery = trpc.comparison.getRelatedConditions.useQuery(
    { condition: query },
    { enabled: query.length > 2 && !isSearching }
  );

  const handleSearch = useCallback(async (searchQuery?: string) => {
    const q = searchQuery || query;
    if (!q.trim()) return;

    setHasSearched(true);
    setIsSearching(true);
    setError(null);
    setSelectedProtocolIndex(null);

    try {
      const result = await trpcUtils.comparison.findSimilar.fetch({
        query: q,
        limit: 5,
      });
      setComparisonResult(result);
    } catch (err: any) {
      console.error('Comparison search error:', err);
      setError(err.message || 'Failed to find similar protocols');
      setComparisonResult(null);
    } finally {
      setIsSearching(false);
    }
  }, [query, trpcUtils.comparison.findSimilar]);

  const handleRelatedSearch = (condition: string) => {
    setQuery(condition);
    handleSearch(condition);
  };

  // Protocol detail view
  if (selectedProtocolIndex !== null && comparisonResult) {
    const protocol = comparisonResult.protocols[selectedProtocolIndex];
    return (
      <Animated.View entering={SlideInRight.duration(250)} style={{ flex: 1, backgroundColor: colors.background }}>
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
            onPress={() => setSelectedProtocolIndex(null)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.surface,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <IconSymbol name="chevron.left" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text
            style={{
              fontSize: 17,
              fontWeight: '700',
              color: colors.text,
              flex: 1,
              marginLeft: 12,
            }}
            numberOfLines={1}
          >
            {protocol.protocolTitle}
          </Text>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          {/* Agency info */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 12,
              padding: 14,
              marginBottom: 12,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <IconSymbol name="building.2.fill" size={18} color={colors.primary} />
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, marginLeft: 8 }}>
                {protocol.agencyName}
              </Text>
            </View>
            {protocol.stateCode && (
              <Text style={{ fontSize: 13, color: colors.muted, marginTop: 4, marginLeft: 26 }}>
                {protocol.stateCode} • {protocol.protocolNumber || 'No number'}
              </Text>
            )}
          </View>

          {/* Key points */}
          {protocol.keyPoints.length > 0 && (
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 14,
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 10 }}>
                Key Points
              </Text>
              {protocol.keyPoints.map((point, i) => (
                <View key={i} style={{ flexDirection: 'row', marginBottom: 8 }}>
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: colors.primary + '20',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 10,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '600', color: colors.primary }}>
                      {i + 1}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 13, color: colors.text, flex: 1, lineHeight: 18 }}>
                    {point}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Medications */}
          {protocol.medications.length > 0 && (
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 14,
                marginBottom: 12,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <IconSymbol name="pills.fill" size={18} color="#7C3AED" />
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginLeft: 8 }}>
                  Medications
                </Text>
              </View>
              {protocol.medications.map((med, i) => (
                <View
                  key={i}
                  style={{
                    backgroundColor: colors.background,
                    borderRadius: 8,
                    padding: 10,
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                    {med.name}
                  </Text>
                  <View style={{ flexDirection: 'row', marginTop: 4, gap: 8 }}>
                    {med.dose && (
                      <View
                        style={{
                          backgroundColor: '#7C3AED' + '20',
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 4,
                        }}
                      >
                        <Text style={{ fontSize: 12, color: '#7C3AED' }}>{med.dose}</Text>
                      </View>
                    )}
                    {med.route && (
                      <View
                        style={{
                          backgroundColor: colors.primary + '20',
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 4,
                        }}
                      >
                        <Text style={{ fontSize: 12, color: colors.primary }}>{med.route}</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Contraindications */}
          {protocol.contraindications.length > 0 && (
            <View
              style={{
                backgroundColor: '#DC2626' + '10',
                borderRadius: 12,
                padding: 14,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: '#DC2626' + '30',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <IconSymbol name="xmark.octagon.fill" size={18} color="#DC2626" />
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#DC2626', marginLeft: 8 }}>
                  Contraindications
                </Text>
              </View>
              {protocol.contraindications.map((contra, i) => (
                <Text key={i} style={{ fontSize: 13, color: colors.text, marginBottom: 6, lineHeight: 18 }}>
                  • {contra}
                </Text>
              ))}
            </View>
          )}

          {/* Full content */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 12,
              padding: 14,
              marginBottom: 20,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 10 }}>
              Full Protocol Text
            </Text>
            <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>
              {protocol.fullContent}
            </Text>
          </View>
        </ScrollView>
      </Animated.View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>
              Protocol Comparison
            </Text>
            <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>
              Compare similar protocols across agencies
            </Text>
          </View>
          {onClose && (
            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: colors.surface,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <IconSymbol name="xmark" size={18} color={colors.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search input */}
      <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surface,
            borderRadius: 12,
            paddingHorizontal: 14,
            height: 48,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <IconSymbol name="magnifyingglass" size={20} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search condition (e.g., chest pain, stroke)"
            placeholderTextColor={colors.muted}
            style={{
              flex: 1,
              marginLeft: 10,
              fontSize: 15,
              color: colors.text,
            }}
            returnKeyType="search"
            onSubmitEditing={() => handleSearch()}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <IconSymbol name="xmark.circle.fill" size={20} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Search button */}
        <TouchableOpacity
          onPress={() => handleSearch()}
          disabled={!query.trim() || isSearching}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: query.trim() ? colors.primary : colors.muted,
            borderRadius: 12,
            height: 48,
            marginTop: 10,
            opacity: query.trim() ? 1 : 0.4,
          }}
        >
          {isSearching ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <IconSymbol name="arrow.triangle.branch" size={18} color="#fff" />
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff', marginLeft: 8 }}>
                Find Similar Protocols
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Related conditions */}
      {relatedQuery.data?.relatedConditions && relatedQuery.data.relatedConditions.length > 0 && !hasSearched && (
        <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
          <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 8 }}>
            Related conditions to compare:
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {relatedQuery.data.relatedConditions.map((condition, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => handleRelatedSearch(condition)}
                style={{
                  backgroundColor: colors.surface,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 20,
                  marginRight: 8,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ fontSize: 13, color: colors.text }}>{condition}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Error */}
      {error && (
        <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
          <View
            style={{
              backgroundColor: '#DC2626' + '15',
              borderRadius: 12,
              padding: 14,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <IconSymbol name="exclamationmark.triangle.fill" size={20} color="#DC2626" />
            <Text style={{ fontSize: 14, color: '#DC2626', marginLeft: 10, flex: 1 }}>
              {error}
            </Text>
          </View>
        </View>
      )}

      {/* Results */}
      {comparisonResult && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          {/* Comparison summary */}
          {comparisonResult.protocols.length >= 2 && (
            <Animated.View entering={FadeIn.duration(200)}>
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 16,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <IconSymbol name="chart.bar.xaxis" size={20} color={colors.primary} />
                  <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, marginLeft: 10 }}>
                    Comparison Summary
                  </Text>
                </View>

                {/* View mode tabs */}
                <View style={{ flexDirection: 'row', marginBottom: 14, gap: 8 }}>
                  {[
                    { key: 'summary', label: 'Summary', icon: 'list.bullet' },
                    { key: 'medications', label: 'Meds', icon: 'pills.fill' },
                  ].map((tab) => (
                    <TouchableOpacity
                      key={tab.key}
                      onPress={() => setViewMode(tab.key as any)}
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingVertical: 8,
                        borderRadius: 8,
                        backgroundColor: viewMode === tab.key ? colors.primary + '15' : colors.background,
                        borderWidth: 1,
                        borderColor: viewMode === tab.key ? colors.primary : colors.border,
                      }}
                    >
                      <IconSymbol
                        name={tab.icon as any}
                        size={14}
                        color={viewMode === tab.key ? colors.primary : colors.muted}
                      />
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '600',
                          color: viewMode === tab.key ? colors.primary : colors.muted,
                          marginLeft: 6,
                        }}
                      >
                        {tab.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Summary view */}
                {viewMode === 'summary' && (
                  <>
                    {/* Key differences */}
                    {comparisonResult.comparisonSummary.keyDifferences.length > 0 && (
                      <View style={{ marginBottom: 12 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                          Key Differences
                        </Text>
                        {comparisonResult.comparisonSummary.keyDifferences.map((diff, i) => (
                          <View key={i} style={{ flexDirection: 'row', marginBottom: 6 }}>
                            <IconSymbol name="arrow.left.arrow.right" size={14} color="#F59E0B" />
                            <Text style={{ fontSize: 13, color: colors.text, marginLeft: 8, flex: 1 }}>
                              {diff}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Common medications */}
                    {comparisonResult.comparisonSummary.commonMedications.length > 0 && (
                      <View style={{ marginBottom: 12 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                          Common Across All Protocols
                        </Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                          {comparisonResult.comparisonSummary.commonMedications.map((med, i) => (
                            <View
                              key={i}
                              style={{
                                backgroundColor: '#22C55E' + '20',
                                paddingHorizontal: 10,
                                paddingVertical: 4,
                                borderRadius: 12,
                              }}
                            >
                              <Text style={{ fontSize: 12, color: '#22C55E', fontWeight: '500' }}>
                                {med}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {/* Varying medications */}
                    {comparisonResult.comparisonSummary.varyingMedications.length > 0 && (
                      <View>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                          Not In All Protocols
                        </Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                          {comparisonResult.comparisonSummary.varyingMedications.map((med, i) => (
                            <View
                              key={i}
                              style={{
                                backgroundColor: '#F59E0B' + '20',
                                paddingHorizontal: 10,
                                paddingVertical: 4,
                                borderRadius: 12,
                              }}
                            >
                              <Text style={{ fontSize: 12, color: '#F59E0B', fontWeight: '500' }}>
                                {med}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </>
                )}

                {/* Medications view */}
                {viewMode === 'medications' && (
                  <>
                    {comparisonResult.comparisonSummary.doseVariations.map((variation, i) => (
                      <View
                        key={i}
                        style={{
                          backgroundColor: colors.background,
                          borderRadius: 10,
                          padding: 12,
                          marginBottom: 8,
                        }}
                      >
                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                          {variation.medication}
                        </Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                          {variation.variations.map((dose, j) => (
                            <View
                              key={j}
                              style={{
                                backgroundColor: '#7C3AED' + '20',
                                paddingHorizontal: 8,
                                paddingVertical: 3,
                                borderRadius: 6,
                              }}
                            >
                              <Text style={{ fontSize: 12, color: '#7C3AED' }}>{dose}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    ))}
                    {comparisonResult.comparisonSummary.doseVariations.length === 0 && (
                      <Text style={{ fontSize: 13, color: colors.muted, textAlign: 'center', padding: 20 }}>
                        No significant dose variations found
                      </Text>
                    )}
                  </>
                )}
              </View>
            </Animated.View>
          )}

          {/* Protocol cards */}
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 12 }}>
            {comparisonResult.protocols.length} Protocol{comparisonResult.protocols.length !== 1 ? 's' : ''} Found
          </Text>

          {comparisonResult.protocols.map((protocol, index) => (
            <Animated.View
              key={protocol.id}
              entering={FadeIn.delay(index * 100).duration(200)}
            >
              <TouchableOpacity
                onPress={() => setSelectedProtocolIndex(index)}
                activeOpacity={0.8}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 14,
                  padding: 16,
                  marginBottom: 12,
                  borderLeftWidth: 4,
                  borderLeftColor: colors.primary,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }} numberOfLines={2}>
                      {protocol.protocolTitle}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.primary, marginTop: 4 }}>
                      {protocol.agencyName}
                    </Text>
                    {protocol.stateCode && (
                      <Text style={{ fontSize: 11, color: colors.muted }}>
                        {protocol.stateCode} • {protocol.protocolNumber || 'No number'}
                      </Text>
                    )}
                  </View>
                  <View
                    style={{
                      backgroundColor: colors.primary + '20',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 6,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '600', color: colors.primary }}>
                      {Math.round(protocol.similarity * 100)}%
                    </Text>
                  </View>
                </View>

                {/* Quick stats */}
                <View style={{ flexDirection: 'row', marginTop: 12, gap: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <IconSymbol name="pills.fill" size={14} color={colors.muted} />
                    <Text style={{ fontSize: 12, color: colors.muted, marginLeft: 4 }}>
                      {protocol.medications.length} meds
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <IconSymbol name="list.bullet" size={14} color={colors.muted} />
                    <Text style={{ fontSize: 12, color: colors.muted, marginLeft: 4 }}>
                      {protocol.keyPoints.length} steps
                    </Text>
                  </View>
                </View>

                {/* Content preview */}
                <Text
                  style={{ fontSize: 12, color: colors.muted, marginTop: 10, lineHeight: 16 }}
                  numberOfLines={2}
                >
                  {protocol.content}
                </Text>

                {/* View more */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 10 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>
                    View Details
                  </Text>
                  <IconSymbol name="chevron.right" size={14} color={colors.primary} style={{ marginLeft: 4 }} />
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}

          {comparisonResult.protocols.length === 0 && (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <IconSymbol name="doc.text.magnifyingglass" size={48} color={colors.muted} />
              <Text style={{ fontSize: 15, color: colors.text, marginTop: 12, textAlign: 'center' }}>
                No similar protocols found
              </Text>
              <Text style={{ fontSize: 13, color: colors.muted, marginTop: 4, textAlign: 'center' }}>
                Try a different search term or condition
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Empty state */}
      {!hasSearched && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
          <IconSymbol name="arrow.triangle.branch" size={64} color={colors.muted} />
          <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text, marginTop: 16, textAlign: 'center' }}>
            Compare Similar Protocols
          </Text>
          <Text style={{ fontSize: 14, color: colors.muted, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
            Search for a condition to find and compare protocols from different agencies.
            Useful for differential diagnosis and understanding regional variations.
          </Text>

          {/* Example searches */}
          <View style={{ marginTop: 24, width: '100%' }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.muted, marginBottom: 10 }}>
              Try searching:
            </Text>
            {['chest pain', 'cardiac arrest', 'seizure', 'pediatric asthma'].map((example, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => handleRelatedSearch(example)}
                style={{
                  backgroundColor: colors.surface,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderRadius: 10,
                  marginBottom: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <IconSymbol name="magnifyingglass" size={16} color={colors.muted} />
                <Text style={{ fontSize: 14, color: colors.text, marginLeft: 10 }}>{example}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

export default ProtocolComparison;
