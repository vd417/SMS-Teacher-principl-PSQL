import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { pushPlatform } from '@/lib/push';
import { registerForPushNotificationsAsync } from '@/features/push/register';
import { routeFromResponse } from '@/features/push/route';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { useAuth } from '@/features/auth/AuthProvider';

// Native-only: skip on web so a failing expo-notifications call can't crash startup.
if (pushPlatform()) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** Authed-only: registers the device token on login and routes bus-push taps. Renders nothing. */
export function PushNotifications() {
  const { status, session } = useAuth();
  const userId = session?.user.id;
  const role = session?.user.role;
  const repos = useRepositories();
  // Keyed on the user id, not a boolean: this component never unmounts (it sits beside the
  // navigator), so after a logout→login of a *different* user on the same device the token
  // must re-register for the new user rather than stay bound to the previous one.
  const registeredFor = useRef<string | null>(null);

  useEffect(() => {
    if (status !== 'authenticated' || !pushPlatform()) return;

    if (userId && registeredFor.current !== userId) {
      registeredFor.current = userId;
      registerForPushNotificationsAsync().then((reg) => {
        if (reg) {
          repos.devices
            .register({ expoPushToken: reg.token, platform: reg.platform })
            .catch(() => {});
        }
      });
    }

    const sub = Notifications.addNotificationResponseReceivedListener((resp) =>
      routeFromResponse(resp, role)
    );
    Notifications.getLastNotificationResponseAsync()
      .then((resp) => routeFromResponse(resp, role))
      .catch(() => {});
    return () => sub.remove();
  }, [status, userId, role, repos]);

  return null;
}
