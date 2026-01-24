/**
 * Supabase Auth Events Webhook Handler
 * Handles auth events from Supabase to enforce token revocation
 *
 * Events handled:
 * - user.updated (password change, email change)
 * - user.deleted
 *
 * SETUP:
 * 1. Deploy: supabase functions deploy auth-events
 * 2. Set webhook in Supabase Dashboard:
 *    Auth > Settings > Webhooks > Add webhook
 *    URL: https://<project>.supabase.co/functions/v1/auth-events
 *    Events: user.updated, user.deleted
 * 3. Set AUTH_WEBHOOK_SECRET in environment variables (required for security)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts';
import { encode } from 'https://deno.land/std@0.177.0/encoding/hex.ts';

const REDIS_URL = Deno.env.get('REDIS_URL');
const WEBHOOK_SECRET = Deno.env.get('AUTH_WEBHOOK_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface AuthEvent {
  type: 'user.updated' | 'user.deleted';
  user: {
    id: string;
    email?: string;
    email_changed_at?: string;
  };
  old_record?: {
    email?: string;
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature',
};

async function revokeTokensInRedis(
  userId: string,
  reason: string,
  metadata?: Record<string, any>
): Promise<boolean> {
  if (!REDIS_URL) {
    console.warn('[AuthEvents] Redis not configured, skipping token revocation');
    return false;
  }

  try {
    const response = await fetch(`${REDIS_URL}/set/revoked:user:${userId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('REDIS_TOKEN')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        value: JSON.stringify({
          reason,
          revokedAt: Date.now(),
          metadata,
        }),
        ex: 7 * 24 * 3600, // 7 days
      }),
    });

    if (!response.ok) {
      console.error('[AuthEvents] Failed to revoke tokens in Redis:', await response.text());
      return false;
    }

    console.log(`[AuthEvents] Tokens revoked for user ${userId}: ${reason}`);
    return true;
  } catch (error) {
    console.error('[AuthEvents] Error revoking tokens:', error);
    return false;
  }
}

async function signOutAllSessions(userId: string): Promise<void> {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Sign out all sessions for this user
    const { error } = await supabase.auth.admin.signOut(userId, 'global');

    if (error) {
      console.error('[AuthEvents] Failed to sign out user sessions:', error);
    } else {
      console.log(`[AuthEvents] All sessions signed out for user ${userId}`);
    }
  } catch (error) {
    console.error('[AuthEvents] Error signing out sessions:', error);
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify webhook signature (basic security)
    const signature = req.headers.get('x-webhook-signature');
    if (WEBHOOK_SECRET && signature !== WEBHOOK_SECRET) {
      console.warn('[AuthEvents] Invalid webhook signature');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const event: AuthEvent = await req.json();
    console.log('[AuthEvents] Received event:', event.type, 'for user:', event.user.id);

    switch (event.type) {
      case 'user.updated': {
        // Check if email or password changed
        const emailChanged = event.old_record?.email &&
                           event.user.email &&
                           event.old_record.email !== event.user.email;

        const passwordChanged = event.user.email_changed_at; // Supabase doesn't expose password change directly

        if (emailChanged) {
          console.log(`[AuthEvents] Email changed for user ${event.user.id}`);
          await Promise.all([
            revokeTokensInRedis(event.user.id, 'email_change', {
              oldEmail: event.old_record.email,
              newEmail: event.user.email,
            }),
            signOutAllSessions(event.user.id),
          ]);
        } else {
          // Assume password change if not email change
          console.log(`[AuthEvents] Password changed for user ${event.user.id}`);
          await Promise.all([
            revokeTokensInRedis(event.user.id, 'password_change'),
            signOutAllSessions(event.user.id),
          ]);
        }
        break;
      }

      case 'user.deleted': {
        console.log(`[AuthEvents] User deleted: ${event.user.id}`);
        // Permanent revocation for deleted accounts
        if (REDIS_URL) {
          await fetch(`${REDIS_URL}/set/revoked:permanent:${event.user.id}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('REDIS_TOKEN')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              value: JSON.stringify({
                reason: 'account_deletion',
                revokedAt: Date.now(),
              }),
              // No TTL - permanent
            }),
          });
        }
        await signOutAllSessions(event.user.id);
        break;
      }

      default:
        console.log(`[AuthEvents] Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ success: true, processed: event.type }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[AuthEvents] Error processing webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
