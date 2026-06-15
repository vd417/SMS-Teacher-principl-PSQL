import { useMutation } from '@tanstack/react-query';
import { useAuth } from './AuthProvider';

export function useLogin() {
  const { signIn } = useAuth();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      signIn(email, password),
  });
}

export function useLogout() {
  const { signOut } = useAuth();
  return useMutation({ mutationFn: () => signOut() });
}

export function useRequestOtp() {
  const { requestOtp } = useAuth();
  return useMutation({ mutationFn: (identifier: string) => requestOtp(identifier) });
}

export function useVerifyOtp() {
  const { signInWithOtp } = useAuth();
  return useMutation({
    mutationFn: ({ identifier, code }: { identifier: string; code: string }) =>
      signInWithOtp(identifier, code),
  });
}
