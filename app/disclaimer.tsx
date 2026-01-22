import React from "react";
import { ScrollView, Text, View, Pressable } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useRouter } from "expo-router";

export default function MedicalDisclaimerScreen() {
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
        <Text className="text-lg font-bold text-foreground ml-2">Medical Disclaimer</Text>
      </View>

      <ScrollView 
        className="flex-1 px-4 py-6"
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-2xl font-bold text-foreground mb-2">Medical Disclaimer</Text>
        <Text className="text-sm text-muted mb-6">Last updated: January 10, 2026</Text>

        {/* Important Warning Box */}
        <View 
          className="p-4 rounded-xl mb-6"
          style={{ backgroundColor: colors.error + "15", borderColor: colors.error, borderWidth: 1 }}
        >
          <View className="flex-row items-center mb-2">
            <IconSymbol name="exclamationmark.triangle.fill" size={24} color={colors.error} />
            <Text className="text-lg font-bold ml-2" style={{ color: colors.error }}>
              IMPORTANT WARNING
            </Text>
          </View>
          <Text className="text-base" style={{ color: colors.error, lineHeight: 22 }}>
            Protocol Guide is a reference tool only. It is NOT a substitute for professional medical judgment, proper training, direct medical control, or your local protocols.
          </Text>
        </View>

        <Section title="Clinical Decision Support Tool">
          Protocol Guide is designed to serve as a clinical decision support tool for trained Emergency Medical Services (EMS) professionals. The information provided through this application is intended to supplement—not replace—the knowledge, skills, and judgment of qualified healthcare providers.
        </Section>

        <Section title="Not Medical Advice">
          The protocols, guidelines, and information presented in Protocol Guide:
          <BulletPoint>Are for reference purposes only</BulletPoint>
          <BulletPoint>Do not constitute medical advice, diagnosis, or treatment</BulletPoint>
          <BulletPoint>Should not be used as the sole basis for clinical decisions</BulletPoint>
          <BulletPoint>May not reflect the most current medical research or guidelines</BulletPoint>
          <BulletPoint>May vary from your local, regional, or state protocols</BulletPoint>
        </Section>

        <Section title="Professional Responsibility">
          As an EMS professional, you are responsible for:
          <BulletPoint>Following your agency{"'"}s approved protocols and standing orders</BulletPoint>
          <BulletPoint>Obtaining appropriate medical direction when required</BulletPoint>
          <BulletPoint>Exercising independent professional judgment in patient care</BulletPoint>
          <BulletPoint>Practicing within your scope of practice and certification level</BulletPoint>
          <BulletPoint>Maintaining current certifications and continuing education</BulletPoint>
          <BulletPoint>Verifying all medication dosages and treatment parameters</BulletPoint>
        </Section>

        <Section title="Local Protocol Precedence">
          YOUR LOCAL PROTOCOLS ALWAYS TAKE PRECEDENCE. Protocol Guide provides general reference information that may differ from your jurisdiction{"'"}s approved protocols. Always follow:
          <BulletPoint>Your agency{"'"}s written protocols and policies</BulletPoint>
          <BulletPoint>Medical director orders and standing orders</BulletPoint>
          <BulletPoint>State and regional EMS regulations</BulletPoint>
          <BulletPoint>Online medical control direction</BulletPoint>
        </Section>

        <Section title="Accuracy and Updates">
          While we strive to provide accurate and up-to-date information:
          <BulletPoint>Medical guidelines and protocols change frequently</BulletPoint>
          <BulletPoint>There may be delays in updating content</BulletPoint>
          <BulletPoint>Errors or omissions may occur despite our best efforts</BulletPoint>
          <BulletPoint>Drug information, dosages, and contraindications should always be verified</BulletPoint>
        </Section>

        <Section title="Emergency Situations">
          In emergency situations:
          <BulletPoint>Do not delay patient care to consult this application</BulletPoint>
          <BulletPoint>Rely on your training and established protocols</BulletPoint>
          <BulletPoint>Contact medical control for guidance when appropriate</BulletPoint>
          <BulletPoint>Document all care provided according to your agency's requirements</BulletPoint>
        </Section>

        <Section title="No Warranty">
          Protocol Guide is provided "as is" without any warranties, express or implied. We do not warrant that:
          <BulletPoint>The information will be error-free or uninterrupted</BulletPoint>
          <BulletPoint>The content will meet your specific requirements</BulletPoint>
          <BulletPoint>The results obtained will be accurate or reliable</BulletPoint>
        </Section>

        <Section title="Limitation of Liability">
          Protocol Guide, its developers, and affiliates shall not be liable for any direct, indirect, incidental, special, or consequential damages arising from:
          <BulletPoint>Use or inability to use the application</BulletPoint>
          <BulletPoint>Reliance on information provided</BulletPoint>
          <BulletPoint>Errors or omissions in content</BulletPoint>
          <BulletPoint>Any patient care decisions or outcomes</BulletPoint>
        </Section>

        <Section title="Acknowledgment">
          By using Protocol Guide, you acknowledge that you have read, understood, and agree to this Medical Disclaimer. You accept full responsibility for how you use the information provided and agree to use it only as a supplementary reference tool in conjunction with proper training, protocols, and medical direction.
        </Section>

        <Section title="Report Concerns">
          If you identify any errors, outdated information, or have concerns about content accuracy, please report them immediately to:
          {"\n\n"}
          Email: medical@protocol-guide.com{"\n"}
          Website: https://protocol-guide.com/report
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
