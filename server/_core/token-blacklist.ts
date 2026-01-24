import { getRedis } from './redis';
import { logger } from './logger';

const REVOCATION_PREFIX = 'revoked:user:';
const PERMANENT_REVOCATION_PREFIX = 'revoked:permanent:';
// Extended TTL to cover max JWT lifetime + buffer (7 days)
const TTL_SECONDS = 7 * 24 * 3600; // 7 days

export type RevocationReason =
  | 'password_change'
  | 'email_change'
  | 'user_initiated_logout_all'
  | 'security_incident'
  | 'account_deletion'
  | 'suspicious_activity'
  | 'admin_action';

interface RevocationRecord {
  reason: RevocationReason;
  revokedAt: number;
  metadata?: Record<string, any>;
}

/**
 * Revoke all tokens for a user with a specific reason
 * This will invalidate all existing sessions across all devices
 */
export async function revokeUserTokens(
  userId: string,
  reason: RevocationReason,
  metadata?: Record<string, any>
): Promise<boolean> {
  const redis = await getRedis();
  if (!redis) {
    logger.warn({ userId, reason }, '[TokenBlacklist] Redis not available, cannot revoke tokens');
    return false;
  }

  const record: RevocationRecord = {
    reason,
    revokedAt: Date.now(),
    metadata
  };

  const key = `${REVOCATION_PREFIX}${userId}`;
  await redis.set(key, JSON.stringify(record), { ex: TTL_SECONDS });

  logger.info(
    { userId, reason, metadata },
    '[TokenBlacklist] User tokens revoked'
  );

  return true;
}

/**
 * Permanently revoke tokens for deleted accounts or banned users
 * These revocations don't expire and should be cleaned up manually
 */
export async function permanentlyRevokeUserTokens(
  userId: string,
  reason: RevocationReason,
  metadata?: Record<string, any>
): Promise<boolean> {
  const redis = await getRedis();
  if (!redis) {
    logger.warn({ userId, reason }, '[TokenBlacklist] Redis not available, cannot permanently revoke tokens');
    return false;
  }

  const record: RevocationRecord = {
    reason,
    revokedAt: Date.now(),
    metadata
  };

  const key = `${PERMANENT_REVOCATION_PREFIX}${userId}`;
  // No TTL - permanent until manually removed
  await redis.set(key, JSON.stringify(record));

  logger.warn(
    { userId, reason, metadata },
    '[TokenBlacklist] User tokens permanently revoked'
  );

  return true;
}

/**
 * Check if a user's tokens have been revoked
 */
export async function isTokenRevoked(userId: string): Promise<boolean> {
  const redis = await getRedis();
  if (!redis) return false;

  // Check both temporary and permanent revocations
  const [tempRevoked, permRevoked] = await Promise.all([
    redis.get(`${REVOCATION_PREFIX}${userId}`),
    redis.get(`${PERMANENT_REVOCATION_PREFIX}${userId}`)
  ]);

  return tempRevoked !== null || permRevoked !== null;
}

/**
 * Get revocation details for a user
 */
export async function getRevocationDetails(userId: string): Promise<RevocationRecord | null> {
  const redis = await getRedis();
  if (!redis) return null;

  // Check permanent first, then temporary
  const permKey = `${PERMANENT_REVOCATION_PREFIX}${userId}`;
  const tempKey = `${REVOCATION_PREFIX}${userId}`;

  const permRevoked = await redis.get(permKey);
  if (permRevoked) {
    return typeof permRevoked === 'string' ? JSON.parse(permRevoked) : permRevoked as RevocationRecord;
  }

  const tempRevoked = await redis.get(tempKey);
  if (tempRevoked) {
    return typeof tempRevoked === 'string' ? JSON.parse(tempRevoked) : tempRevoked as RevocationRecord;
  }

  return null;
}

/**
 * Clear token revocation (for testing or after security incident resolved)
 */
export async function clearRevocation(userId: string): Promise<boolean> {
  const redis = await getRedis();
  if (!redis) return false;

  await Promise.all([
    redis.del(`${REVOCATION_PREFIX}${userId}`),
    redis.del(`${PERMANENT_REVOCATION_PREFIX}${userId}`)
  ]);

  logger.info({ userId }, '[TokenBlacklist] Token revocation cleared');
  return true;
}
