/**
 * Agency Settings Screen
 * Manage agency profile and preferences
 */

import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput } from "react-native";
import { useState, useEffect } from "react";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRouter } from "expo-router";

export default function SettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: agencies } = trpc.agencyAdmin.myAgencies.useQuery();
  const agencyId = agencies?.[0]?.id;

  const { data: agency } = trpc.agencyAdmin.getAgency.useQuery(
    { agencyId: agencyId! },
    { enabled: !!agencyId }
  );

  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Initialize form with agency data
  useEffect(() => {
    if (agency) {
      setName(agency.name || "");
      setContactEmail(agency.contactEmail || "");
      setContactPhone(agency.contactPhone || "");
      setAddress(agency.address || "");
    }
  }, [agency]);

  const updateMutation = trpc.agencyAdmin.updateAgency.useMutation({
    onSuccess: () => {
      setSaveMessage({ type: "success", text: "Settings saved successfully" });
      setIsSaving(false);
      utils.agencyAdmin.getAgency.invalidate();
      setTimeout(() => setSaveMessage(null), 3000);
    },
    onError: (err) => {
      setSaveMessage({ type: "error", text: err.message });
      setIsSaving(false);
    },
  });

  const handleSave = () => {
    if (!agencyId) return;

    setIsSaving(true);
    setSaveMessage(null);

    updateMutation.mutate({
      agencyId,
      name: name || undefined,
      contactEmail: contactEmail || undefined,
      contactPhone: contactPhone || undefined,
      address: address || undefined,
    });
  };

  const hasChanges =
    agency &&
    (name !== agency.name ||
      contactEmail !== (agency.contactEmail || "") ||
      contactPhone !== (agency.contactPhone || "") ||
      address !== (agency.address || ""));

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Manage your agency profile
        </Text>
      </View>

      {/* Agency Info Section */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Agency Information</Text>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.muted }]}>Agency Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            value={name}
            onChangeText={setName}
            placeholder="Agency name"
            placeholderTextColor={colors.muted}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.muted }]}>Contact Email</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            value={contactEmail}
            onChangeText={setContactEmail}
            placeholder="contact@agency.gov"
            placeholderTextColor={colors.muted}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.muted }]}>Contact Phone</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            value={contactPhone}
            onChangeText={setContactPhone}
            placeholder="(555) 123-4567"
            placeholderTextColor={colors.muted}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.muted }]}>Address</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            value={address}
            onChangeText={setAddress}
            placeholder="123 Main St, City, State 12345"
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={3}
          />
        </View>
      </View>

      {/* Save Message */}
      {saveMessage && (
        <View
          style={[
            styles.messageBox,
            { backgroundColor: saveMessage.type === "success" ? colors.success + "15" : colors.error + "15" },
          ]}
        >
          <IconSymbol
            name={saveMessage.type === "success" ? "checkmark.circle.fill" : "exclamationmark.triangle.fill"}
            size={16}
            color={saveMessage.type === "success" ? colors.success : colors.error}
          />
          <Text
            style={[
              styles.messageText,
              { color: saveMessage.type === "success" ? colors.success : colors.error },
            ]}
          >
            {saveMessage.text}
          </Text>
        </View>
      )}

      {/* Save Button */}
      <TouchableOpacity
        style={[
          styles.saveButton,
          {
            backgroundColor: hasChanges ? colors.primary : colors.muted,
            opacity: isSaving ? 0.7 : 1,
          },
        ]}
        onPress={handleSave}
        disabled={isSaving || !hasChanges}
      >
        <Text style={styles.saveButtonText}>
          {isSaving ? "Saving..." : "Save Changes"}
        </Text>
      </TouchableOpacity>

      {/* Other Settings Links */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>More Settings</Text>

        <TouchableOpacity
          style={[styles.settingsLink, { borderBottomColor: colors.border }]}
          onPress={() => router.push("/admin/settings/billing" as any)}
        >
          <View style={styles.settingsLinkLeft}>
            <IconSymbol name="creditcard.fill" size={20} color={colors.primary} />
            <Text style={[styles.settingsLinkText, { color: colors.foreground }]}>
              Billing & Subscription
            </Text>
          </View>
          <IconSymbol name="chevron.right" size={16} color={colors.muted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingsLink}>
          <View style={styles.settingsLinkLeft}>
            <IconSymbol name="bell.fill" size={20} color={colors.warning} />
            <Text style={[styles.settingsLinkText, { color: colors.foreground }]}>
              Notifications
            </Text>
          </View>
          <IconSymbol name="chevron.right" size={16} color={colors.muted} />
        </TouchableOpacity>
      </View>

      {/* Agency Info */}
      {agency && (
        <View style={[styles.infoSection, { backgroundColor: colors.muted + "10" }]}>
          <Text style={[styles.infoLabel, { color: colors.muted }]}>Agency ID</Text>
          <Text style={[styles.infoValue, { color: colors.foreground }]}>{agency.id}</Text>
          <Text style={[styles.infoLabel, { color: colors.muted, marginTop: 8 }]}>State</Text>
          <Text style={[styles.infoValue, { color: colors.foreground }]}>{agency.stateCode}</Text>
          <Text style={[styles.infoLabel, { color: colors.muted, marginTop: 8 }]}>Type</Text>
          <Text style={[styles.infoValue, { color: colors.foreground }]}>
            {agency.agencyType?.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "N/A"}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  section: {
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  messageBox: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 14,
    borderRadius: 10,
    gap: 10,
  },
  messageText: {
    flex: 1,
    fontSize: 13,
  },
  saveButton: {
    marginHorizontal: 24,
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  settingsLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  settingsLinkLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingsLinkText: {
    fontSize: 15,
  },
  infoSection: {
    marginHorizontal: 24,
    marginBottom: 24,
    padding: 16,
    borderRadius: 10,
  },
  infoLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
    marginTop: 2,
  },
});
