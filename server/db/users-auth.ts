/**
 * User authentication and OAuth provider management
 * Handles multi-provider authentication and account linking
 */

import { eq, and } from "drizzle-orm";
import { users, userAuthProviders, type User, type UserAuthProvider } from "../../drizzle/schema";
import { getDb } from "./connection";
import { sendWelcomeEmail } from "../_core/email";

/**
 * Find or create user by Supabase auth with provider info
 * Supports account linking when user signs in with multiple providers
 */
export async function findOrCreateUserBySupabaseAuth(
  supabaseId: string,
  metadata: {
    email?: string;
    name?: string;
    provider?: string;
    providerUserId?: string;
  }
): Promise<User | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot find/create user: database not available");
    return null;
  }

  try {
    // First, try to find existing user by supabaseId
    let existing = await db
      .select()
      .from(users)
      .where(eq(users.authId, supabaseId))
      .limit(1);

    // If not found by supabaseId, try by email for account linking
    if (existing.length === 0 && metadata.email) {
      existing = await db
        .select()
        .from(users)
        .where(eq(users.email, metadata.email))
        .limit(1);

      // If found by email, link the Supabase ID
      if (existing.length > 0) {
        await db.update(users)
          .set({ supabaseId })
          .where(eq(users.id, existing[0].id));
      }
    }

    if (existing.length > 0) {
      const user = existing[0];

      // Link provider if provided and not already linked
      if (metadata.provider && metadata.providerUserId) {
        await linkAuthProvider(user.id, {
          provider: metadata.provider,
          providerUserId: metadata.providerUserId,
        });
      }

      return user;
    }

    // Create new user
    const [newUser] = await db
      .insert(users)
      .values({
        openId: supabaseId,
        supabaseId,
        email: metadata.email,
        name: metadata.name,
        tier: "free",
        role: "user",
        queryCountToday: 0,
      })
      .returning({ id: users.id });

    // Link provider for new user
    if (metadata.provider && metadata.providerUserId) {
      await linkAuthProvider(newUser.id, {
        provider: metadata.provider,
        providerUserId: metadata.providerUserId,
      });
    }

    // Fetch and return the created user
    const created = await db
      .select()
      .from(users)
      .where(eq(users.id, newUser.id))
      .limit(1);

    const createdUser = created.length > 0 ? created[0] : null;

    // Send welcome email to new user (fire and forget - don't block auth flow)
    if (createdUser?.email) {
      sendWelcomeEmail(createdUser.email, createdUser.name || undefined).catch((err) => {
        console.error("[Auth] Failed to send welcome email:", err);
      });
    }

    return createdUser;
  } catch (error) {
    console.error("[Database] Failed to find/create user by supabaseAuth:", error);
    return null;
  }
}

/**
 * Link an auth provider to a user account
 */
export async function linkAuthProvider(
  userId: number,
  provider: {
    provider: string;
    providerUserId: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };

  try {
    // Check if this provider is already linked to this user
    const existing = await db
      .select()
      .from(userAuthProviders)
      .where(
        and(
          eq(userAuthProviders.userId, userId),
          eq(userAuthProviders.provider, provider.provider)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Already linked, update providerUserId if different
      if (existing[0].providerUserId !== provider.providerUserId) {
        await db
          .update(userAuthProviders)
          .set({ providerUserId: provider.providerUserId })
          .where(eq(userAuthProviders.id, existing[0].id));
      }
      return { success: true };
    }

    // Check if this provider account is linked to another user
    const otherUser = await db
      .select()
      .from(userAuthProviders)
      .where(
        and(
          eq(userAuthProviders.provider, provider.provider),
          eq(userAuthProviders.providerUserId, provider.providerUserId)
        )
      )
      .limit(1);

    if (otherUser.length > 0) {
      return { success: false, error: "This account is already linked to another user" };
    }

    // Link the provider
    await db.insert(userAuthProviders).values({
      userId,
      provider: provider.provider,
      providerUserId: provider.providerUserId,
    });

    return { success: true };
  } catch (error) {
    console.error("[Database] Failed to link auth provider:", error);
    return { success: false, error: "Failed to link provider" };
  }
}

/**
 * Unlink an auth provider from a user account
 */
export async function unlinkAuthProvider(
  userId: number,
  provider: string
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };

  try {
    // Check how many providers the user has
    const providers = await db
      .select()
      .from(userAuthProviders)
      .where(eq(userAuthProviders.userId, userId));

    if (providers.length <= 1) {
      return { success: false, error: "Cannot unlink the only authentication method" };
    }

    // Remove the provider
    await db
      .delete(userAuthProviders)
      .where(
        and(
          eq(userAuthProviders.userId, userId),
          eq(userAuthProviders.provider, provider)
        )
      );

    return { success: true };
  } catch (error) {
    console.error("[Database] Failed to unlink auth provider:", error);
    return { success: false, error: "Failed to unlink provider" };
  }
}

/**
 * Get all linked providers for a user
 */
export async function getUserAuthProviders(userId: number): Promise<UserAuthProvider[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(userAuthProviders)
    .where(eq(userAuthProviders.userId, userId));
}
