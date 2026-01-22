import React from "react";
import { ScrollView, Text, View, Pressable } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useRouter } from "expo-router";

export default function PrivacyPolicyScreen() {
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
        <Text className="text-lg font-bold text-foreground ml-2">Privacy Policy</Text>
      </View>

      <ScrollView 
        className="flex-1 px-4 py-6"
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-2xl font-bold text-foreground mb-2">Privacy Policy</Text>
        <Text className="text-sm text-muted mb-6">Last updated: January 10, 2026</Text>

        <Section title="1. Introduction">
          Protocol Guide ({'"we," "our," or "us"'}) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and related services (collectively, the {'"Service"'}).
        </Section>

        <Section title="2. Information We Collect">
          <BulletPoint>Account Information: When you create an account, we collect your name, email address, and authentication credentials.</BulletPoint>
          <BulletPoint>Usage Data: We collect information about how you use the Service, including search queries, protocol views, and feature usage.</BulletPoint>
          <BulletPoint>Device Information: We may collect device identifiers, operating system version, and app version for analytics and troubleshooting.</BulletPoint>
          <BulletPoint>Payment Information: If you subscribe to Pro, payment processing is handled by Stripe. We do not store your credit card details.</BulletPoint>
          <BulletPoint>Voice Data: If you use voice input, audio is processed for transcription and immediately discarded after processing.</BulletPoint>
        </Section>

        <Section title="3. How We Use Your Information">
          <BulletPoint>To provide and maintain the Service</BulletPoint>
          <BulletPoint>To process your subscription and payments</BulletPoint>
          <BulletPoint>To improve and personalize your experience</BulletPoint>
          <BulletPoint>To communicate with you about updates and support</BulletPoint>
          <BulletPoint>To enforce our terms and prevent fraud</BulletPoint>
          <BulletPoint>To comply with legal obligations</BulletPoint>
        </Section>

        <Section title="4. Data Sharing">
          We do not sell your personal information. We may share data with:
          <BulletPoint>Service providers who assist in operating our Service (e.g., Stripe for payments, cloud hosting providers)</BulletPoint>
          <BulletPoint>Law enforcement when required by law or to protect our rights</BulletPoint>
          <BulletPoint>Business partners in the event of a merger or acquisition</BulletPoint>
        </Section>

        <Section title="5. Data Security">
          We implement industry-standard security measures to protect your data, including encryption in transit and at rest. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
        </Section>

        <Section title="6. Data Retention">
          We retain your data for as long as your account is active or as needed to provide the Service. You may request deletion of your account and associated data at any time by contacting us.
        </Section>

        <Section title="7. Your Rights">
          Depending on your location, you may have rights to:
          <BulletPoint>Access your personal data</BulletPoint>
          <BulletPoint>Correct inaccurate data</BulletPoint>
          <BulletPoint>Delete your data</BulletPoint>
          <BulletPoint>Object to or restrict processing</BulletPoint>
          <BulletPoint>Data portability</BulletPoint>
          <BulletPoint>Withdraw consent</BulletPoint>
        </Section>

        <Section title="8. Children's Privacy">
          The Service is not intended for users under 18 years of age. We do not knowingly collect personal information from children under 18.
        </Section>

        <Section title="9. Changes to This Policy">
          We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the {'"Last updated"'} date.
        </Section>

        <Section title="10. Contact Us">
          If you have questions about this Privacy Policy, please contact us at:
          {"\n\n"}
          Email: privacy@protocol-guide.com{"\n"}
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
