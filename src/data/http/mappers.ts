import type { Session, User, Tenant, Class } from '@/data/domain';

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
