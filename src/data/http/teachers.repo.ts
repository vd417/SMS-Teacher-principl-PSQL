import type { TeachersRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { teacherDirectorySchema, toSchoolStaffMember } from './mappers';

export function httpTeachers(http: HttpClient): TeachersRepository {
  return {
    list: () =>
      http
        .getList<unknown>('/teachers', { params: { status: 'active' } })
        .then((page) =>
          page.items
            .map((x) => toSchoolStaffMember(teacherDirectorySchema.parse(x)))
            .sort((a, b) => a.name.localeCompare(b.name))
        ),
  };
}
