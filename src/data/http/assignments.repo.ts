import type { AssignmentsRepository, NewAssignmentInput } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import type { Page } from '@/lib/envelope';
import { homeworkCreateBodies } from '@/lib/assignmentHomework';
import { toAssignment, assignmentSchema, studentSchema } from './mappers';
import type { Assignment } from '@/data/domain';

async function listStudentIds(http: HttpClient, classId: string): Promise<string[]> {
  const ids: string[] = [];
  let cursor: string | null = null;
  do {
    const page: Page<unknown> = await http.getList<unknown>(`/classes/${classId}/students`, {
      params: { limit: 200, cursor: cursor ?? undefined },
    });
    for (const row of page.items) {
      ids.push(studentSchema.parse(row).id);
    }
    cursor = page.nextCursor;
  } while (cursor);
  return ids;
}

async function fanOutStudentHomework(
  http: HttpClient,
  assignment: Assignment,
  input: NewAssignmentInput
): Promise<void> {
  if (!input.classId) return;
  const studentIds = await listStudentIds(http, input.classId);
  const bodies = homeworkCreateBodies(assignment, input, studentIds);
  await Promise.all(bodies.map((body) => http.post('/homework', body)));
}

function assignmentBody(input: NewAssignmentInput) {
  return {
    title: input.title,
    class_id: input.classId,
    class_name: input.className,
    subject: input.subject,
    period: input.period ?? null,
    due_date: input.dueDate,
    description: input.description,
    image_uri: input.imageUri,
  };
}

export function httpAssignments(http: HttpClient): AssignmentsRepository {
  return {
    list: () =>
      http
        .get<unknown[]>('/assignments')
        .then((d) => d.map((x) => toAssignment(assignmentSchema.parse(x)))),
    create: async (input: NewAssignmentInput) => {
      const raw = await http.post('/assignments', assignmentBody(input));
      const assignment = toAssignment(assignmentSchema.parse(raw));
      await fanOutStudentHomework(http, assignment, input);
      return assignment;
    },
    update: async (id, input) => {
      const raw = await http.patch(`/assignments/${id}`, assignmentBody(input));
      return toAssignment(assignmentSchema.parse(raw));
    },
  };
}
