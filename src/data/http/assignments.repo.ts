import type { AssignmentsRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toAssignment, type AssignmentDTO } from './mappers';

export function httpAssignments(http: HttpClient): AssignmentsRepository {
  return {
    list: () => http.get<AssignmentDTO[]>('/assignments').then((d) => d.map(toAssignment)),
  };
}
