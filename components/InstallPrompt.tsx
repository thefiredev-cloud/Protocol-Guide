/**
 * Install Prompt Component
 * Shows a prompt to install the PWA on supported devices
 */

import { useState, useEffect } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    // Check if already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://');

    setIsStandalone(standalone);

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Don't show if already installed
    if (standalone) return;

    let promptTimer: NodeJS.Timeout | null = null;

    // Handle beforeinstallprompt event (Chrome/Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const event = e as BeforeInstallPromptEvent;
      setDeferredPrompt(event);

      // Show prompt after a delay
      promptTimer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS, show manual install instructions
    if (iOS && !standalone) {
      promptTimer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      if (promptTimer) clearTimeout(promptTimer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    await deferredPrompt.prompt();

    // Wait for the user's response
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('[Install] User accepted the install prompt');
    } else {
      console.log('[Install] User dismissed the install prompt');
    }

    // Clear the deferred prompt
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Remember dismissal for 7 days
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Don't show if dismissed recently
  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedTime < sevenDays) {
        setShowPrompt(false);
      }
    }
  }, []);

  if (!showPrompt || isStandalone || Platform.OS !== 'web') {
    return null;
  }

  return (
    <View
      style={{
        position: 'absolute' as any,
        bottom: 20,
        left: 20,
        right: 20,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        zIndex: 1000,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8, color: '#000' }}>
            Install Protocol Guide
          </Text>
          {isIOS ? (
            <Text style={{ fontSize: 14, color: '#666', lineHeight: 20 }}>
              Tap the share button{' '}
              <Text style={{ fontSize: 16 }}>⬆️</Text>{' '}
              and select &ldquo;Add to Home Screen&rdquo;
            </Text>
          ) : (
            <Text style={{ fontSize: 14, color: '#666', lineHeight: 20 }}>
              Install this app for quick access and offline use
            </Text>
          )}
        </View>
        <Pressable
          onPress={handleDismiss}
          style={{
            padding: 4,
          }}
        >
          <Text style={{ fontSize: 20, color: '#999' }}>✕</Text>
        </Pressable>
      </View>

      {!isIOS && deferredPrompt && (
        <View style={{ flexDirection: 'row', marginTop: 16, gap: 8 }}>
          <Pressable
            onPress={handleInstallClick}
            style={{
              flex: 1,
              backgroundColor: '#C41E3A',
              padding: 12,
              borderRadius: 8,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>
              Install
            </Text>
          </Pressable>
          <Pressable
            onPress={handleDismiss}
            style={{
              flex: 1,
              backgroundColor: '#f0f0f0',
              padding: 12,
              borderRadius: 8,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#666', fontWeight: '600', fontSize: 16 }}>
              Not Now
            </Text>
          </Pressable>
        </View>
      )}

      {isIOS && (
        <View style={{ marginTop: 16 }}>
          <Pressable
            onPress={handleDismiss}
            style={{
              backgroundColor: '#f0f0f0',
              padding: 12,
              borderRadius: 8,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#666', fontWeight: '600', fontSize: 16 }}>
              Got it
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
