/**
 * California Protocols Landing Page - SEO Optimized
 * 
 * Overview page for all California county EMS protocols.
 * URL: /california/protocols
 */

import { View, Text, ScrollView, Pressable } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ScreenContainer } from "@/components/screen-container";
import { SEOHead, MedicalWebPageSchema, BreadcrumbSchema } from "@/components/seo";

// Top California counties by population
const CA_COUNTIES = [
  { slug: "los-angeles", name: "Los Angeles County", population: "10M+" },
  { slug: "san-diego", name: "San Diego County", population: "3.3M" },
  { slug: "orange", name: "Orange County", population: "3.2M" },
  { slug: "riverside", name: "Riverside County", population: "2.5M" },
  { slug: "san-bernardino", name: "San Bernardino County", population: "2.2M" },
  { slug: "santa-clara", name: "Santa Clara County", population: "1.9M" },
  { slug: "alameda", name: "Alameda County", population: "1.7M" },
  { slug: "sacramento", name: "Sacramento County", population: "1.6M" },
  { slug: "contra-costa", name: "Contra Costa County", population: "1.2M" },
  { slug: "fresno", name: "Fresno County", population: "1M" },
  { slug: "kern", name: "Kern County", population: "900K" },
  { slug: "san-francisco", name: "San Francisco County", population: "870K" },
  { slug: "ventura", name: "Ventura County", population: "850K" },
  { slug: "san-mateo", name: "San Mateo County", population: "765K" },
  { slug: "san-joaquin", name: "San Joaquin County", population: "780K" },
  { slug: "marin", name: "Marin County", population: "260K" },
  { slug: "santa-cruz", name: "Santa Cruz County", population: "270K" },
  { slug: "monterey", name: "Monterey County", population: "435K" },
  { slug: "solano", name: "Solano County", population: "450K" },
  { slug: "sonoma", name: "Sonoma County", population: "490K" },
];

const COLORS = {
  bgDark: "#0F172A",
  bgSurface: "#1E293B",
  textWhite: "#F1F5F9",
  textMuted: "#94A3B8",
  primaryRed: "#EF4444",
  border: "#475569",
};

export default function CaliforniaProtocolsPage() {
  const handleCountyPress = (countySlug: string) => {
    router.push(`/(seo)/california/${countySlug}/protocols`);
  };

  const handleSearch = () => {
    router.push("/(tabs)/search");
  };

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <SEOHead
        title="California EMS Protocols"
        description="Access EMS protocols for all 58 California counties. Find paramedic and EMT treatment protocols for Los Angeles, San Diego, Orange County, and more. Instant search, works offline."
        path="/california/protocols"
        keywords={[
          "California EMS protocols",
          "CA paramedic protocols",
          "California EMT protocols",
          "LEMSA protocols",
          "prehospital protocols California",
        ]}
      />

      <MedicalWebPageSchema
        name="California EMS Protocols"
        description="Complete EMS protocol reference for all California counties. Paramedic and EMT treatment guidelines."
        url="/california/protocols"
        specialty="Emergency Medicine"
      />

      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "California", url: "/california/protocols" },
        ]}
      />

      <StatusBar style="light" />

      <ScrollView
        style={{ flex: 1, backgroundColor: COLORS.bgDark }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={{ padding: 24, paddingTop: 48 }}>
          <Text style={{ color: COLORS.textMuted, fontSize: 14, marginBottom: 8 }}>
            EMS Protocols
          </Text>
          
          <Text
            style={{
              color: COLORS.textWhite,
              fontSize: 36,
              fontWeight: "900",
              marginBottom: 16,
              lineHeight: 44,
            }}
          >
            California{"\n"}
            <Text style={{ color: COLORS.primaryRed }}>EMS Protocols</Text>
          </Text>

          <Text style={{ color: COLORS.textMuted, fontSize: 16, lineHeight: 24, marginBottom: 24 }}>
            Access EMS treatment protocols for all 58 California counties. 
            Each county&apos;s protocols are maintained by their local EMS agency (LEMSA).
            Protocol Guide keeps them updated and searchable.
          </Text>

          {/* Stats */}
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 32 }}>
            <View style={{ flex: 1, backgroundColor: COLORS.bgSurface, padding: 16, borderRadius: 12, alignItems: "center" }}>
              <Text style={{ color: COLORS.primaryRed, fontSize: 28, fontWeight: "900" }}>58</Text>
              <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>Counties</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: COLORS.bgSurface, padding: 16, borderRadius: 12, alignItems: "center" }}>
              <Text style={{ color: COLORS.primaryRed, fontSize: 28, fontWeight: "900" }}>55K+</Text>
              <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>Protocol Sections</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: COLORS.bgSurface, padding: 16, borderRadius: 12, alignItems: "center" }}>
              <Text style={{ color: COLORS.primaryRed, fontSize: 28, fontWeight: "900" }}>&lt;2s</Text>
              <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>Search Time</Text>
            </View>
          </View>

          <Pressable
            onPress={handleSearch}
            style={{
              backgroundColor: COLORS.primaryRed,
              paddingVertical: 18,
              paddingHorizontal: 32,
              borderRadius: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "700" }}>
              Search All CA Protocols
            </Text>
          </Pressable>
        </View>

        {/* County List */}
        <View style={{ padding: 24 }}>
          <Text style={{ color: COLORS.textWhite, fontSize: 24, fontWeight: "700", marginBottom: 16 }}>
            Select Your County
          </Text>
          
          <View style={{ gap: 8 }}>
            {CA_COUNTIES.map((county) => (
              <Pressable
                key={county.slug}
                onPress={() => handleCountyPress(county.slug)}
                style={{
                  backgroundColor: COLORS.bgSurface,
                  padding: 16,
                  borderRadius: 10,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                <View>
                  <Text style={{ color: COLORS.textWhite, fontSize: 16, fontWeight: "600" }}>
                    {county.name}
                  </Text>
                  <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>
                    Population: {county.population}
                  </Text>
                </View>
                <Text style={{ color: COLORS.textMuted, fontSize: 18 }}>→</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* SEO Content */}
        <View style={{ padding: 24, backgroundColor: COLORS.bgSurface }}>
          <Text style={{ color: COLORS.textWhite, fontSize: 20, fontWeight: "700", marginBottom: 12 }}>
            About California EMS Protocols
          </Text>
          <Text style={{ color: COLORS.textMuted, fontSize: 14, lineHeight: 22 }}>
            California&apos;s EMS system is organized by Local Emergency Medical Services Agencies (LEMSAs), 
            with each of the 58 counties maintaining their own approved treatment protocols. These protocols 
            guide paramedics and EMTs in providing prehospital emergency care.
            {"\n\n"}
            Protocol Guide provides instant access to all California county protocols, updated regularly 
            to reflect the latest medical director approvals. Our AI-powered search helps you find the 
            exact protocol you need in seconds—whether you&apos;re looking up cardiac arrest algorithms, 
            pediatric dosing, or trauma assessment guidelines.
            {"\n\n"}
            All protocols are sourced from official LEMSA publications and verified for accuracy.
          </Text>
        </View>

        {/* Footer */}
        <View style={{ padding: 24, paddingBottom: 48, alignItems: "center" }}>
          <Pressable
            onPress={handleSearch}
            style={{
              backgroundColor: COLORS.primaryRed,
              paddingVertical: 14,
              paddingHorizontal: 28,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600" }}>
              Start Searching
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
