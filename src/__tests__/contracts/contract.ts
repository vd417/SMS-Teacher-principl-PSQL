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
  ExamsRepository,
  GradesRepository,
  AttendanceRepository,
  ChatRepository,
  LeaveRepository,
  BusRepository,
  MyAttendanceRepository,
  ApprovalsRepository,
  PrincipalRepository,
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

    it('create returns an announcement echoing the input title and type', async () => {
      const repo = await make();
      const input = { title: 'Contract Notice', body: 'Body text', type: 'info' as const };
      const created = await repo.create(input);
      expect(typeof created.id).toBe('string');
      expect(created.title).toBe(input.title);
      expect(created.type).toBe(input.type);
      expect(typeof created.from).toBe('string');
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

export function examsContract(name: string, make: () => Promise<ExamsRepository>) {
  describe(`ExamsRepository contract [${name}]`, () => {
    it('list returns an array of exams with required fields', async () => {
      const repo = await make();
      const list = await repo.list();
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThan(0);
      for (const e of list) {
        expect(typeof e.id).toBe('string');
        expect(typeof e.title).toBe('string');
        expect(typeof e.classId).toBe('string');
        expect(typeof e.className).toBe('string');
        expect(typeof e.subject).toBe('string');
        expect(typeof e.maxMarks).toBe('number');
        expect(typeof e.status).toBe('string');
        expect(e).not.toHaveProperty('color');
        expect(e).not.toHaveProperty('colorSoft');
      }
    });

    it('get returns the requested exam', async () => {
      const repo = await make();
      const first = (await repo.list())[0];
      const found = await repo.get(first.id);
      expect(found.id).toBe(first.id);
    });

    it('create returns an exam with a string id echoing input title and maxMarks', async () => {
      const repo = await make();
      const input = {
        title: 'Contract Test Exam',
        classId: 'c1',
        date: '2026-06-15',
        time: '10:00 AM',
        duration: 60,
        maxMarks: 50,
        topics: ['Algebra'],
        status: 'upcoming' as const,
      };
      const created = await repo.create(input);
      expect(typeof created.id).toBe('string');
      expect(created.title).toBe(input.title);
      expect(created.maxMarks).toBe(input.maxMarks);
      expect(created.classId).toBe(input.classId);
    });
  });
}

export function attendanceContract(
  name: string,
  classId: string,
  date: string,
  make: () => Promise<AttendanceRepository>
) {
  describe(`AttendanceRepository contract [${name}]`, () => {
    it('forClass returns records with required fields (existing or default)', async () => {
      const repo = await make();
      const records = await repo.forClass(classId, date);
      expect(Array.isArray(records)).toBe(true);
      expect(records.length).toBeGreaterThan(0);
      for (const r of records) {
        expect(typeof r.studentId).toBe('string');
        expect(typeof r.status).toBe('string');
        expect(typeof r.date).toBe('string');
      }
    });

    it('save then forClass reflects the new records', async () => {
      const repo = await make();
      // First get the existing records to know studentIds
      const existing = await repo.forClass(classId, date);
      const updated = existing.map((r) => ({ ...r, status: 'A' as const }));
      await repo.save(classId, date, updated);
      const after = await repo.forClass(classId, date);
      for (const r of after) {
        expect(r.status).toBe('A');
      }
    });
  });
}

export function chatContract(name: string, make: () => Promise<ChatRepository>) {
  describe(`ChatRepository contract [${name}]`, () => {
    it('contacts returns an array of chat contacts with required fields', async () => {
      const repo = await make();
      const contacts = await repo.contacts();
      expect(Array.isArray(contacts)).toBe(true);
      expect(contacts.length).toBeGreaterThan(0);
      for (const c of contacts) {
        expect(typeof c.id).toBe('string');
        expect(typeof c.name).toBe('string');
        expect(typeof c.role).toBe('string');
        expect(typeof c.lastMessage).toBe('string');
        expect(typeof c.unread).toBe('number');
        expect(typeof c.online).toBe('boolean');
        expect(c).not.toHaveProperty('avatarColor');
      }
    });

    it('messages returns an array for a known contactId', async () => {
      const repo = await make();
      const messages = await repo.messages('ch1');
      expect(Array.isArray(messages)).toBe(true);
      expect(messages.length).toBeGreaterThan(0);
      for (const m of messages) {
        expect(typeof m.id).toBe('string');
        expect(typeof m.senderId).toBe('string');
        expect(typeof m.text).toBe('string');
        expect(typeof m.isMe).toBe('boolean');
      }
    });

    it('send returns a message with isMe:true and a string id', async () => {
      const repo = await make();
      const sent = await repo.send('ch1', 'Hello contract test');
      expect(typeof sent.id).toBe('string');
      expect(sent.isMe).toBe(true);
      expect(sent.text).toBe('Hello contract test');
    });
  });
}

export function leaveContract(name: string, make: () => Promise<LeaveRepository>) {
  describe(`LeaveRepository contract [${name}]`, () => {
    it('list returns an array of leave requests with required fields', async () => {
      const repo = await make();
      const list = await repo.list();
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThan(0);
      for (const req of list) {
        expect(typeof req.id).toBe('string');
        expect(typeof req.type).toBe('string');
        expect(typeof req.from).toBe('string');
        expect(typeof req.to).toBe('string');
        expect(typeof req.reason).toBe('string');
        expect(typeof req.status).toBe('string');
        expect(typeof req.appliedOn).toBe('string');
      }
    });

    it('create returns a leave request with status pending and a string id', async () => {
      const repo = await make();
      const input = {
        type: 'casual' as const,
        from: '2026-07-01',
        to: '2026-07-02',
        reason: 'Contract test leave',
      };
      const created = await repo.create(input);
      expect(typeof created.id).toBe('string');
      expect(created.status).toBe('pending');
      expect(created.type).toBe(input.type);
      expect(created.from).toBe(input.from);
      expect(created.to).toBe(input.to);
      expect(created.reason).toBe(input.reason);
    });
  });
}

export function gradesContract(
  name: string,
  examId: string,
  make: () => Promise<GradesRepository>
) {
  describe(`GradesRepository contract [${name}]`, () => {
    it('listByExam returns an array of grade entries with required fields', async () => {
      const repo = await make();
      const list = await repo.listByExam(examId);
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThan(0);
      for (const g of list) {
        expect(typeof g.studentId).toBe('string');
        expect(typeof g.studentName).toBe('string');
        expect(typeof g.examId).toBe('string');
        expect(typeof g.marks).toBe('number');
        expect(typeof g.maxMarks).toBe('number');
        expect(typeof g.grade).toBe('string');
        expect(g).not.toHaveProperty('color');
      }
    });

    it('upsert returns an entry with the right studentId/examId/marks', async () => {
      const repo = await make();
      const input = { studentId: 's1', examId, marks: 75 };
      const entry = await repo.upsert(input);
      expect(entry.studentId).toBe(input.studentId);
      expect(entry.examId).toBe(input.examId);
      expect(entry.marks).toBe(input.marks);
      expect(typeof entry.grade).toBe('string');
    });
  });
}

export function busContract(name: string, make: () => Promise<BusRepository>) {
  describe(`BusRepository contract [${name}]`, () => {
    it('assignedBus returns a bus with stops', async () => {
      const repo = await make();
      const bus = await repo.assignedBus();
      expect(typeof bus.id).toBe('string');
      expect(typeof bus.number).toBe('string');
      expect(Array.isArray(bus.stops)).toBe(true);
      expect(bus.stops.length).toBeGreaterThan(0);
      for (const s of bus.stops) {
        expect(typeof s.id).toBe('string');
        expect(typeof s.lat).toBe('number');
        expect(typeof s.lng).toBe('number');
      }
    });

    it('position returns numeric coordinates and progress', async () => {
      const repo = await make();
      const bus = await repo.assignedBus();
      const pos = await repo.position(bus.id);
      expect(typeof pos.lat).toBe('number');
      expect(typeof pos.lng).toBe('number');
      expect(typeof pos.progress).toBe('number');
      expect(typeof pos.nextStopName).toBe('string');
    });

    it('roster returns boarding records with required fields', async () => {
      const repo = await make();
      const bus = await repo.assignedBus();
      const roster = await repo.roster(bus.id);
      expect(Array.isArray(roster)).toBe(true);
      expect(roster.length).toBeGreaterThan(0);
      for (const r of roster) {
        expect(typeof r.studentId).toBe('string');
        expect(typeof r.studentName).toBe('string');
        expect(typeof r.status).toBe('string');
      }
    });

    it('saveBoarding then roster reflects the new statuses', async () => {
      const repo = await make();
      const bus = await repo.assignedBus();
      const roster = await repo.roster(bus.id);
      const updated = roster.map((r) => ({ ...r, status: 'boarded' as const }));
      await repo.saveBoarding(bus.id, updated);
      const after = await repo.roster(bus.id);
      for (const r of after) expect(r.status).toBe('boarded');
    });
  });
}

export function approvalsContract(name: string, make: () => Promise<ApprovalsRepository>) {
  describe(`ApprovalsRepository contract [${name}]`, () => {
    it('list returns an array of approval requests with required fields', async () => {
      const repo = await make();
      const list = await repo.list();
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThan(0);
      for (const r of list) {
        expect(typeof r.id).toBe('string');
        expect(typeof r.type).toBe('string');
        expect(typeof r.requesterName).toBe('string');
        expect(typeof r.title).toBe('string');
        expect(typeof r.status).toBe('string');
        expect(typeof r.appliedOn).toBe('string');
      }
    });

    it('decide approves a request and echoes the new status + note', async () => {
      const repo = await make();
      const first = (await repo.list())[0];
      const decided = await repo.decide(first.id, 'approved', 'Looks fine');
      expect(decided.id).toBe(first.id);
      expect(decided.status).toBe('approved');
      expect(decided.decidedNote).toBe('Looks fine');
    });
  });
}

export function myAttendanceContract(name: string, make: () => Promise<MyAttendanceRepository>) {
  describe(`MyAttendanceRepository contract [${name}]`, () => {
    it('schoolLocation returns coordinates and a radius', async () => {
      const repo = await make();
      const loc = await repo.schoolLocation();
      expect(typeof loc.lat).toBe('number');
      expect(typeof loc.lng).toBe('number');
      expect(typeof loc.radiusMeters).toBe('number');
      expect(typeof loc.name).toBe('string');
    });

    it('today returns a day object with a YYYY-MM-DD date', async () => {
      const repo = await make();
      const day = await repo.today();
      expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('history returns an array no longer than the limit, newest first', async () => {
      const repo = await make();
      const list = await repo.history(5);
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeLessThanOrEqual(5);
      for (const d of list) expect(typeof d.date).toBe('string');
      // newest-first ordering
      for (let i = 1; i < list.length; i++) {
        expect(list[i - 1].date >= list[i].date).toBe(true);
      }
    });

    it('summary returns numeric fields', async () => {
      const repo = await make();
      const s = await repo.summary('2026-05');
      expect(typeof s.daysPresent).toBe('number');
      expect(typeof s.daysFlagged).toBe('number');
      expect(typeof s.totalHours).toBe('number');
    });

    it('punch in then today reflects the check-in', async () => {
      const repo = await make();
      const now = new Date().toISOString();
      const ev = {
        kind: 'in' as const,
        at: now,
        lat: 40.0,
        lng: -75.0,
        accuracyMeters: 5,
        distanceMeters: 3,
        verified: true,
      };
      const day = await repo.punch(ev);
      expect(day.checkIn?.kind).toBe('in');
      const today = await repo.today();
      expect(today.checkIn?.at).toBe(now);
    });

    it('punch out then today reflects the check-out', async () => {
      const repo = await make();
      const now = new Date().toISOString();
      const ev = {
        kind: 'out' as const,
        at: now,
        lat: 40.0,
        lng: -75.0,
        accuracyMeters: 5,
        distanceMeters: 3,
        verified: true,
      };
      const day = await repo.punch(ev);
      expect(day.checkOut?.kind).toBe('out');
      const today = await repo.today();
      expect(today.checkOut?.at).toBe(now);
    });
  });
}

export function principalContract(name: string, make: () => Promise<PrincipalRepository>) {
  describe(`PrincipalRepository contract [${name}]`, () => {
    it('overview returns kpis and a staff array', async () => {
      const repo = await make();
      const o = await repo.overview();
      expect(typeof o.kpis.studentsPresentPct).toBe('number');
      expect(typeof o.kpis.staffPresent).toBe('number');
      expect(typeof o.kpis.staffTotal).toBe('number');
      expect(typeof o.kpis.pendingApprovals).toBe('number');
      expect(Array.isArray(o.staff)).toBe(true);
      expect(o.staff.length).toBeGreaterThan(0);
      for (const s of o.staff) {
        expect(typeof s.teacherId).toBe('string');
        expect(typeof s.checkedIn).toBe('boolean');
      }
    });

    it('attendance returns school totals, per-class summaries, and staff', async () => {
      const repo = await make();
      const a = await repo.attendance();
      expect(a.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(typeof a.overallPct).toBe('number');
      expect(typeof a.presentTotal).toBe('number');
      expect(typeof a.studentTotal).toBe('number');
      expect(Array.isArray(a.classes)).toBe(true);
      expect(a.classes.length).toBeGreaterThan(0);
      for (const c of a.classes) {
        expect(typeof c.classId).toBe('string');
        expect(typeof c.className).toBe('string');
        expect(typeof c.present).toBe('number');
        expect(typeof c.total).toBe('number');
      }
      expect(Array.isArray(a.staff)).toBe(true);
    });
  });
}
