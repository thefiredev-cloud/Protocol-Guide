import { useState, useEffect } from "react";
import { ScrollView, Text, View, Pressable, TouchableOpacity } from "react-native";
import { SkeletonCard, Skeleton } from "@/components/ui/Skeleton";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { getApiBaseUrl } from "@/constants/oauth";
import { trpc } from "@/lib/trpc";
import { StateDetailView } from "@/components/state-detail-view";

// US State coordinates for simplified map (relative positions 0-100)
const STATE_POSITIONS: Record<string, { x: number; y: number; width: number; height: number }> = {
  WA: { x: 10, y: 2, width: 9, height: 7 },
  OR: { x: 8, y: 10, width: 10, height: 8 },
  CA: { x: 5, y: 19, width: 8, height: 18 },
  NV: { x: 14, y: 16, width: 7, height: 11 },
  ID: { x: 18, y: 5, width: 7, height: 12 },
  MT: { x: 24, y: 2, width: 13, height: 8 },
  WY: { x: 26, y: 11, width: 10, height: 7 },
  UT: { x: 19, y: 19, width: 7, height: 9 },
  AZ: { x: 17, y: 30, width: 8, height: 10 },
  CO: { x: 27, y: 20, width: 9, height: 8 },
  NM: { x: 26, y: 30, width: 8, height: 10 },
  ND: { x: 37, y: 2, width: 9, height: 6 },
  SD: { x: 37, y: 9, width: 9, height: 6 },
  NE: { x: 36, y: 16, width: 11, height: 6 },
  KS: { x: 37, y: 23, width: 10, height: 6 },
  OK: { x: 37, y: 30, width: 10, height: 6 },
  TX: { x: 34, y: 37, width: 15, height: 16 },
  MN: { x: 46, y: 3, width: 8, height: 9 },
  IA: { x: 46, y: 13, width: 8, height: 6 },
  MO: { x: 47, y: 21, width: 8, height: 8 },
  AR: { x: 48, y: 30, width: 7, height: 6 },
  LA: { x: 49, y: 38, width: 7, height: 6 },
  WI: { x: 53, y: 5, width: 7, height: 8 },
  IL: { x: 54, y: 14, width: 6, height: 10 },
  MI: { x: 58, y: 5, width: 8, height: 10 },
  IN: { x: 59, y: 16, width: 5, height: 7 },
  OH: { x: 64, y: 15, width: 6, height: 7 },
  KY: { x: 60, y: 24, width: 9, height: 5 },
  TN: { x: 58, y: 30, width: 10, height: 4 },
  MS: { x: 55, y: 35, width: 5, height: 8 },
  AL: { x: 60, y: 35, width: 5, height: 8 },
  GA: { x: 65, y: 35, width: 6, height: 8 },
  FL: { x: 67, y: 44, width: 8, height: 12 },
  SC: { x: 70, y: 32, width: 6, height: 5 },
  NC: { x: 69, y: 27, width: 9, height: 5 },
  VA: { x: 70, y: 22, width: 9, height: 5 },
  WV: { x: 68, y: 18, width: 5, height: 5 },
  PA: { x: 72, y: 12, width: 7, height: 5 },
  NY: { x: 75, y: 5, width: 8, height: 8 },
  VT: { x: 81, y: 3, width: 3, height: 5 },
  NH: { x: 84, y: 4, width: 3, height: 5 },
  ME: { x: 86, y: 1, width: 5, height: 8 },
  MA: { x: 84, y: 10, width: 5, height: 3 },
  RI: { x: 87, y: 13, width: 3, height: 3 },
  CT: { x: 83, y: 14, width: 4, height: 3 },
  NJ: { x: 79, y: 14, width: 3, height: 5 },
  DE: { x: 79, y: 19, width: 3, height: 3 },
  MD: { x: 76, y: 19, width: 4, height: 3 },
  AK: { x: 5, y: 48, width: 12, height: 10 },
  HI: { x: 22, y: 52, width: 8, height: 5 },
  DC: { x: 78, y: 22, width: 2, height: 2 },
};

// State name to code mapping
const STATE_CODE_MAP: Record<string, string> = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
  'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
  'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
  'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
  'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
  'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
  'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY',
  'District of Columbia': 'DC',
  // Also handle if state codes are already in the data
  'AL': 'AL', 'AK': 'AK', 'AZ': 'AZ', 'AR': 'AR', 'CA': 'CA', 'CO': 'CO', 'CT': 'CT',
  'DE': 'DE', 'FL': 'FL', 'GA': 'GA', 'HI': 'HI', 'ID': 'ID', 'IL': 'IL', 'IN': 'IN',
  'IA': 'IA', 'KS': 'KS', 'KY': 'KY', 'LA': 'LA', 'ME': 'ME', 'MD': 'MD', 'MA': 'MA',
  'MI': 'MI', 'MN': 'MN', 'MS': 'MS', 'MO': 'MO', 'MT': 'MT', 'NE': 'NE', 'NV': 'NV',
  'NH': 'NH', 'NJ': 'NJ', 'NM': 'NM', 'NY': 'NY', 'NC': 'NC', 'ND': 'ND', 'OH': 'OH',
  'OK': 'OK', 'OR': 'OR', 'PA': 'PA', 'RI': 'RI', 'SC': 'SC', 'SD': 'SD', 'TN': 'TN',
  'TX': 'TX', 'UT': 'UT', 'VT': 'VT', 'VA': 'VA', 'WA': 'WA', 'WV': 'WV', 'WI': 'WI',
  'WY': 'WY', 'DC': 'DC',
};

// Beautiful gradient colors based on coverage
function getCoverageColor(chunks: number): { bg: string; border: string; text: string } {
  if (chunks === 0) return { bg: "#F1F5F9", border: "#CBD5E1", text: "#64748B" };
  if (chunks < 100) return { bg: "#DBEAFE", border: "#93C5FD", text: "#1E40AF" };
  if (chunks < 500) return { bg: "#A5B4FC", border: "#818CF8", text: "#FFFFFF" };
  if (chunks < 1000) return { bg: "#818CF8", border: "#6366F1", text: "#FFFFFF" };
  if (chunks < 2000) return { bg: "#6366F1", border: "#4F46E5", text: "#FFFFFF" };
  if (chunks < 4000) return { bg: "#4F46E5", border: "#4338CA", text: "#FFFFFF" };
  return { bg: "#3730A3", border: "#312E81", text: "#FFFFFF" };
}

// Get coverage level label
function getCoverageLevel(chunks: number): string {
  if (chunks === 0) return "No Data";
  if (chunks < 100) return "Minimal";
  if (chunks < 500) return "Low";
  if (chunks < 1000) return "Moderate";
  if (chunks < 2000) return "Good";
  if (chunks < 4000) return "Very Good";
  return "Excellent";
}

// API response types from Rust server
interface RustStateData {
  state: string;
  agency_count: number;
  protocol_count: number;
}

interface RustStats {
  total_protocols: number;
  total_counties: number;
  states_covered: number;
}

// Internal state coverage type
interface StateCoverage {
  state: string;
  stateCode: string;
  chunks: number;
  counties: number;
}

interface TotalStats {
  totalChunks: number;
  totalCounties: number;
  statesWithCoverage: number;
}

export default function CoverageScreen() {
  const [selectedState, setSelectedState] = useState<StateCoverage | null>(null);
  const [coverageData, setCoverageData] = useState<StateCoverage[]>([]);
  const [totalStats, setTotalStats] = useState<TotalStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showStateDetail, setShowStateDetail] = useState(false);
  const router = useRouter();
  const colors = useColors();
  
  // Use tRPC to fetch coverage data
  const { data: coverageResult, isLoading: coverageLoading, error: coverageError } = trpc.search.coverageByState.useQuery();
  const { data: statsResult } = trpc.search.totalStats.useQuery();
  
  // Transform tRPC data to our internal format
  useEffect(() => {
    if (coverageResult) {
      // Data is already in the correct format from tRPC
      const transformedData = coverageResult
        .filter((s: StateCoverage) => s.chunks > 0)
        .sort((a: StateCoverage, b: StateCoverage) => b.chunks - a.chunks);
      setCoverageData(transformedData);
    }
    
    if (statsResult) {
      setTotalStats({
        totalChunks: statsResult.totalChunks,
        totalCounties: statsResult.totalCounties,
        statesWithCoverage: statsResult.statesWithCoverage,
      });
    }
    
    setIsLoading(coverageLoading);
    if (coverageError) {
      setError(coverageError.message);
    }
  }, [coverageResult, statsResult, coverageLoading, coverageError]);
  

  
  // Navigate to search with state filter
  const navigateToSearch = (stateName: string) => {
    router.push({
      pathname: "/(tabs)",
      params: { stateFilter: stateName }
    });
  };
  
  // Create a map of state code to coverage data
  const coverageMap = new Map<string, StateCoverage>();
  for (const item of coverageData) {
    coverageMap.set(item.stateCode, item);
  }
  
  // Get coverage for a state
  const getStateCoverage = (stateCode: string): number => {
    return coverageMap.get(stateCode)?.chunks || 0;
  };
  
  return (
    <ScreenContainer className="p-4">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="mb-5">
          <Text className="text-2xl font-bold text-foreground">Protocol Coverage</Text>
          <Text className="text-sm text-muted mt-1">
            Tap any state to explore its protocols
          </Text>
        </View>
        
        {isLoading ? (
          <View className="flex-1 py-4">
            <Text className="text-muted mb-4">Loading coverage data...</Text>
            {/* Stats Cards Skeleton */}
            <View className="flex-row flex-wrap justify-between mb-5">
              <SkeletonCard showImage={false} lines={1} style={{ width: '48%', marginBottom: 12 }} />
              <SkeletonCard showImage={false} lines={1} style={{ width: '48%', marginBottom: 12 }} />
              <SkeletonCard showImage={false} lines={1} style={{ width: '48%' }} />
              <SkeletonCard showImage={false} lines={1} style={{ width: '48%' }} />
            </View>
            {/* Map Skeleton */}
            <Skeleton variant="card" height={200} style={{ marginBottom: 20 }} />
            {/* List Skeleton */}
            <Skeleton variant="card" height={300} />
          </View>
        ) : error ? (
          <View className="flex-1 items-center justify-center py-20">
            <IconSymbol name="exclamationmark.triangle.fill" size={48} color="#EF4444" />
            <Text className="text-error mt-4 text-center">{error}</Text>
            <TouchableOpacity
              onPress={() => {
                setIsLoading(true);
                setError(null);
                // Re-trigger the useEffect by forcing a re-render
                setCoverageData([]);
              }}
              className="mt-4 px-4 py-2 bg-primary rounded-lg"
            >
              <Text className="text-white font-medium">Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Stats Cards */}
            <View className="flex-row flex-wrap justify-between mb-5">
              <View className="bg-surface rounded-2xl p-4 mb-3 border border-border" style={{ width: '48%' }}>
                <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center mb-2">
                  <IconSymbol name="paperplane.fill" size={20} color="#6366F1" />
                </View>
                <Text className="text-2xl font-bold text-foreground">
                  {totalStats?.totalChunks?.toLocaleString() || 0}
                </Text>
                <Text className="text-xs text-muted">Protocol Chunks</Text>
              </View>
              <View className="bg-surface rounded-2xl p-4 mb-3 border border-border" style={{ width: '48%' }}>
                <View className="w-10 h-10 rounded-full bg-success/10 items-center justify-center mb-2">
                  <IconSymbol name="map.fill" size={20} color="#22C55E" />
                </View>
                <Text className="text-2xl font-bold text-foreground">
                  {coverageData.filter(s => s.chunks > 0).length || 0}
                </Text>
                <Text className="text-xs text-muted">States with Data</Text>
              </View>
              <View className="bg-surface rounded-2xl p-4 border border-border" style={{ width: '48%' }}>
                <View className="w-10 h-10 rounded-full bg-warning/10 items-center justify-center mb-2">
                  <IconSymbol name="house.fill" size={20} color="#F59E0B" />
                </View>
                <Text className="text-2xl font-bold text-foreground">
                  {totalStats?.totalCounties?.toLocaleString() || 0}
                </Text>
                <Text className="text-xs text-muted">Counties/Agencies</Text>
              </View>
              <View className="bg-surface rounded-2xl p-4 border border-border" style={{ width: '48%' }}>
                <View className="w-10 h-10 rounded-full bg-error/10 items-center justify-center mb-2">
                  <IconSymbol name="flag.fill" size={20} color="#EF4444" />
                </View>
                <Text className="text-2xl font-bold text-foreground">
                  {totalStats?.statesWithCoverage || 0}
                </Text>
                <Text className="text-xs text-muted">States Covered</Text>
              </View>
            </View>
            
            {/* US Map */}
            <View className="bg-surface rounded-2xl p-5 mb-5 border border-border shadow-sm">
              <Text className="text-lg font-semibold text-foreground mb-4">United States Coverage</Text>
              <View 
                style={{ 
                  width: '100%', 
                  aspectRatio: 1.5,
                  backgroundColor: '#FAFBFC',
                  borderRadius: 16,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Background grid pattern */}
                <View style={{ position: 'absolute', inset: 0, opacity: 0.3 }}>
                  {[...Array(10)].map((_, i) => (
                    <View 
                      key={`h-${i}`}
                      style={{ 
                        position: 'absolute', 
                        left: 0, 
                        right: 0, 
                        top: `${i * 10}%`, 
                        height: 1, 
                        backgroundColor: '#E2E8F0' 
                      }} 
                    />
                  ))}
                  {[...Array(10)].map((_, i) => (
                    <View 
                      key={`v-${i}`}
                      style={{ 
                        position: 'absolute', 
                        top: 0, 
                        bottom: 0, 
                        left: `${i * 10}%`, 
                        width: 1, 
                        backgroundColor: '#E2E8F0' 
                      }} 
                    />
                  ))}
                </View>
                
                {Object.entries(STATE_POSITIONS).map(([stateCode, pos]) => {
                  const coverage = getStateCoverage(stateCode);
                  const stateData = coverageMap.get(stateCode);
                  const colorScheme = getCoverageColor(coverage);
                  const isSelected = selectedState?.stateCode === stateCode;
                  
                  return (
                    <Pressable
                      key={stateCode}
                      onPress={() => setSelectedState(stateData || { 
                        state: getStateName(stateCode), 
                        stateCode, 
                        chunks: 0, 
                        counties: 0 
                      })}
                      style={({ pressed }) => ({
                        position: 'absolute',
                        left: `${pos.x}%`,
                        top: `${pos.y}%`,
                        width: `${pos.width}%`,
                        height: `${pos.height}%`,
                        backgroundColor: colorScheme.bg,
                        borderWidth: isSelected ? 2 : 1,
                        borderColor: isSelected ? '#1E40AF' : colorScheme.border,
                        borderRadius: 4,
                        justifyContent: 'center',
                        alignItems: 'center',
                        transform: [{ scale: pressed ? 0.95 : isSelected ? 1.05 : 1 }],
                        shadowColor: isSelected ? '#000' : 'transparent',
                        shadowOffset: { width: 0, height: isSelected ? 2 : 0 },
                        shadowOpacity: isSelected ? 0.15 : 0,
                        shadowRadius: isSelected ? 4 : 0,
                        elevation: isSelected ? 3 : 0,
                        zIndex: isSelected ? 10 : 1,
                      })}
                    >
                      <Text 
                        style={{ 
                          fontSize: pos.width > 8 ? 10 : 8, 
                          fontWeight: '700',
                          color: colorScheme.text,
                          letterSpacing: 0.5,
                        }}
                      >
                        {stateCode}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              
              {/* Legend */}
              <View className="flex-row flex-wrap justify-center mt-4 pt-4 border-t border-border">
                {[
                  { label: "No Data", bg: "#F1F5F9", border: "#CBD5E1" },
                  { label: "< 500", bg: "#A5B4FC", border: "#818CF8" },
                  { label: "500-2K", bg: "#6366F1", border: "#4F46E5" },
                  { label: "2K+", bg: "#3730A3", border: "#312E81" },
                ].map((item) => (
                  <View key={item.label} className="flex-row items-center mx-2 my-1">
                    <View 
                      style={{ 
                        width: 16, 
                        height: 16, 
                        backgroundColor: item.bg,
                        borderRadius: 4,
                        marginRight: 6,
                        borderWidth: 1,
                        borderColor: item.border,
                      }} 
                    />
                    <Text className="text-xs text-muted font-medium">{item.label}</Text>
                  </View>
                ))}
              </View>
            </View>
            
            {/* Selected State Details */}
            {selectedState && (
              <Animated.View 
                entering={FadeIn.duration(200)} 
                exiting={FadeOut.duration(150)}
                className="bg-surface rounded-2xl p-5 mb-5 border border-border shadow-sm"
              >
                <View className="flex-row justify-between items-start mb-4">
                  <View className="flex-1">
                    <Text className="text-xl font-bold text-foreground">
                      {selectedState.state}
                    </Text>
                    <Text className="text-sm text-muted mt-1">
                      {selectedState.stateCode} • {getCoverageLevel(selectedState.chunks)} Coverage
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedState(null)}
                    className="w-8 h-8 rounded-full bg-background items-center justify-center"
                  >
                    <Text className="text-muted text-lg">×</Text>
                  </TouchableOpacity>
                </View>
                
                <View className="flex-row mb-4">
                  <View className="flex-1 bg-background rounded-xl p-3 mr-2">
                    <Text className="text-2xl font-bold text-primary">
                      {selectedState.chunks.toLocaleString()}
                    </Text>
                    <Text className="text-xs text-muted">Protocol Chunks</Text>
                  </View>
                  <View className="flex-1 bg-background rounded-xl p-3 ml-2">
                    <Text className="text-2xl font-bold text-primary">
                      {selectedState.counties}
                    </Text>
                    <Text className="text-xs text-muted">Counties/Agencies</Text>
                  </View>
                </View>
                
                {selectedState.chunks > 0 ? (
                  <View className="gap-3">
                    <TouchableOpacity
                      onPress={() => setShowStateDetail(true)}
                      className="bg-primary rounded-xl py-4 flex-row items-center justify-center"
                      activeOpacity={0.8}
                    >
                      <IconSymbol name="house.fill" size={18} color="#FFFFFF" />
                      <Text className="text-white font-semibold ml-2">
                        View {selectedState.counties} Agencies
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => navigateToSearch(selectedState.state)}
                      className="bg-surface border border-primary rounded-xl py-4 flex-row items-center justify-center"
                      activeOpacity={0.8}
                    >
                      <IconSymbol name="magnifyingglass" size={18} color="#6366F1" />
                      <Text className="text-primary font-semibold ml-2">
                        Search All Protocols
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View className="bg-background rounded-xl py-4 items-center">
                    <Text className="text-muted text-sm">
                      No protocols available for this state yet
                    </Text>
                  </View>
                )}
              </Animated.View>
            )}
            
            {/* Top States List */}
            <View className="bg-surface rounded-2xl p-5 border border-border">
              <Text className="text-lg font-semibold text-foreground mb-4">Top States by Coverage</Text>
              {coverageData
                .filter(s => s.chunks > 0)
                .slice(0, 8)
                .map((state, index) => {
                  const colorScheme = getCoverageColor(state.chunks);
                  const maxChunks = coverageData[0]?.chunks || 1;
                  const percentage = (state.chunks / maxChunks) * 100;
                  
                  return (
                    <TouchableOpacity
                      key={state.stateCode}
                      onPress={() => setSelectedState(state)}
                      className="mb-3"
                      activeOpacity={0.7}
                    >
                      <View className="flex-row items-center justify-between mb-1">
                        <View className="flex-row items-center">
                          <View 
                            className="w-6 h-6 rounded-full items-center justify-center mr-3"
                            style={{ backgroundColor: colorScheme.bg }}
                          >
                            <Text style={{ fontSize: 10, fontWeight: '700', color: colorScheme.text }}>
                              {index + 1}
                            </Text>
                          </View>
                          <Text className="text-foreground font-medium">{state.state}</Text>
                        </View>
                        <Text className="text-muted text-sm font-medium">
                          {state.chunks.toLocaleString()}
                        </Text>
                      </View>
                      <View className="ml-9 h-2 bg-background rounded-full overflow-hidden">
                        <View 
                          style={{ 
                            width: `${percentage}%`, 
                            height: '100%', 
                            backgroundColor: colorScheme.bg,
                            borderRadius: 4,
                          }} 
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })}
            </View>
          </>
        )}
      </ScrollView>
      
      {/* State Detail Modal */}
      {selectedState && (
        <StateDetailView
          stateName={selectedState.state}
          stateCode={selectedState.stateCode}
          totalProtocols={selectedState.chunks}
          totalAgencies={selectedState.counties}
          visible={showStateDetail}
          onClose={() => setShowStateDetail(false)}
        />
      )}
    </ScreenContainer>
  );
}

// Helper function to get full state name from code
function getStateName(stateCode: string): string {
  const codeToName: Record<string, string> = {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
    'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
    'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
    'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
    'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
    'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
    'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
    'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
    'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
    'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming',
    'DC': 'District of Columbia',
  };
  return codeToName[stateCode] || stateCode;
}
