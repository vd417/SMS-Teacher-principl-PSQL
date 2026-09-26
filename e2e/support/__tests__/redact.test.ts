import { redact } from '../redact';

test('redacts sensitive keys at any depth', () => {
  expect(
    redact({
      data: { access_token: 'a', refresh_token: 'b', user: { password_hash: 'h', name: 'Asha' } },
    })
  ).toEqual({
    data: {
      access_token: '[REDACTED]',
      refresh_token: '[REDACTED]',
      user: { password_hash: '[REDACTED]', name: 'Asha' },
    },
  });
});

test('redacts JWT-shaped strings inside ordinary values', () => {
  const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJl';
  expect(redact({ note: `Bearer ${jwt}`, list: [jwt] })).toEqual({
    note: 'Bearer [REDACTED_JWT]',
    list: ['[REDACTED_JWT]'],
  });
});

test('leaves ordinary data untouched', () => {
  expect(
    redact({ data: [{ id: 'x', name: 'IX-A', student_count: 10, cookieJar: undefined }] })
  ).toEqual({
    data: [{ id: 'x', name: 'IX-A', student_count: 10, cookieJar: '[REDACTED]' }],
  });
});
