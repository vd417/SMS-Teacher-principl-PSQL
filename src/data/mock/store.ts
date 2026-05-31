import { readJson, writeJson } from '@/lib/asyncStore';
import { seed, type SeedShape } from './seed';

export type TableName = keyof Omit<SeedShape, 'session'>;
const STORAGE_PREFIX = 'sd.mock.';

export interface Store {
  tables: Omit<SeedShape, 'session'>;
  session: SeedShape['session'];
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
  let counter = 0;
  return {
    tables,
    session: seed.session,
    async persist(table) {
      await writeJson(`${STORAGE_PREFIX}${table}`, tables[table]);
    },
    genId(prefix) {
      counter += 1;
      return `${prefix}_${counter.toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
    },
  };
}
