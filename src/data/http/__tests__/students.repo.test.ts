import { httpStudents } from '../students.repo';
import type { HttpClient } from '@/lib/httpClient';

function fakeHttp(page: { items: unknown[]; nextCursor: string | null }): HttpClient {
  return {
    get: async () => undefined,
    getList: async () => page,
    post: async () => undefined,
    put: async () => undefined,
    patch: async () => undefined,
    delete: async () => undefined,
  } as unknown as HttpClient;
}

test('listByClass returns a Page, injects classId, and surfaces nextCursor', async () => {
  const http = fakeHttp({
    items: [{ id: 's1', name: 'Ravi Kumar', roll: 3, attendance_pct: 88 }],
    nextCursor: 'cursor-2',
  });
  const repo = httpStudents(http);
  const page = await repo.listByClass('c1', { limit: 50 });
  expect(page.nextCursor).toBe('cursor-2');
  expect(page.items[0]).toMatchObject({ id: 's1', classId: 'c1', roll: '3', initials: 'RK' });
});
