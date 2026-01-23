/**
 * Invite Team Member Screen
 * Send invitations to join the agency
 */

import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput } from "react-native";
import { useState } from "react";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRouter } from "expo-router";

type Role = "admin" | "protocol_author" | "member";

const ROLES: { value: Role; label: string; description: string }[] = [
  { value: "admin", label: "Admin", description: "Full access to manage protocols and team" },
  { value: "protocol_author", label: "Protocol Author", description: "Can create and edit protocols" },
  { value: "member", label: "Member", description: "View-only access to protocols" },
];

export default function InviteScreen() {
  const colors = useColors();
  const router = useRouter();
  const utils = trpc.useUtils();

  const [email, setEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState<Role>("member");
  const [isInviting, setIsInviting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: agencies } = trpc.agencyAdmin.myAgencies.useQuery();
  const agencyId = agencies?.[0]?.id;

  const inviteMutation = trpc.agencyAdmin.inviteMember.useMutation({
    onSuccess: () => {
      setSuccess(true);
      setIsInviting(false);
      utils.agencyAdmin.listMembers.invalidate();
    },
    onError: (err) => {
      setError(err.message);
      setIsInviting(false);
    },
  });

  const handleInvite = async () => {
    if (!email || !agencyId) {
      setError("Please enter an email address");
      return;
    }

    // Basic email validation
    if (!email.includes("@") || !email.includes(".")) {
      setError("Please enter a valid email address");
      return;
    }

    setIsInviting(true);
    setError(null);

    inviteMutation.mutate({
      agencyId,
      email,
      role: selectedRole,
    });
  };

  const handleSendAnother = () => {
    setEmail("");
    setSelectedRole("member");
    setSuccess(false);
    setError(null);
  };

  if (success) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.successContainer}>
          <View style={[styles.successIcon, { backgroundColor: colors.success + "20" }]}>
            <IconSymbol name="checkmark.circle.fill" size={48} color={colors.success} />
          </View>
          <Text style={[styles.successTitle, { color: colors.foreground }]}>Invitation Sent!</Text>
          <Text style={[styles.successText, { color: colors.muted }]}>
            An invitation has been sent to {email}. They will receive an email with instructions to join.
          </Text>
          <View style={styles.successButtons}>
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.border }]}
              onPress={handleSendAnother}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>
                Invite Another
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={() => router.back()}
            >
              <Text style={styles.primaryButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Invite Member</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Form */}
      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>
            Email Address <Text style={{ color: colors.error }}>*</Text>
          </Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
            ]}
            placeholder="colleague@agency.gov"
            placeholderTextColor={colors.muted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.foreground }]}>Role</Text>
          <View style={styles.roleOptions}>
            {ROLES.map((role) => (
              <TouchableOpacity
                key={role.value}
                style={[
                  styles.roleOption,
                  {
                    backgroundColor: selectedRole === role.value ? colors.primary + "10" : colors.card,
                    borderColor: selectedRole === role.value ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setSelectedRole(role.value)}
              >
                <View style={styles.roleHeader}>
                  <View
                    style={[
                      styles.radioOuter,
                      { borderColor: selectedRole === role.value ? colors.primary : colors.border },
                    ]}
                  >
                    {selectedRole === role.value && (
                      <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
                    )}
                  </View>
                  <Text style={[styles.roleLabel, { color: colors.foreground }]}>{role.label}</Text>
                </View>
                <Text style={[styles.roleDescription, { color: colors.muted }]}>
                  {role.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Error Message */}
      {error && (
        <View style={[styles.errorBox, { backgroundColor: colors.error + "15" }]}>
          <IconSymbol name="exclamationmark.triangle.fill" size={16} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        </View>
      )}

      {/* Info Box */}
      <View style={[styles.infoBox, { backgroundColor: colors.primary + "10" }]}>
        <IconSymbol name="info.circle.fill" size={16} color={colors.primary} />
        <Text style={[styles.infoText, { color: colors.foreground }]}>
          The invited person will receive an email with a link to accept the invitation. The link expires in 7 days.
        </Text>
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[
          styles.submitButton,
          {
            backgroundColor: email ? colors.primary : colors.muted,
            opacity: isInviting ? 0.7 : 1,
          },
        ]}
        onPress={handleInvite}
        disabled={isInviting || !email}
      >
        <Text style={styles.submitButtonText}>
          {isInviting ? "Sending Invitation..." : "Send Invitation"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  form: {
    paddingHorizontal: 24,
  },
  field: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
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
  roleOptions: {
    gap: 12,
  },
  roleOption: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  roleHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  roleLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  roleDescription: {
    fontSize: 13,
    marginLeft: 30,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 24,
    padding: 14,
    borderRadius: 10,
    gap: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
  },
  infoBox: {
    flexDirection: "row",
    marginHorizontal: 24,
    marginTop: 16,
    padding: 14,
    borderRadius: 10,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  submitButton: {
    margin: 24,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  successContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
  },
  successText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 32,
  },
  successButtons: {
    flexDirection: "row",
    gap: 12,
  },
  secondaryButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  primaryButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
