import { readJson, writeJson } from '@/lib/asyncStore';
import { seed, principalSession, type SeedShape } from './seed';

export type TableName = keyof Omit<SeedShape, 'session'>;
const STORAGE_PREFIX = 'sd.mock.';
const CURRENT_ACCOUNT_KEY = `${STORAGE_PREFIX}currentAccount`;

// All demo accounts, keyed by lowercased email.
export const ACCOUNTS = [seed.session, principalSession];
const accountByEmail = new Map(ACCOUNTS.map((s) => [s.user.email.toLowerCase(), s]));
const DEFAULT_EMAIL = seed.session.user.email.toLowerCase();

export interface Store {
  tables: Omit<SeedShape, 'session'>;
  session: SeedShape['session'];
  setCurrentAccount(email: string): Promise<void>;
  persist(table: TableName): Promise<void>;
  genId(prefix: string): string;
}

export async function createStore(): Promise<Store> {
  const tableNames = Object.keys(seed).filter((k) => k !== 'session') as TableName[];
  const tables = {} as Omit<SeedShape, 'session'>;
  for (const name of tableNames) {
    // Clone the seed fallback so mock writes never mutate the shared seed constant.
    const fallback = JSON.parse(JSON.stringify(seed[name]));
    tables[name] = await readJson(`${STORAGE_PREFIX}${name}`, fallback);
  }

  let currentEmail = (await readJson<string>(CURRENT_ACCOUNT_KEY, DEFAULT_EMAIL)).toLowerCase();
  if (!accountByEmail.has(currentEmail)) currentEmail = DEFAULT_EMAIL;

  let counter = 0;
  return {
    tables,
    get session() {
      return accountByEmail.get(currentEmail) ?? seed.session;
    },
    async setCurrentAccount(email) {
      const key = email.toLowerCase();
      if (!accountByEmail.has(key)) return;
      currentEmail = key;
      await writeJson(CURRENT_ACCOUNT_KEY, currentEmail);
    },
    async persist(table) {
      await writeJson(`${STORAGE_PREFIX}${table}`, tables[table]);
    },
    genId(prefix) {
      counter += 1;
      return `${prefix}_${counter.toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
    },
  };
}
