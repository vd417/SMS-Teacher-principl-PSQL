import type { StaffRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { staffDirectorySchema, toStaffDirectoryMember } from './mappers';

export function httpStaff(http: HttpClient): StaffRepository {
  return {
    list: () =>
      http.getList<unknown>('/staff').then((page) =>
        page.items
          .map((x) => staffDirectorySchema.parse(x))
          .filter((row) => !row.status || row.status === 'active')
          .map((row) => toStaffDirectoryMember(row))
          .sort((a, b) => a.name.localeCompare(b.name))
      ),
  };
}
