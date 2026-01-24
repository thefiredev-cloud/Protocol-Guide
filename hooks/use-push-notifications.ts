import { useEffect, useRef, useState } from 'react';
import type { EventSubscription } from 'expo-modules-core';
import * as Notifications from 'expo-notifications';
import { registerForPushNotifications } from '@/lib/notifications';
import { trpc } from '@/lib/trpc';

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const notificationListener = useRef<EventSubscription | null>(null);
  const responseListener = useRef<EventSubscription | null>(null);

  const savePushToken = trpc.user.savePushToken.useMutation();

  useEffect(() => {
    registerForPushNotifications().then((token) => {
      if (token) {
        setExpoPushToken(token);
        savePushToken.mutate({ token });
      }
    });

    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('[Push] Received:', notification);
      }
    );

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('[Push] Tapped:', response);
      }
    );

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return { expoPushToken };
}
