import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Image, ActivityIndicator } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { useOfflineCache } from "@/hooks/use-offline-cache";
import { trpc } from "@/lib/trpc";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ThemeToggle } from "@/components/theme-toggle";
import { useRouter } from "expo-router";
import * as Haptics from "@/lib/haptics";
import { useState } from "react";
import { useFavorites, FavoriteProtocol } from "@/hooks/use-favorites";
import { signInWithGoogle, signInWithApple } from "@/lib/supabase";
import { GoogleLogo, AppleLogo } from "@/components/icons";

export default function ProfileScreen() {
  const { user, isAuthenticated, logout } = useAuth();
  const colors = useColors();
  const router = useRouter();
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  
  const { data: usage } = trpc.user.usage.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  
  const { data: subscriptionStatus } = trpc.subscription.status.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  
  const { data: recentQueries } = trpc.user.queries.useQuery(
    { limit: 5 },
    { enabled: isAuthenticated }
  );
  
  const { cachedProtocols, cacheSize, clearCache, itemCount } = useOfflineCache();
  const { favorites, removeFavorite } = useFavorites();
  
  const createPortalMutation = trpc.subscription.createPortal.useMutation();

  const handleLogout = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    if (confirm("Are you sure you want to sign out?")) {
      await logout();
      // Tabs layout guard will redirect to landing automatically
    }
  };

  const handleClearCache = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    if (confirm("Clear all cached protocols? You won't be able to access them offline until you search again.")) {
      await clearCache();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleManageSubscription = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setIsLoadingPortal(true);
    try {
      const returnUrl = window.location.href;

      const result = await createPortalMutation.mutateAsync({
        returnUrl,
      });

      if (result.success && result.url) {
        window.location.href = result.url;
      } else {
        alert(result.error || "Failed to open billing portal");
      }
    } catch (error) {
      alert("Failed to open billing portal. Please try again.");
    } finally {
      setIsLoadingPortal(false);
    }
  };

  const handleUpgrade = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/(tabs)/?showUpgrade=true" as any);
  };

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case "pro":
        return colors.primary;
      case "enterprise":
        return colors.success;
      default:
        return colors.muted;
    }
  };

  const getTierLabel = (tier: string) => {
    switch (tier) {
      case "pro":
        return "Pro";
      case "enterprise":
        return "Enterprise";
      default:
        return "Free";
    }
  };

  const getSubscriptionStatusBadge = () => {
    if (!subscriptionStatus || subscriptionStatus.tier === "free") return null;
    
    const status = subscriptionStatus.subscriptionStatus;
    let label = "Active";
    let bgColor = colors.success + "20";
    let textColor = colors.success;
    
    if (status === "canceled" || status === "past_due") {
      label = status === "canceled" ? "Canceled" : "Past Due";
      bgColor = colors.error + "20";
      textColor = colors.error;
    } else if (status === "trialing") {
      label = "Trial";
      bgColor = colors.warning + "20";
      textColor = colors.warning;
    }
    
    return (
      <View style={[styles.statusBadge, { backgroundColor: bgColor }]}>
        <Text style={[styles.statusText, { color: textColor }]}>{label}</Text>
      </View>
    );
  };

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return "N/A";
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const [signInLoading, setSignInLoading] = useState<"google" | "apple" | null>(null);

  const handleGoogleLogin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      setSignInLoading("google");
      await signInWithGoogle();
    } catch (error) {
      console.error("Google sign-in error:", error);
      alert("Unable to sign in with Google. Please try again.");
      setSignInLoading(null);
    }
  };

  const handleAppleLogin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      setSignInLoading("apple");
      await signInWithApple();
    } catch (error: any) {
      if (error.code === "ERR_REQUEST_CANCELED") {
        setSignInLoading(null);
        return;
      }
      console.error("Apple Sign-In error:", error);
      alert("An error occurred during Apple Sign-In.");
      setSignInLoading(null);
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <ScreenContainer className="px-6" edges={["top", "bottom", "left", "right"]}>
        <View className="flex-1 justify-center items-center">
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require("@/assets/images/icon.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Title */}
          <Text style={[styles.signInTitle, { color: colors.foreground }]}>
            Sign In
          </Text>
          <Text style={[styles.signInSubtitle, { color: colors.muted }]}>
            Sign in to access your profile, search history, and saved protocols
          </Text>

          {/* Sign In Buttons */}
          <View style={styles.authButtonsContainer}>
            {/* Google Sign In */}
            <TouchableOpacity
              onPress={handleGoogleLogin}
              disabled={signInLoading !== null}
              style={[
                styles.signInButton,
                { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: colors.border },
                signInLoading !== null && { opacity: 0.7 },
              ]}
              activeOpacity={0.8}
            >
              {signInLoading === "google" ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <GoogleLogo size={20} />
              )}
              <Text style={[styles.signInButtonText, { color: colors.foreground, marginLeft: 12 }]}>
                Continue with Google
              </Text>
            </TouchableOpacity>

            {/* Apple Sign In - uses Supabase OAuth */}
            <TouchableOpacity
              onPress={handleAppleLogin}
              disabled={signInLoading !== null}
              style={[
                styles.signInButton,
                { backgroundColor: "#000000" },
                signInLoading !== null && { opacity: 0.7 },
              ]}
              activeOpacity={0.8}
            >
              {signInLoading === "apple" ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <AppleLogo size={20} color="white" />
              )}
              <Text style={[styles.signInButtonText, { color: "#FFFFFF", marginLeft: 12 }]}>
                Continue with Apple
              </Text>
            </TouchableOpacity>
          </View>

          {/* Info text */}
          <Text style={[styles.infoText, { color: colors.muted }]}>
            Free account includes 5 protocol lookups per day
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  const isPro = usage?.tier === "pro" || usage?.tier === "enterprise";

  return (
    <ScreenContainer>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>
              {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || "U"}
            </Text>
          </View>
          <Text style={[styles.userName, { color: colors.foreground }]}>
            {user.name || "User"}
          </Text>
          <Text style={[styles.userEmail, { color: colors.muted }]}>{user.email || "No email"}</Text>
          {usage && (
            <View style={styles.tierContainer}>
              <View style={[styles.tierBadge, { backgroundColor: getTierBadgeColor(usage.tier) }]}>
                <Text style={styles.tierText}>{getTierLabel(usage.tier)}</Text>
              </View>
              {getSubscriptionStatusBadge()}
            </View>
          )}
        </View>

        {/* Pro Subscription Card */}
        {isPro && subscriptionStatus && (
          <View style={[styles.card, { backgroundColor: '#FFFFFF', borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: `${colors.primary}15` }]}>
                <IconSymbol name="heart.fill" size={18} color={colors.primary} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Pro Subscription</Text>
            </View>
            <View style={styles.subscriptionDetails}>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.muted }]}>Plan</Text>
                <Text style={[styles.detailValue, { color: colors.foreground }]}>
                  {subscriptionStatus.tier === "pro" ? "Pro" : "Enterprise"}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.muted }]}>Status</Text>
                <Text style={[styles.detailValue, { color: colors.foreground }]}>
                  {subscriptionStatus.subscriptionStatus || "Active"}
                </Text>
              </View>
              {subscriptionStatus.subscriptionEndDate && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.muted }]}>
                    {subscriptionStatus.subscriptionStatus === "canceled" ? "Expires" : "Renews"}
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.foreground }]}>
                    {formatDate(subscriptionStatus.subscriptionEndDate)}
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={handleManageSubscription}
              disabled={isLoadingPortal}
              style={[styles.outlineButton, { borderColor: colors.primary, opacity: isLoadingPortal ? 0.6 : 1 }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.outlineButtonText, { color: colors.primary }]}>
                {isLoadingPortal ? "Loading..." : "Manage Subscription"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Usage Card (Free) */}
        {usage && usage.tier === "free" && (
          <View style={[styles.card, { backgroundColor: '#FFFFFF', borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: `${colors.primary}15` }]}>
                <IconSymbol name="doc.text.fill" size={18} color={colors.primary} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Daily Usage</Text>
            </View>
            <View style={styles.progressContainer}>
              <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: usage.count >= usage.limit ? colors.error : colors.primary,
                      width: `${Math.min((usage.count / usage.limit) * 100, 100)}%`,
                    },
                  ]}
                />
              </View>
            </View>
            <Text style={[styles.usageText, { color: colors.muted }]}>
              {usage.count} of {usage.limit} queries used today
            </Text>
            {usage.count >= usage.limit && (
              <View style={[styles.limitWarning, { backgroundColor: colors.error + "15" }]}>
                <Text style={[styles.limitWarningText, { color: colors.error }]}>
                  Daily limit reached. Upgrade to Pro for unlimited queries.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Recent Queries Card */}
        <View style={[styles.card, { backgroundColor: '#FFFFFF', borderColor: colors.border }]}>
          <View style={styles.cardHeaderWithAction}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: `${colors.primary}15` }]}>
                <IconSymbol name="clock.fill" size={18} color={colors.primary} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Recent Queries</Text>
            </View>
            <TouchableOpacity onPress={() => router.push("/(tabs)/history" as any)} activeOpacity={0.7}>
              <Text style={[styles.viewAllText, { color: colors.primary }]}>View All</Text>
            </TouchableOpacity>
          </View>
          {recentQueries && recentQueries.length > 0 ? (
            <View style={styles.queriesList}>
              {recentQueries.slice(0, 3).map((query: { id: number; queryText: string; createdAt: Date }, index: number) => (
                <View
                  key={query.id || index}
                  style={[styles.queryItem, index < 2 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                >
                  <Text style={[styles.queryText, { color: colors.foreground }]} numberOfLines={1}>
                    {query.queryText}
                  </Text>
                  <Text style={[styles.queryDate, { color: colors.muted }]}>{formatDate(query.createdAt)}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.emptyQueriesText, { color: colors.muted }]}>
              No queries yet. Start searching for protocols!
            </Text>
          )}
        </View>

        {/* Offline Cache Card */}
        <View style={[styles.card, { backgroundColor: '#FFFFFF', borderColor: colors.border }]}>
          <View style={styles.cardHeaderWithAction}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: `${colors.primary}15` }]}>
                <IconSymbol name="arrow.down.circle.fill" size={18} color={colors.primary} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Offline Cache</Text>
            </View>
            {itemCount > 0 && (
              <View style={[styles.countBadge, { backgroundColor: colors.success + "20" }]}>
                <Text style={[styles.countText, { color: colors.success }]}>{itemCount} saved</Text>
              </View>
            )}
          </View>
          <Text style={[styles.cacheDescription, { color: colors.muted }]}>
            {itemCount > 0
              ? `${itemCount} protocols cached (${cacheSize}). Access offline.`
              : "Search protocols to save for offline access."}
          </Text>
          {itemCount > 0 && (
            <TouchableOpacity
              onPress={handleClearCache}
              style={[styles.outlineButton, { borderColor: colors.error }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.outlineButtonText, { color: colors.error }]}>Clear Cache</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Favorites Section */}
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>Saved Protocols</Text>
        <View style={[styles.card, { backgroundColor: '#FFFFFF', borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: `${colors.error}15` }]}>
              <IconSymbol name="heart.fill" size={18} color={colors.error} />
            </View>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Favorites</Text>
            <View style={styles.cardBadge}>
              <Text style={[styles.cardBadgeText, { color: colors.muted }]}>{favorites.length}</Text>
            </View>
          </View>
          {favorites.length > 0 ? (
            <View style={styles.favoritesList}>
              {favorites.slice(0, 5).map((fav) => (
                <View key={fav.id} style={[styles.favoriteItem, { borderBottomColor: colors.border }]}>
                  <View style={styles.favoriteContent}>
                    <Text style={[styles.favoriteTitle, { color: colors.foreground }]} numberOfLines={1}>
                      {fav.protocolTitle}
                    </Text>
                    {fav.agencyName && (
                      <Text style={[styles.favoriteAgency, { color: colors.muted }]} numberOfLines={1}>
                        {fav.agencyName}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      removeFavorite(fav.id);
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <IconSymbol name="xmark" size={16} color={colors.muted} />
                  </TouchableOpacity>
                </View>
              ))}
              {favorites.length > 5 && (
                <Text style={[styles.moreText, { color: colors.muted }]}>
                  +{favorites.length - 5} more saved
                </Text>
              )}
            </View>
          ) : (
            <Text style={[styles.cacheDescription, { color: colors.muted }]}>
              Tap the heart icon on any protocol to save it here for quick access.
            </Text>
          )}
        </View>

        {/* Upgrade Card (Free) */}
        {usage && usage.tier === "free" && (
          <View style={[styles.upgradeCard, { backgroundColor: `${colors.primary}08`, borderColor: colors.primary }]}>
            <View style={styles.upgradeHeader}>
              <View style={[styles.starBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.starText}>★</Text>
              </View>
              <Text style={[styles.upgradeTitle, { color: colors.foreground }]}>Upgrade to Pro</Text>
            </View>
            <Text style={[styles.upgradeDescription, { color: colors.muted }]}>
              Unlimited queries, all counties, offline access, and priority support.
            </Text>
            <View style={styles.priceRow}>
              <Text style={[styles.priceAmount, { color: colors.primary }]}>$39</Text>
              <Text style={[styles.pricePeriod, { color: colors.muted }]}>/year</Text>
              <Text style={[styles.priceAlt, { color: colors.muted }]}>(or $4.99/mo)</Text>
            </View>
            <TouchableOpacity
              onPress={handleUpgrade}
              style={[styles.upgradeButton, { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
            >
              <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Appearance Section */}
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>Appearance</Text>
        <View style={[styles.card, { backgroundColor: '#FFFFFF', borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: `${colors.primary}15` }]}>
              <IconSymbol name="paintbrush.fill" size={18} color={colors.primary} />
            </View>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Theme</Text>
          </View>
          <View style={styles.themeToggleContainer}>
            <ThemeToggle showLabels />
          </View>
        </View>

        {/* Support Section */}
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>Support</Text>
        <View style={[styles.menuCard, { backgroundColor: '#FFFFFF', borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            activeOpacity={0.7}
            onPress={() => router.push("/feedback?category=error" as any)}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconCircle, { backgroundColor: colors.warning + "15" }]}>
                <IconSymbol name="exclamationmark.triangle.fill" size={16} color={colors.warning} />
              </View>
              <Text style={[styles.menuItemText, { color: colors.foreground }]}>Report Protocol Error</Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color={colors.muted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            activeOpacity={0.7}
            onPress={() => router.push("/feedback?category=suggestion" as any)}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconCircle, { backgroundColor: colors.primary + "15" }]}>
                <IconSymbol name="heart.fill" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.menuItemText, { color: colors.foreground }]}>Suggest Improvement</Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color={colors.muted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItemLast}
            activeOpacity={0.7}
            onPress={() => router.push("/feedback?category=general" as any)}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconCircle, { backgroundColor: colors.muted + "20" }]}>
                <IconSymbol name="paperplane.fill" size={16} color={colors.muted} />
              </View>
              <Text style={[styles.menuItemText, { color: colors.foreground }]}>Send Feedback</Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color={colors.muted} />
          </TouchableOpacity>
        </View>

        {/* Legal Section */}
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>Legal</Text>
        <View style={[styles.menuCard, { backgroundColor: '#FFFFFF', borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            activeOpacity={0.7}
            onPress={() => router.push("/disclaimer" as any)}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconCircle, { backgroundColor: colors.warning + "15" }]}>
                <IconSymbol name="exclamationmark.triangle.fill" size={16} color={colors.warning} />
              </View>
              <Text style={[styles.menuItemText, { color: colors.foreground }]}>Medical Disclaimer</Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color={colors.muted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            activeOpacity={0.7}
            onPress={() => router.push("/privacy" as any)}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconCircle, { backgroundColor: colors.muted + "20" }]}>
                <IconSymbol name="info.circle.fill" size={16} color={colors.muted} />
              </View>
              <Text style={[styles.menuItemText, { color: colors.foreground }]}>Privacy Policy</Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color={colors.muted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItemLast}
            activeOpacity={0.7}
            onPress={() => router.push("/terms" as any)}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconCircle, { backgroundColor: colors.muted + "20" }]}>
                <IconSymbol name="info.circle.fill" size={16} color={colors.muted} />
              </View>
              <Text style={[styles.menuItemText, { color: colors.foreground }]}>Terms of Service</Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color={colors.muted} />
          </TouchableOpacity>
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          onPress={handleLogout}
          style={[styles.signOutButton, { borderColor: colors.error }]}
          activeOpacity={0.7}
        >
          <Text style={[styles.signOutText, { color: colors.error }]}>Sign Out</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={[styles.versionText, { color: colors.muted }]}>Protocol Guide v1.0.0</Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 8,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 12,
  },
  tierContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tierBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tierText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHeaderWithAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  subscriptionDetails: {
    marginTop: 16,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  outlineButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  outlineButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  progressContainer: {
    marginTop: 16,
    marginBottom: 12,
  },
  progressBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  usageText: {
    fontSize: 14,
  },
  limitWarning: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
  },
  limitWarningText: {
    fontSize: 13,
  },
  queriesList: {
    marginTop: 4,
  },
  queryItem: {
    paddingVertical: 14,
  },
  queryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  queryDate: {
    fontSize: 12,
    marginTop: 4,
  },
  emptyQueriesText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 16,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cacheDescription: {
    fontSize: 14,
    marginTop: 4,
    marginBottom: 16,
  },
  upgradeCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
  },
  upgradeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  starBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  starText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  upgradeTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  upgradeDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  priceAmount: {
    fontSize: 32,
    fontWeight: '700',
  },
  pricePeriod: {
    fontSize: 16,
    marginLeft: 2,
  },
  priceAlt: {
    fontSize: 13,
    marginLeft: 8,
  },
  upgradeButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginTop: 8,
  },
  menuCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  menuItemLast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 15,
  },
  signOutButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    marginTop: 8,
  },
  signOutText: {
    fontWeight: '600',
    fontSize: 15,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 24,
  },
  logo: {
    width: 72,
    height: 72,
  },
  signInTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  signInSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 320,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    shadowColor: '#A31621',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 13,
    marginTop: 16,
  },
  authButtonsContainer: {
    width: '100%',
    maxWidth: 320,
    gap: 12,
  },
  appleButton: {
    width: '100%',
    height: 52,
  },
  appleButtonAlt: {
    backgroundColor: '#000000',
    shadowColor: '#000000',
  },
  favoritesList: {
    marginTop: 12,
  },
  favoriteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  favoriteContent: {
    flex: 1,
    marginRight: 12,
  },
  favoriteTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  favoriteAgency: {
    fontSize: 12,
    marginTop: 2,
  },
  moreText: {
    fontSize: 13,
    textAlign: 'center',
    paddingTop: 12,
  },
  cardBadge: {
    marginLeft: 'auto',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  cardBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
