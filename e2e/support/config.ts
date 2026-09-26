export function apiBaseUrl(): string {
  const url = process.env.E2E_API_BASE_URL;
  if (!url) throw new Error('E2E_API_BASE_URL is required, e.g. http://localhost:5162/v1');
  if (!/\/v\d+\/?$/.test(url)) throw new Error('E2E_API_BASE_URL must end with /v1');
  return url.replace(/\/$/, '');
}

/** Mirrors sms-api tools/Sms.DevSeed (SeedData.cs + README). Dev fixtures, not secrets. */
export const SEED = {
  principal: {
    email: 'principal@seed.schooldesk.test',
    password: 'DevSeed-Principal-2026!',
    name: 'Priya Deshmukh',
  },
  teacherA: {
    email: 'teacher.a@seed.schooldesk.test',
    password: 'DevSeed-Teacher-2026!',
    name: 'Asha Kulkarni',
    employee: 'DS-T001',
  },
  teacherB: {
    email: 'teacher.b@seed.schooldesk.test',
    password: 'DevSeed-Teacher-2026!',
    name: 'Bharat Menon',
    employee: 'DS-T002',
  },
  multi: { email: 'multi@seed.schooldesk.test', password: 'DevSeed-Teacher-2026!' },
  otherTeacher: { email: 'other.teacher@seed.schooldesk.test', password: 'DevSeed-Teacher-2026!' },
  mainSchool: 'SchoolDesk Dev Seed',
  otherSchool: 'Dev Seed Other School',
  classA: 'IX-A',
  classB: 'IX-B',
  studentsPerClass: 10,
  otherSchoolStudentNames: ['Other Student One', 'Other Student Two', 'Other Student Three'],
  examPaperA: 'IX-A Mathematics',
  announcementTitle: 'Dev Seed Welcome',
  pendingLeaveReason: 'Dev seed pending leave',
  busNo: 'DS-01',
  busRiders: 5,
  geo: { lat: 18.5204, lng: 73.8567, radiusMeters: 200 },
} as const;
