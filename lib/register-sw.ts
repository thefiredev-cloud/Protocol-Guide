/**
 * Service Worker Registration for PWA
 * Handles service worker registration, updates, and offline capabilities
 */

export function registerServiceWorker(): void {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) {
    console.log('[SW] Service workers not supported');
    return;
  }

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('[SW] Service worker registered:', registration.scope);

      // Check for updates periodically
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000); // Check every hour

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        console.log('[SW] Update found, installing new service worker...');

        newWorker.addEventListener('statechange', () => {
          console.log('[SW] State changed to:', newWorker.state);

          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New content available, notify user
            console.log('[SW] New content available');

            // Show update notification
            showUpdateNotification(() => {
              // Tell the new service worker to skip waiting
              newWorker.postMessage({ type: 'SKIP_WAITING' });
              // Reload to activate the new service worker
              window.location.reload();
            });
          }
        });
      });

      // Handle controller change (when new service worker takes over)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[SW] Controller changed, reloading page...');
        // The page will reload automatically if the user accepted the update
      });

      // Log installation success
      if (registration.active) {
        console.log('[SW] Service worker active and ready');
      }
    } catch (error) {
      console.error('[SW] Service worker registration failed:', error);
    }
  });

  // Handle online/offline status
  window.addEventListener('online', () => {
    console.log('[SW] Back online');
  });

  window.addEventListener('offline', () => {
    console.log('[SW] Gone offline');
  });
}

/**
 * Show a notification when an update is available
 */
function showUpdateNotification(onUpdate: () => void): void {
  // For a production app, you might want to show a toast/banner
  // For now, we'll auto-update after a delay
  console.log('[SW] Update will be applied on next reload');

  // Optional: Show a simple notification
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Protocol Guide Update', {
      body: 'A new version is available. The app will update on next reload.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
    });
  }

  // Auto-update after 5 seconds (optional - remove if you want manual updates)
  setTimeout(() => {
    onUpdate();
  }, 5000);
}
