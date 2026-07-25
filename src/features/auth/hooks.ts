import { useMutation } from '@tanstack/react-query';
import { useAuth } from './AuthProvider';

export function useLogin() {
  const { signIn } = useAuth();
  return useMutation({
    mutationFn: ({ identifier, password }: { identifier: string; password: string }) =>
      signIn(identifier, password),
  });
}

export function useForgotPassword() {
  const { forgotPassword } = useAuth();
  return useMutation({ mutationFn: (identifier: string) => forgotPassword(identifier) });
}

export function useResetPassword() {
  const { resetPassword } = useAuth();
  return useMutation({
    mutationFn: ({
      identifier,
      code,
      password,
    }: {
      identifier: string;
      code: string;
      password: string;
    }) => resetPassword(identifier, code, password),
  });
}

export function useChangePassword() {
  const { changePassword } = useAuth();
  return useMutation({ mutationFn: (password: string) => changePassword(password) });
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

export function useSwitchSchool() {
  const { switchSchool } = useAuth();
  return useMutation({ mutationFn: (tenantId: string) => switchSchool(tenantId) });
}

export function useUpdatePhoto() {
  const { updatePhoto } = useAuth();
  return useMutation({ mutationFn: (photoUrl: string | null) => updatePhoto(photoUrl) });
}
