import { sessionForStorage } from '@/lib/sessionStorage';
import type { Session } from '@/data/domain';

test('sessionForStorage strips photoUrl and data-uri school logos', () => {
  const session: Session = {
    accessToken: 'a',
    refreshToken: 'r',
    user: {
      id: 'u1',
      name: 'Teacher',
      initials: 'T',
      title: 'Teacher',
      email: 't@school.com',
      phone: '',
      employee: '',
      classroom: '',
      joined: '',
      role: 'teacher',
      mustSetPassword: false,
      photoUrl: 'data:image/png;base64,AAAA',
    },
    tenant: {
      id: 't1',
      name: 'Westbrook',
      tier: 'gold',
      planName: 'Gold',
      logoUrl: 'data:image/png;base64,BBBB',
    },
  };

  const stored = sessionForStorage(session);
  expect(stored.user.photoUrl).toBeNull();
  expect(stored.tenant.logoUrl).toBeNull();
});

test('sessionForStorage keeps short https logo urls', () => {
  const session: Session = {
    accessToken: 'a',
    refreshToken: 'r',
    user: {
      id: 'u1',
      name: 'Teacher',
      initials: 'T',
      title: 'Teacher',
      email: 't@school.com',
      phone: '',
      employee: '',
      classroom: '',
      joined: '',
      role: 'teacher',
      mustSetPassword: false,
      photoUrl: null,
    },
    tenant: {
      id: 't1',
      name: 'Westbrook',
      tier: 'gold',
      planName: 'Gold',
      logoUrl: 'https://cdn.example.com/logo.png',
    },
  };

  expect(sessionForStorage(session).tenant.logoUrl).toBe('https://cdn.example.com/logo.png');
});
