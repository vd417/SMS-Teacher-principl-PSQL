import { createHttpClient } from '@/lib/httpClient';
import { httpGrades } from '../grades.repo';

function mockFetch(handler: (url: string, init?: RequestInit) => unknown | Promise<unknown>) {
  return handler as unknown as typeof fetch;
}

test('GRD-02: upsert sends student_name, so dbo.grade_upsert never overwrites the stored name with NULL', async () => {
  const calls: { url: string; method?: string; body: unknown }[] = [];
  const http = createHttpClient({
    baseUrl: 'https://api.test/v1',
    getAuth: () => ({ accessToken: 't', tenantId: 'tenant-1' }),
    fetchImpl: mockFetch(async (url, init) => {
      const method = init?.method ?? 'GET';
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      calls.push({ url, method, body });
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          data: {
            student_id: '880e8400-e29b-41d4-a716-446655440003',
            student_name: 'Aarav Shah',
            exam_paper_id: 'paper-1',
            marks: 42,
            max_marks: 50,
            grade: 'A',
          },
        }),
      };
    }),
  });

  const saved = await httpGrades(http).upsert({
    studentId: '880e8400-e29b-41d4-a716-446655440003',
    studentName: 'Aarav Shah',
    examId: 'paper-1',
    marks: 42,
  });

  const put = calls.find((c) => c.method === 'PUT');
  expect(put?.body).toEqual({
    student_id: '880e8400-e29b-41d4-a716-446655440003',
    student_name: 'Aarav Shah',
    exam_paper_id: 'paper-1',
    marks: 42,
  });
  expect(saved.studentName).toBe('Aarav Shah');
});
