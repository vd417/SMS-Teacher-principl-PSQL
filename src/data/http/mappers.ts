import type { Session, User, Tenant, Class, Student } from '@/data/domain';

export interface SessionDTO {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    name: string;
    initials: string;
    title: string;
    email: string;
    phone: string;
    employee: string;
    classroom: string;
    joined: string;
    role: 'teacher';
  };
  tenant: { id: string; name: string };
}

export const toUser = (d: SessionDTO['user']): User => ({ ...d });
export const toTenant = (d: SessionDTO['tenant']): Tenant => ({ ...d });
export const toSession = (d: SessionDTO): Session => ({
  accessToken: d.access_token,
  refreshToken: d.refresh_token,
  user: toUser(d.user),
  tenant: toTenant(d.tenant),
});

export interface ClassDTO {
  id: string;
  name: string;
  section: string;
  subject: string;
  student_count: number;
  room: string;
  next_period?: string;
}
export const toClass = (d: ClassDTO): Class => ({
  id: d.id,
  name: d.name,
  section: d.section,
  subject: d.subject,
  studentCount: d.student_count,
  room: d.room,
  nextPeriod: d.next_period,
});

export interface StudentDTO {
  id: string;
  name: string;
  roll: string;
  initials: string;
  class_id: string;
  attendance: number;
  grade: string;
  parent: string;
  parent_phone: string;
}
export const toStudent = (d: StudentDTO): Student => ({
  id: d.id,
  name: d.name,
  roll: d.roll,
  initials: d.initials,
  classId: d.class_id,
  attendance: d.attendance,
  grade: d.grade,
  parent: d.parent,
  parentPhone: d.parent_phone,
});
