import type { AuthRepository, OtpChallenge } from '@/data/repositories/types';
import type { Store } from './store';
import { simulateLatency } from '@/lib/latency';
import { AppError } from '@/lib/errors';
import { seed, principalSession } from './seed';

const OTP_CODE = '123456';
const ACCOUNTS = [seed.session, principalSession];

const normalizeEmail = (s: string) => s.trim().toLowerCase();
const normalizePhone = (s: string) => s.replace(/\D/g, '');

function findAccount(identifier: string) {
  const raw = identifier.trim();
  if (raw.includes('@')) {
    const email = normalizeEmail(raw);
    return ACCOUNTS.find((a) => a.user.email.toLowerCase() === email);
  }
  const phone = normalizePhone(raw);
  if (!phone) return undefined;
  return ACCOUNTS.find((a) => normalizePhone(a.user.phone) === phone);
}

function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  return `${name.slice(0, 1)}••@${domain}`;
}

function maskPhone(phone: string): string {
  return `••••${normalizePhone(phone).slice(-4)}`;
}

export function mockAuth(store: Store): AuthRepository {
  return {
    async login(email) {
      await simulateLatency();
      if (!email) throw new AppError({ code: 'invalid', status: 400, message: 'Email required' });
      await store.setCurrentAccount(email);
      return store.session;
    },
    async refresh() {
      await simulateLatency();
      return store.session;
    },
    async me() {
      await simulateLatency();
      return store.session.user;
    },
    async logout() {
      await simulateLatency();
    },
    async requestOtp(identifier): Promise<OtpChallenge> {
      await simulateLatency();
      if (!identifier || !identifier.trim()) {
        throw new AppError({
          code: 'invalid',
          status: 400,
          message: 'Enter a mobile number or email',
        });
      }
      const account = findAccount(identifier);
      if (!account) {
        throw new AppError({
          code: 'not_found',
          status: 404,
          message: "This mobile or email isn't registered.",
        });
      }
      const isEmail = identifier.includes('@');
      return {
        channel: isEmail ? 'email' : 'sms',
        destination: isEmail ? maskEmail(account.user.email) : maskPhone(account.user.phone),
        devCode: OTP_CODE,
      };
    },
    async verifyOtp(identifier, code) {
      await simulateLatency();
      if (code !== OTP_CODE) {
        throw new AppError({ code: 'invalid', status: 401, message: 'Invalid code. Try again.' });
      }
      const account = findAccount(identifier);
      if (!account) {
        throw new AppError({
          code: 'not_found',
          status: 404,
          message: "This mobile or email isn't registered.",
        });
      }
      await store.setCurrentAccount(account.user.email);
      return store.session;
    },
  };
}
