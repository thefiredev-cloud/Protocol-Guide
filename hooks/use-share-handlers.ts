/**
 * useShareHandlers Hook
 * 
 * Provides share functionality for referral codes via multiple channels.
 * Handles clipboard, SMS, WhatsApp, Email, and native share.
 */

import { useCallback } from "react";
import { Share, Platform, Linking } from "react-native";
import * as Clipboard from "expo-clipboard";
import type { UseMutationResult } from "@tanstack/react-query";

interface ShareTemplates {
  code: string;
  sms?: string;
  whatsapp?: string;
  email?: {
    subject: string;
    body: string;
  };
  generic?: string;
  shareUrl?: string;
}

interface TrackEventParams {
  eventType: string;
  metadata: Record<string, unknown>;
}

interface UseShareHandlersProps {
  referralCode?: string;
  templates?: ShareTemplates;
  trackEvent: UseMutationResult<unknown, unknown, TrackEventParams, unknown>;
  onCopySuccess?: () => void;
}

export function useShareHandlers({
  referralCode,
  templates,
  trackEvent,
  onCopySuccess,
}: UseShareHandlersProps) {
  const handleCopyCode = useCallback(async () => {
    if (!referralCode) return;

    await Clipboard.setStringAsync(referralCode);
    onCopySuccess?.();

    trackEvent.mutate({
      eventType: "referral_code_copied",
      metadata: { referralCode },
    });
  }, [referralCode, trackEvent, onCopySuccess]);

  const handleShareSMS = useCallback(async () => {
    if (!templates?.sms) return;

    trackEvent.mutate({
      eventType: "referral_code_shared",
      metadata: { shareMethod: "sms", referralCode: templates.code },
    });

    const encodedMessage = encodeURIComponent(templates.sms);
    const smsUrl = Platform.select({
      ios: `sms:&body=${encodedMessage}`,
      android: `sms:?body=${encodedMessage}`,
      default: `sms:?body=${encodedMessage}`,
    });

    if (Platform.OS === "web") {
      await Share.share({ message: templates.sms });
    } else {
      await Linking.openURL(smsUrl);
    }
  }, [templates, trackEvent]);

  const handleShareWhatsApp = useCallback(async () => {
    if (!templates?.whatsapp) return;

    trackEvent.mutate({
      eventType: "referral_code_shared",
      metadata: { shareMethod: "whatsapp", referralCode: templates.code },
    });

    const encodedMessage = encodeURIComponent(templates.whatsapp);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;

    if (Platform.OS === "web") {
      window.open(whatsappUrl, "_blank");
    } else {
      await Linking.openURL(whatsappUrl);
    }
  }, [templates, trackEvent]);

  const handleShareEmail = useCallback(async () => {
    if (!templates?.email) return;

    trackEvent.mutate({
      eventType: "referral_code_shared",
      metadata: { shareMethod: "email", referralCode: templates.code },
    });

    const encodedSubject = encodeURIComponent(templates.email.subject);
    const encodedBody = encodeURIComponent(templates.email.body);
    const emailUrl = `mailto:?subject=${encodedSubject}&body=${encodedBody}`;
    await Linking.openURL(emailUrl);
  }, [templates, trackEvent]);

  const handleNativeShare = useCallback(async () => {
    if (!templates?.generic) return;

    trackEvent.mutate({
      eventType: "share_button_tapped",
      metadata: { referralCode: templates.code },
    });

    try {
      await Share.share({
        message: templates.generic,
        url: templates.shareUrl,
      });
      trackEvent.mutate({
        eventType: "social_share_completed",
        metadata: { referralCode: templates.code },
      });
    } catch {
      // User cancelled share
    }
  }, [templates, trackEvent]);

  return {
    handleCopyCode,
    handleShareSMS,
    handleShareWhatsApp,
    handleShareEmail,
    handleNativeShare,
  };
}
