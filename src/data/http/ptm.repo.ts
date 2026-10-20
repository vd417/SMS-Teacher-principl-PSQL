import type { PtmRepository, NewPtmInput } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { isAppError } from '@/lib/errors';
import { toPtmMeeting, fromNewPtm, ptmMeetingSchema } from './mappers';

export function httpPtm(http: HttpClient): PtmRepository {
  return {
    list: () =>
      http
        .get<unknown[]>('/ptm')
        .then((d) => d.map((x) => toPtmMeeting(ptmMeetingSchema.parse(x)))),

    create: (input: NewPtmInput) =>
      http.post('/ptm', fromNewPtm(input)).then((x) => toPtmMeeting(ptmMeetingSchema.parse(x))),

    remove: async (id, cancel) => {
      if (!cancel) {
        await http.delete(`/ptm/${id}`);
        return;
      }
      const reason = cancel.reason.trim();
      const notice = `Meeting cancelled. ${reason}`;
      const query = new URLSearchParams({
        reason,
        notify: 'true',
        notify_parent: 'true',
        notify_teacher: 'true',
        notify_crm: 'true',
        ...(cancel.allTeachers ? { all_teachers: 'true' } : {}),
      });
      const path = `/ptm/${id}?${query.toString()}`;
      const body = {
        reason,
        notify: true,
        notify_parent: true,
        notify_teacher: true,
        notify_crm: true,
        notice,
        ...(cancel.allTeachers
          ? { all_teachers: true }
          : cancel.teacherIds?.length
            ? { teacher_ids: cancel.teacherIds }
            : {}),
      };
      try {
        await http.delete(path, body);
      } catch (error) {
        // Some servers reject a DELETE body. The reason still goes in the query
        // so the parent notice is not dropped.
        if (
          isAppError(error) &&
          (error.status === 401 || error.status === 403 || error.status === 404)
        ) {
          throw error;
        }
        await http.delete(path);
      }
    },
  };
}
