import type { AssignmentsRepository, NewAssignmentInput } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toAssignment, type AssignmentDTO } from './mappers';

export function httpAssignments(http: HttpClient): AssignmentsRepository {
  return {
    list: () => http.get<AssignmentDTO[]>('/assignments').then((d) => d.map(toAssignment)),
    create: (input: NewAssignmentInput) =>
      http
        .post<AssignmentDTO>('/assignments', {
          title: input.title,
          class_id: input.classId,
          due_date: input.dueDate,
          description: input.description,
          image_uri: input.imageUri,
        })
        .then(toAssignment),
  };
}
