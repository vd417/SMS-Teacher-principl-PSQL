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
