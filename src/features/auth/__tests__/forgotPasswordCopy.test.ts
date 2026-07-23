import { getForgotPasswordCopy } from '../forgotPasswordCopy';

test('defaults to reset copy when mode is undefined', () => {
  const copy = getForgotPasswordCopy(undefined);
  expect(copy.title).toBe('Reset password');
  expect(copy.step1Subtitle).toBe(
    "Enter your email or mobile number and we'll send a verification code."
  );
  expect(copy.step2Subtitle).toBe('Enter the code we sent and choose a new password.');
  expect(copy.submitLabel).toBe('Reset password');
  expect(copy.submitLabelPending).toBe('Resetting…');
  expect(copy.doneMessage).toBe('Your password has been reset. Sign in with your new password.');
});

test('returns reset copy for mode "reset"', () => {
  const copy = getForgotPasswordCopy('reset');
  expect(copy.title).toBe('Reset password');
  expect(copy.submitLabel).toBe('Reset password');
});

test('returns create copy for mode "create"', () => {
  const copy = getForgotPasswordCopy('create');
  expect(copy.title).toBe('Create your password');
  expect(copy.step1Subtitle).toBe(
    "First time here? Enter your email or mobile number and we'll send a verification code to create your password."
  );
  expect(copy.step2Subtitle).toBe('Enter the code we sent and choose a new password.');
  expect(copy.submitLabel).toBe('Create password');
  expect(copy.submitLabelPending).toBe('Creating…');
  expect(copy.doneMessage).toBe('Your password has been created. Sign in with your new password.');
});
