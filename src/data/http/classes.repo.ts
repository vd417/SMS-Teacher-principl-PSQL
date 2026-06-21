import type { ClassesRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toClass, classSchema } from './mappers';

export function httpClasses(http: HttpClient): ClassesRepository {
  return {
    list: () =>
      http.get<unknown[]>('/classes').then((d) => d.map((x) => toClass(classSchema.parse(x)))),
    get: (id) => http.get(`/classes/${id}`).then((x) => toClass(classSchema.parse(x))),
  };
}
