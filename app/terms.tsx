import React from "react";
import { ScrollView, Text, View, Pressable } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useRouter } from "expo-router";

export default function TermsOfServiceScreen() {
  const colors = useColors();
  const router = useRouter();

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      {/* Header */}
      <View 
        className="flex-row items-center px-4 py-3 border-b"
        style={{ borderBottomColor: colors.border }}
      >
        <Pressable 
          onPress={() => router.back()}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, padding: 8 }]}
        >
          <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
        </Pressable>
        <Text className="text-lg font-bold text-foreground ml-2">Terms of Service</Text>
      </View>

      <ScrollView 
        className="flex-1 px-4 py-6"
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-2xl font-bold text-foreground mb-2">Terms of Service</Text>
        <Text className="text-sm text-muted mb-6">Last updated: January 10, 2026</Text>

        <Section title="1. Acceptance of Terms">
          By accessing or using Protocol Guide ({'"Service"'}), you agree to be bound by these Terms of Service ({'"Terms"'}). If you do not agree to these Terms, do not use the Service.
        </Section>

        <Section title="2. Description of Service">
          Protocol Guide is a clinical decision support tool that provides EMS professionals with access to emergency medical protocols. The Service includes protocol retrieval, search functionality, and related features available through our mobile application.
        </Section>

        <Section title="3. User Accounts">
          <BulletPoint>You must be at least 18 years old to use the Service.</BulletPoint>
          <BulletPoint>You are responsible for maintaining the confidentiality of your account credentials.</BulletPoint>
          <BulletPoint>You are responsible for all activities that occur under your account.</BulletPoint>
          <BulletPoint>You must provide accurate and complete information when creating an account.</BulletPoint>
          <BulletPoint>You must notify us immediately of any unauthorized use of your account.</BulletPoint>
        </Section>

        <Section title="4. Subscription and Payment">
          <BulletPoint>Free Tier: Limited to 5 protocol queries per day and 1 county.</BulletPoint>
          <BulletPoint>Pro Subscription: $4.99/month or $39/year for unlimited queries and all features.</BulletPoint>
          <BulletPoint>Payments are processed through Stripe and are non-refundable except as required by law.</BulletPoint>
          <BulletPoint>Subscriptions automatically renew unless cancelled before the renewal date.</BulletPoint>
          <BulletPoint>We reserve the right to change pricing with 30 days notice to existing subscribers.</BulletPoint>
        </Section>

        <Section title="5. Acceptable Use">
          You agree not to:
          <BulletPoint>Use the Service for any unlawful purpose</BulletPoint>
          <BulletPoint>Share your account credentials with others</BulletPoint>
          <BulletPoint>Attempt to reverse engineer or extract source code from the Service</BulletPoint>
          <BulletPoint>Interfere with or disrupt the Service or servers</BulletPoint>
          <BulletPoint>Use automated systems to access the Service without permission</BulletPoint>
          <BulletPoint>Resell or redistribute the Service without authorization</BulletPoint>
        </Section>

        <Section title="6. Intellectual Property">
          The Service and its original content, features, and functionality are owned by Protocol Guide and are protected by international copyright, trademark, and other intellectual property laws. Protocol content may be subject to third-party rights and is provided under license.
        </Section>

        <Section title="7. Medical Disclaimer">
          THE SERVICE IS A REFERENCE TOOL ONLY AND IS NOT A SUBSTITUTE FOR PROFESSIONAL MEDICAL JUDGMENT, TRAINING, OR DIRECT MEDICAL CONTROL. Always follow your local protocols, medical director guidance, and standard of care. See our full Medical Disclaimer for more information.
        </Section>

        <Section title="8. Limitation of Liability">
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, PROTOCOL GUIDE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES RESULTING FROM:
          <BulletPoint>Your use or inability to use the Service</BulletPoint>
          <BulletPoint>Any errors or omissions in protocol content</BulletPoint>
          <BulletPoint>Unauthorized access to your account or data</BulletPoint>
          <BulletPoint>Any third-party conduct on the Service</BulletPoint>
        </Section>

        <Section title="9. Indemnification">
          You agree to indemnify and hold harmless Protocol Guide and its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses arising out of your use of the Service or violation of these Terms.
        </Section>

        <Section title="10. Termination">
          We may terminate or suspend your account and access to the Service immediately, without prior notice or liability, for any reason, including breach of these Terms. Upon termination, your right to use the Service will immediately cease.
        </Section>

        <Section title="11. Changes to Terms">
          We reserve the right to modify these Terms at any time. We will provide notice of material changes by posting the updated Terms and updating the "Last updated" date. Your continued use of the Service after changes constitutes acceptance of the new Terms.
        </Section>

        <Section title="12. Governing Law">
          These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law provisions.
        </Section>

        <Section title="13. Contact Us">
          If you have questions about these Terms, please contact us at:
          {"\n\n"}
          Email: legal@protocol-guide.com{"\n"}
          Website: https://protocol-guide.com/contact
        </Section>

        <View className="h-8" />
      </ScrollView>
    </ScreenContainer>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-6">
      <Text className="text-lg font-semibold text-foreground mb-2">{title}</Text>
      <Text className="text-base text-foreground leading-6">{children}</Text>
    </View>
  );
}

function BulletPoint({ children }: { children: React.ReactNode }) {
  return (
    <Text className="text-base text-foreground leading-6">{"\n"}• {children}</Text>
  );
}
