/**
 * Team Management Screen
 * View and manage agency staff members
 */

import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRouter } from "expo-router";

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  protocol_author: "Protocol Author",
  member: "Member",
};

const ROLE_COLORS: Record<string, string> = {
  owner: "#9333EA",
  admin: "#2563EB",
  protocol_author: "#059669",
  member: "#6B7280",
};

export default function TeamScreen() {
  const colors = useColors();
  const router = useRouter();

  const { data: agencies } = trpc.agencyAdmin.myAgencies.useQuery();
  const agencyId = agencies?.[0]?.id;

  const { data: members, isLoading } = trpc.agencyAdmin.listMembers.useQuery(
    { agencyId: agencyId! },
    { enabled: !!agencyId }
  );

  const getInitials = (name: string | null, email: string | null) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return "?";
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Team</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            {members?.length || 0} members
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.inviteButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/admin/team/invite" as any)}
        >
          <IconSymbol name="person.badge.plus" size={16} color="#FFFFFF" />
          <Text style={styles.inviteButtonText}>Invite</Text>
        </TouchableOpacity>
      </View>

      {/* Members List */}
      <ScrollView style={styles.listContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: colors.muted }]}>Loading team...</Text>
          </View>
        ) : members && members.length > 0 ? (
          members.map((member) => (
            <View
              key={member.id}
              style={[styles.memberCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarText}>
                  {getInitials(member.user?.name || null, member.user?.email || null)}
                </Text>
              </View>

              <View style={styles.memberInfo}>
                <Text style={[styles.memberName, { color: colors.foreground }]}>
                  {member.user?.name || "Unnamed User"}
                </Text>
                <Text style={[styles.memberEmail, { color: colors.muted }]}>
                  {member.user?.email || "No email"}
                </Text>
              </View>

              <View
                style={[
                  styles.roleBadge,
                  { backgroundColor: (ROLE_COLORS[member.role] || colors.muted) + "20" },
                ]}
              >
                <Text
                  style={[
                    styles.roleText,
                    { color: ROLE_COLORS[member.role] || colors.muted },
                  ]}
                >
                  {ROLE_LABELS[member.role] || member.role}
                </Text>
              </View>

              {member.status === "pending" && (
                <View style={[styles.pendingBadge, { backgroundColor: colors.warning + "20" }]}>
                  <Text style={[styles.pendingText, { color: colors.warning }]}>Pending</Text>
                </View>
              )}
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <IconSymbol name="person.2" size={48} color={colors.muted} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Team Members</Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              Invite your colleagues to collaborate on protocols
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Role Legend */}
      <View style={[styles.legend, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.legendTitle, { color: colors.muted }]}>Roles</Text>
        <View style={styles.legendItems}>
          {Object.entries(ROLE_LABELS).map(([key, label]) => (
            <View key={key} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: ROLE_COLORS[key] }]} />
              <Text style={[styles.legendText, { color: colors.foreground }]}>{label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  inviteButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  inviteButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: "600",
  },
  memberEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  roleText: {
    fontSize: 11,
    fontWeight: "600",
  },
  pendingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  pendingText: {
    fontSize: 11,
    fontWeight: "600",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
  },
  legend: {
    margin: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  legendTitle: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  legendItems: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
  },
});
