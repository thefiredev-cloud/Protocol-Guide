/**
 * County Protocol Landing Page - SEO Optimized
 * 
 * Static/SSR page for each California county's protocols.
 * Renders actual content for search engines and AI assistants.
 * 
 * URL: /california/{county}/protocols
 * Example: /california/los-angeles/protocols
 */

import { View, Text, ScrollView, Pressable } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ScreenContainer } from "@/components/screen-container";
import { SEOHead, MedicalWebPageSchema, BreadcrumbSchema, FAQPageSchema } from "@/components/seo";

// County display names and metadata
const COUNTY_DATA: Record<string, { 
  displayName: string; 
  population: string;
  emsAgency: string;
  description: string;
}> = {
  "los-angeles": {
    displayName: "Los Angeles County",
    population: "10 million+",
    emsAgency: "LA County EMS Agency",
    description: "Access Los Angeles County EMS protocols for paramedics and EMTs. Covers LA City Fire, LA County Fire, and private ambulance services.",
  },
  "orange": {
    displayName: "Orange County",
    population: "3.2 million",
    emsAgency: "Orange County EMS Agency",
    description: "Orange County EMS protocols for first responders. Includes protocols for all Orange County fire departments and ambulance services.",
  },
  "san-diego": {
    displayName: "San Diego County",
    population: "3.3 million",
    emsAgency: "San Diego County EMS",
    description: "San Diego County EMS treatment protocols. Covers San Diego Fire-Rescue, rural fire districts, and AMR operations.",
  },
  "san-francisco": {
    displayName: "San Francisco County",
    population: "870,000",
    emsAgency: "SF DEM EMS",
    description: "San Francisco EMS protocols for SFFD paramedics and EMTs. Urban protocols optimized for city response.",
  },
  "san-bernardino": {
    displayName: "San Bernardino County",
    population: "2.2 million",
    emsAgency: "ICEMA",
    description: "San Bernardino County EMS protocols via ICEMA. Largest county by area in the contiguous US.",
  },
  "riverside": {
    displayName: "Riverside County",
    population: "2.5 million",
    emsAgency: "Riverside County EMS Agency",
    description: "Riverside County EMS treatment protocols for Cal Fire, city fire departments, and AMR.",
  },
  "alameda": {
    displayName: "Alameda County",
    population: "1.7 million",
    emsAgency: "Alameda County EMS",
    description: "Alameda County EMS protocols covering Oakland, Berkeley, Fremont, and surrounding cities.",
  },
  "sacramento": {
    displayName: "Sacramento County",
    population: "1.6 million",
    emsAgency: "Sacramento County EMS Agency",
    description: "Sacramento County EMS protocols for Sacramento Metro Fire, city departments, and AMR.",
  },
  "santa-clara": {
    displayName: "Santa Clara County",
    population: "1.9 million",
    emsAgency: "Santa Clara County EMS Agency",
    description: "Santa Clara County EMS protocols for Silicon Valley fire departments and ambulance services.",
  },
  "contra-costa": {
    displayName: "Contra Costa County",
    population: "1.2 million",
    emsAgency: "Contra Costa EMS",
    description: "Contra Costa County EMS protocols. Covers Con Fire, city fire departments, and AMR.",
  },
  "fresno": {
    displayName: "Fresno County",
    population: "1 million",
    emsAgency: "Fresno County EMS",
    description: "Fresno County EMS protocols for Central Valley emergency responders.",
  },
  "kern": {
    displayName: "Kern County",
    population: "900,000",
    emsAgency: "Kern County EMS",
    description: "Kern County EMS protocols for Bakersfield and surrounding areas.",
  },
  "ventura": {
    displayName: "Ventura County",
    population: "850,000",
    emsAgency: "Ventura County EMS Agency",
    description: "Ventura County EMS protocols for county fire, city departments, and Gold Coast Ambulance.",
  },
  "san-mateo": {
    displayName: "San Mateo County",
    population: "765,000",
    emsAgency: "San Mateo County EMS",
    description: "San Mateo County EMS protocols for Peninsula fire departments and AMR.",
  },
  "san-joaquin": {
    displayName: "San Joaquin County",
    population: "780,000",
    emsAgency: "San Joaquin County EMS Agency",
    description: "San Joaquin County EMS protocols for Stockton and Central Valley responders.",
  },
};

// Protocol categories with descriptions
const PROTOCOL_CATEGORIES = [
  {
    slug: "cardiac-arrest",
    title: "Cardiac Arrest Protocols",
    description: "Adult and pediatric cardiac arrest treatment algorithms, CPR guidelines, ROSC care.",
    icon: "❤️",
  },
  {
    slug: "respiratory",
    title: "Respiratory Protocols", 
    description: "Airway management, asthma, COPD, anaphylaxis, and respiratory distress treatment.",
    icon: "🫁",
  },
  {
    slug: "trauma",
    title: "Trauma Protocols",
    description: "Trauma assessment, hemorrhage control, spinal immobilization, burn treatment.",
    icon: "🩹",
  },
  {
    slug: "pediatric",
    title: "Pediatric Protocols",
    description: "Age-specific protocols for infants, children, and adolescents.",
    icon: "👶",
  },
  {
    slug: "medical",
    title: "Medical Protocols",
    description: "Chest pain, stroke, seizures, diabetic emergencies, overdose treatment.",
    icon: "💊",
  },
  {
    slug: "medications",
    title: "Medication Reference",
    description: "Drug dosages, indications, contraindications, and administration routes.",
    icon: "💉",
  },
];

// FAQs for each county (SEO/AEO)
function getCountyFAQs(countyData: typeof COUNTY_DATA[string], countySlug: string) {
  return [
    {
      question: `What EMS protocols does ${countyData.displayName} use?`,
      answer: `${countyData.displayName} EMS protocols are managed by ${countyData.emsAgency}. Protocol Guide provides instant access to all approved treatment protocols for paramedics and EMTs in ${countyData.displayName}.`,
    },
    {
      question: `How do I access ${countyData.displayName} protocols on my phone?`,
      answer: `Use Protocol Guide's search feature to find any ${countyData.displayName} protocol instantly. Just type your query (e.g., "chest pain", "peds seizure") and get the protocol in seconds. Works offline too.`,
    },
    {
      question: `Are ${countyData.displayName} protocols different from other counties?`,
      answer: `Yes, each California county has protocols approved by their local EMS agency. ${countyData.emsAgency} maintains the official protocols for ${countyData.displayName}. Protocol Guide keeps these up-to-date.`,
    },
    {
      question: `What's the pediatric epinephrine dose for ${countyData.displayName}?`,
      answer: `For ${countyData.displayName} pediatric cardiac arrest: Epinephrine 0.01 mg/kg IV/IO (0.1 mL/kg of 1:10,000 concentration). Max single dose: 1mg. Use Protocol Guide's dosing calculator for weight-based calculations.`,
    },
  ];
}

const COLORS = {
  bgDark: "#0F172A",
  bgSurface: "#1E293B",
  bgCard: "#334155",
  textWhite: "#F1F5F9",
  textMuted: "#94A3B8",
  primaryRed: "#EF4444",
  border: "#475569",
};

export default function CountyProtocolsPage() {
  const { county } = useLocalSearchParams<{ county: string }>();
  const countySlug = county?.toLowerCase() || "los-angeles";
  const countyData = COUNTY_DATA[countySlug] || COUNTY_DATA["los-angeles"];

  const handleSearch = () => {
    // Navigate to search with county pre-selected
    router.push({
      pathname: "/(tabs)/search",
      params: { county: countySlug },
    });
  };

  const handleCategoryPress = (categorySlug: string) => {
    router.push({
      pathname: "/(tabs)/search",
      params: { county: countySlug, category: categorySlug },
    });
  };

  const faqs = getCountyFAQs(countyData, countySlug);

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      {/* SEO Meta Tags */}
      <SEOHead
        title={`${countyData.displayName} EMS Protocols`}
        description={countyData.description}
        path={`/california/${countySlug}/protocols`}
        keywords={[
          `${countyData.displayName} EMS protocols`,
          `${countyData.displayName} paramedic protocols`,
          `${countyData.emsAgency} protocols`,
          "California EMS protocols",
          "prehospital protocols",
        ]}
      />

      {/* Structured Data */}
      <MedicalWebPageSchema
        name={`${countyData.displayName} EMS Protocols`}
        description={countyData.description}
        url={`/california/${countySlug}/protocols`}
        medicalAudience={["Paramedics", "EMTs", "Firefighter-Paramedics"]}
        specialty="Emergency Medicine"
        keywords={[countyData.displayName, "EMS", "protocols", "paramedic"]}
      />

      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "California", url: "/california/protocols" },
          { name: countyData.displayName, url: `/california/${countySlug}/protocols` },
        ]}
      />

      <FAQPageSchema faqs={faqs} />

      <StatusBar style="light" />

      <ScrollView
        style={{ flex: 1, backgroundColor: COLORS.bgDark }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={{ padding: 24, paddingTop: 48 }}>
          <Text style={{ color: COLORS.textMuted, fontSize: 14, marginBottom: 8 }}>
            California › {countyData.displayName}
          </Text>
          
          <Text
            style={{
              color: COLORS.textWhite,
              fontSize: 32,
              fontWeight: "900",
              marginBottom: 16,
              lineHeight: 40,
            }}
          >
            {countyData.displayName}{"\n"}
            <Text style={{ color: COLORS.primaryRed }}>EMS Protocols</Text>
          </Text>

          <Text style={{ color: COLORS.textMuted, fontSize: 16, lineHeight: 24, marginBottom: 24 }}>
            {countyData.description}
          </Text>

          {/* Quick Stats */}
          <View style={{ flexDirection: "row", gap: 16, marginBottom: 32 }}>
            <View style={{ flex: 1, backgroundColor: COLORS.bgSurface, padding: 16, borderRadius: 12 }}>
              <Text style={{ color: COLORS.textMuted, fontSize: 12, marginBottom: 4 }}>Population</Text>
              <Text style={{ color: COLORS.textWhite, fontSize: 18, fontWeight: "700" }}>
                {countyData.population}
              </Text>
            </View>
            <View style={{ flex: 1, backgroundColor: COLORS.bgSurface, padding: 16, borderRadius: 12 }}>
              <Text style={{ color: COLORS.textMuted, fontSize: 12, marginBottom: 4 }}>EMS Agency</Text>
              <Text style={{ color: COLORS.textWhite, fontSize: 14, fontWeight: "600" }}>
                {countyData.emsAgency}
              </Text>
            </View>
          </View>

          {/* CTA Button */}
          <Pressable
            onPress={handleSearch}
            style={{
              backgroundColor: COLORS.primaryRed,
              paddingVertical: 18,
              paddingHorizontal: 32,
              borderRadius: 12,
              alignItems: "center",
              shadowColor: COLORS.primaryRed,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.4,
              shadowRadius: 16,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "700" }}>
              Search {countyData.displayName} Protocols
            </Text>
          </Pressable>
        </View>

        {/* Protocol Categories */}
        <View style={{ padding: 24 }}>
          <Text style={{ color: COLORS.textWhite, fontSize: 24, fontWeight: "700", marginBottom: 16 }}>
            Protocol Categories
          </Text>
          
          <View style={{ gap: 12 }}>
            {PROTOCOL_CATEGORIES.map((category) => (
              <Pressable
                key={category.slug}
                onPress={() => handleCategoryPress(category.slug)}
                style={{
                  backgroundColor: COLORS.bgSurface,
                  padding: 20,
                  borderRadius: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 16,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                <Text style={{ fontSize: 28 }}>{category.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: COLORS.textWhite, fontSize: 16, fontWeight: "600", marginBottom: 4 }}>
                    {category.title}
                  </Text>
                  <Text style={{ color: COLORS.textMuted, fontSize: 14, lineHeight: 20 }}>
                    {category.description}
                  </Text>
                </View>
                <Text style={{ color: COLORS.textMuted, fontSize: 20 }}>→</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* FAQ Section for SEO */}
        <View style={{ padding: 24, backgroundColor: COLORS.bgSurface }}>
          <Text style={{ color: COLORS.textWhite, fontSize: 24, fontWeight: "700", marginBottom: 16 }}>
            Frequently Asked Questions
          </Text>
          
          <View style={{ gap: 16 }}>
            {faqs.map((faq, index) => (
              <View key={index} style={{ gap: 8 }}>
                <Text style={{ color: COLORS.textWhite, fontSize: 16, fontWeight: "600" }}>
                  {faq.question}
                </Text>
                <Text style={{ color: COLORS.textMuted, fontSize: 14, lineHeight: 22 }}>
                  {faq.answer}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Footer CTA */}
        <View style={{ padding: 24, paddingBottom: 48, alignItems: "center" }}>
          <Text style={{ color: COLORS.textMuted, fontSize: 14, marginBottom: 16, textAlign: "center" }}>
            Ready to find protocols faster?
          </Text>
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
              Try Protocol Guide Free
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
