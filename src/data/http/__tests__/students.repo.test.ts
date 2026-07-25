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

function recordingPatchHttp(response: unknown) {
  const calls: { path: string; body: unknown }[] = [];
  const http = {
    get: async () => undefined,
    getList: async () => ({ items: [], nextCursor: null }),
    post: async () => undefined,
    put: async () => undefined,
    patch: async (path: string, body: unknown) => {
      calls.push({ path, body });
      return response;
    },
    delete: async () => undefined,
  } as unknown as HttpClient;
  return { http, calls };
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

test('updatePhoto patches /students/{id} with photo_url and set_photo, and maps the response', async () => {
  const { http, calls } = recordingPatchHttp({
    id: 's1',
    name: 'Ravi Kumar',
    roll: 3,
    photo_url: 'https://cdn.example.com/students/a.png',
  });
  const repo = httpStudents(http);
  const student = await repo.updatePhoto('s1', 'https://cdn.example.com/students/a.png');
  expect(calls[0]).toEqual({
    path: '/students/s1',
    body: { photo_url: 'https://cdn.example.com/students/a.png', set_photo: true },
  });
  expect(student.photoUrl).toBe('https://cdn.example.com/students/a.png');
});

test('updatePhoto with null clears the photo', async () => {
  const { http, calls } = recordingPatchHttp({ id: 's1', name: 'Ravi Kumar', photo_url: null });
  const repo = httpStudents(http);
  await repo.updatePhoto('s1', null);
  expect(calls[0]).toEqual({ path: '/students/s1', body: { photo_url: null, set_photo: true } });
});
