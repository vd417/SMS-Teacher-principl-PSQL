import { validateNewPassword } from '../passwordValidation';

test('accepts an 8+ char password that matches its confirmation', () => {
  expect(validateNewPassword('newpass12', 'newpass12')).toBeNull();
});

test('rejects short passwords', () => {
  expect(validateNewPassword('short', 'short')).toBe('Password must be at least 8 characters.');
});

test('rejects a mismatched confirmation', () => {
  expect(validateNewPassword('newpass12', 'newpass99')).toBe('Passwords do not match.');
});
