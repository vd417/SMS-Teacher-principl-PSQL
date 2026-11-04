import { Platform } from 'react-native';
import { pushPlatform } from '@/lib/push';

describe('pushPlatform', () => {
  it('returns the OS on a native platform', () => {
    expect(['ios', 'android']).toContain(pushPlatform());
  });

  it('returns null on web (push unsupported)', () => {
    const spy = jest.replaceProperty(Platform, 'OS', 'web' as typeof Platform.OS);
    expect(pushPlatform()).toBeNull();
    spy.restore();
  });
});
