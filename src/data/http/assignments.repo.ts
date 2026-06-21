import type { AssignmentsRepository, NewAssignmentInput } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toAssignment, assignmentSchema } from './mappers';

export function httpAssignments(http: HttpClient): AssignmentsRepository {
  return {
    list: () =>
      http
        .get<unknown[]>('/assignments')
        .then((d) => d.map((x) => toAssignment(assignmentSchema.parse(x)))),
    create: (input: NewAssignmentInput) =>
      http
        .post('/assignments', {
          title: input.title,
          class_id: input.classId,
          due_date: input.dueDate,
          description: input.description,
          image_uri: input.imageUri,
        })
        .then((x) => toAssignment(assignmentSchema.parse(x))),
  };
}
