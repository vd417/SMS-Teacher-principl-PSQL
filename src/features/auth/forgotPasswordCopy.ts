export type ForgotPasswordMode = 'reset' | 'create';

export interface ForgotPasswordCopy {
  title: string;
  step1Subtitle: string;
  step2Subtitle: string;
  submitLabel: string;
  submitLabelPending: string;
  doneMessage: string;
}

const STEP2_SUBTITLE = 'Enter the code we sent and choose a new password.';

const COPY: Record<ForgotPasswordMode, ForgotPasswordCopy> = {
  reset: {
    title: 'Reset password',
    step1Subtitle: "Enter your email or mobile number and we'll send a verification code.",
    step2Subtitle: STEP2_SUBTITLE,
    submitLabel: 'Reset password',
    submitLabelPending: 'Resetting…',
    doneMessage: 'Your password has been reset. Sign in with your new password.',
  },
  create: {
    title: 'Create your password',
    step1Subtitle:
      "First time here? Enter your email or mobile number and we'll send a verification code to create your password.",
    step2Subtitle: STEP2_SUBTITLE,
    submitLabel: 'Create password',
    submitLabelPending: 'Creating…',
    doneMessage: 'Your password has been created. Sign in with your new password.',
  },
};

/** Selects display copy for ForgotPasswordScreen based on entry point; defaults to 'reset'. */
export function getForgotPasswordCopy(mode: ForgotPasswordMode | undefined): ForgotPasswordCopy {
  return COPY[mode ?? 'reset'];
}
