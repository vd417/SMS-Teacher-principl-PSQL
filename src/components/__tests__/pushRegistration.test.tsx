import { render, waitFor } from '@testing-library/react-native';

import { PushNotifications } from '@/components/PushNotifications';

type Auth = { status: string; session: { user: { id: string; role: string } } | null };
let mockAuthValue: Auth;
const mockDeviceRegister = jest.fn(async () => undefined);

jest.mock('@/features/auth/AuthProvider', () => ({ useAuth: () => mockAuthValue }));
jest.mock('@/data/repositories/RepositoryContext', () => ({
  useRepositories: () => ({ devices: { register: mockDeviceRegister } }),
}));
jest.mock('@/features/push/register', () => ({
  registerForPushNotificationsAsync: jest.fn(async () => ({
    token: 'ExponentPushToken[x]',
    platform: 'ios',
  })),
}));
jest.mock('@/navigation/navigationRef', () => ({
  navigationRef: { isReady: () => false, navigate: jest.fn() },
}));

const authed = (userId: string): Auth => ({
  status: 'authenticated',
  session: { user: { id: userId, role: 'teacher' } },
});

describe('PushNotifications device registration', () => {
  beforeEach(() => mockDeviceRegister.mockClear());

  it('re-registers the device token when a different user signs in on the same device', async () => {
    mockAuthValue = authed('user-A');
    const view = render(<PushNotifications />);
    await waitFor(() => expect(mockDeviceRegister).toHaveBeenCalledTimes(1));

    mockAuthValue = authed('user-B');
    view.rerender(<PushNotifications />);
    await waitFor(() => expect(mockDeviceRegister).toHaveBeenCalledTimes(2));
  });
});
