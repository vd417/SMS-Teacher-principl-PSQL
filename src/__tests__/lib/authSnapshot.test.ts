import { authSnapshot } from '@/lib/authSnapshot';

describe('authSnapshot', () => {
  afterEach(() => authSnapshot.clear());

  it('defaults to null token and tenant', () => {
    expect(authSnapshot.get()).toEqual({ accessToken: null, tenantId: null });
  });
  it('set then get returns the latest value', () => {
    authSnapshot.set({ accessToken: 'tok', tenantId: 'school_westbrook' });
    expect(authSnapshot.get()).toEqual({ accessToken: 'tok', tenantId: 'school_westbrook' });
  });
  it('clear resets to defaults', () => {
    authSnapshot.set({ accessToken: 'tok', tenantId: 't1' });
    authSnapshot.clear();
    expect(authSnapshot.get()).toEqual({ accessToken: null, tenantId: null });
  });
});
