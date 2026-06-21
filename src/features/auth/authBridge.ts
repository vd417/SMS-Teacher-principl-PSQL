// A tiny mutable bridge so the httpClient (created at startup, before AuthProvider
// mounts) can trigger a token refresh or a forced sign-out without importing React.
// AuthProvider registers the real implementations on mount.

type RefreshFn = () => Promise<boolean>;
type SignOutFn = () => Promise<void>;

let refreshFn: RefreshFn = async () => false;
let signOutFn: SignOutFn = async () => {};

export const authBridge = {
  register(impl: { refresh: RefreshFn; signOut: SignOutFn }): void {
    refreshFn = impl.refresh;
    signOutFn = impl.signOut;
  },
  refresh(): Promise<boolean> {
    return refreshFn();
  },
  signOut(): Promise<void> {
    return signOutFn();
  },
};
