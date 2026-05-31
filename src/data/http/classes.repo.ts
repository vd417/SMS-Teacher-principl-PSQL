import type { ClassesRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toClass, type ClassDTO } from './mappers';

export function httpClasses(http: HttpClient): ClassesRepository {
  return {
    list: () => http.get<ClassDTO[]>('/classes').then((d) => d.map(toClass)),
    get: (id) => http.get<ClassDTO>(`/classes/${id}`).then(toClass),
  };
}
