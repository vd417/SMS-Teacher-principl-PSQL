import type {
  ClassesRepository,
  StudentsRepository,
  TimetableRepository,
  AssignmentsRepository,
  AnnouncementsRepository,
  CalendarRepository,
  LibraryRepository,
  PayrollRepository,
  DashboardRepository,
} from '@/data/repositories/types';

export function classesContract(name: string, make: () => Promise<ClassesRepository>) {
  describe(`ClassesRepository contract [${name}]`, () => {
    it('list returns an array of classes with required fields', async () => {
      const repo = await make();
      const list = await repo.list();
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThan(0);
      for (const c of list) {
        expect(typeof c.id).toBe('string');
        expect(typeof c.studentCount).toBe('number');
        expect(c).not.toHaveProperty('color');
      }
    });
    it('get returns the requested class', async () => {
      const repo = await make();
      const first = (await repo.list())[0];
      expect((await repo.get(first.id)).id).toBe(first.id);
    });
  });
}

export function studentsContract(
  name: string,
  classId: string,
  make: () => Promise<StudentsRepository>
) {
  describe(`StudentsRepository contract [${name}]`, () => {
    it('listByClass returns an array of students with required fields', async () => {
      const repo = await make();
      const list = await repo.listByClass(classId);
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThan(0);
      for (const s of list) {
        expect(typeof s.id).toBe('string');
        expect(typeof s.name).toBe('string');
        expect(typeof s.classId).toBe('string');
        expect(s).not.toHaveProperty('avatarColor');
      }
    });
    it('get returns the requested student', async () => {
      const repo = await make();
      const first = (await repo.listByClass(classId))[0];
      expect((await repo.get(first.id)).id).toBe(first.id);
    });
  });
}

export function timetableContract(name: string, make: () => Promise<TimetableRepository>) {
  describe(`TimetableRepository contract [${name}]`, () => {
    it('list returns an array of slots with required fields', async () => {
      const repo = await make();
      const list = await repo.list();
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThan(0);
      for (const s of list) {
        expect(typeof s.id).toBe('string');
        expect(typeof s.day).toBe('string');
        expect(typeof s.classId).toBe('string');
        expect(typeof s.startTime).toBe('string');
        expect(typeof s.endTime).toBe('string');
        expect(s).not.toHaveProperty('color');
      }
    });
  });
}

export function assignmentsContract(name: string, make: () => Promise<AssignmentsRepository>) {
  describe(`AssignmentsRepository contract [${name}]`, () => {
    it('list returns an array of assignments with required fields', async () => {
      const repo = await make();
      const list = await repo.list();
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThan(0);
      for (const a of list) {
        expect(typeof a.id).toBe('string');
        expect(typeof a.title).toBe('string');
        expect(typeof a.dueDate).toBe('string');
        expect(typeof a.submissionsCount).toBe('number');
        expect(typeof a.totalStudents).toBe('number');
        expect(a).not.toHaveProperty('color');
      }
    });
  });
}

export function announcementsContract(name: string, make: () => Promise<AnnouncementsRepository>) {
  describe(`AnnouncementsRepository contract [${name}]`, () => {
    it('list returns an array of announcements with required fields', async () => {
      const repo = await make();
      const list = await repo.list();
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThan(0);
      for (const a of list) {
        expect(typeof a.id).toBe('string');
        expect(typeof a.title).toBe('string');
        expect(typeof a.body).toBe('string');
        expect(typeof a.type).toBe('string');
        expect(a).not.toHaveProperty('color');
      }
    });
  });
}

export function calendarContract(name: string, make: () => Promise<CalendarRepository>) {
  describe(`CalendarRepository contract [${name}]`, () => {
    it('list returns an array of events with required fields', async () => {
      const repo = await make();
      const list = await repo.list();
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThan(0);
      for (const e of list) {
        expect(typeof e.id).toBe('string');
        expect(typeof e.title).toBe('string');
        expect(typeof e.date).toBe('string');
        expect(typeof e.type).toBe('string');
        expect(e).not.toHaveProperty('color');
      }
    });
  });
}

export function libraryContract(name: string, make: () => Promise<LibraryRepository>) {
  describe(`LibraryRepository contract [${name}]`, () => {
    it('list returns an array of books with required fields', async () => {
      const repo = await make();
      const list = await repo.list();
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThan(0);
      for (const b of list) {
        expect(typeof b.id).toBe('string');
        expect(typeof b.title).toBe('string');
        expect(typeof b.author).toBe('string');
        expect(typeof b.status).toBe('string');
        expect(b).not.toHaveProperty('color');
      }
    });
  });
}

export function payrollContract(name: string, make: () => Promise<PayrollRepository>) {
  describe(`PayrollRepository contract [${name}]`, () => {
    it('list returns an array of payslips with required fields', async () => {
      const repo = await make();
      const list = await repo.list();
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThan(0);
      for (const p of list) {
        expect(typeof p.id).toBe('string');
        expect(typeof p.month).toBe('string');
        expect(typeof p.year).toBe('number');
        expect(typeof p.net).toBe('number');
        expect(typeof p.status).toBe('string');
      }
    });
  });
}

export function dashboardContract(name: string, make: () => Promise<DashboardRepository>) {
  describe(`DashboardRepository contract [${name}]`, () => {
    it('stats returns required fields with correct types', async () => {
      const repo = await make();
      const stats = await repo.stats();
      expect(typeof stats.totalStudents).toBe('number');
      expect(typeof stats.totalClasses).toBe('number');
      expect(typeof stats.attendanceToday).toBe('number');
      expect(typeof stats.pendingAssignments).toBe('number');
      expect(typeof stats.upcomingExams).toBe('number');
    });
  });
}
