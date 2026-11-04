import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync } from '@/features/push/register';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { eas: { projectId: 'test-project' } } } },
}));

describe('registerForPushNotificationsAsync', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns token + platform when permission is granted', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'granted' });
    (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValueOnce({
      data: 'ExponentPushToken[abc]',
    });

    const reg = await registerForPushNotificationsAsync();

    expect(reg).toEqual({
      token: 'ExponentPushToken[abc]',
      platform: expect.stringMatching(/^(ios|android)$/),
    });
  });

  it('returns null and fetches no token when permission is denied', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'denied' });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      status: 'denied',
    });

    const reg = await registerForPushNotificationsAsync();

    expect(reg).toBeNull();
    expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
  });

  it('never throws when a native call fails', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'granted' });
    (Notifications.getExpoPushTokenAsync as jest.Mock).mockRejectedValueOnce(
      new Error('no FCM creds')
    );

    await expect(registerForPushNotificationsAsync()).resolves.toBeNull();
  });
});
