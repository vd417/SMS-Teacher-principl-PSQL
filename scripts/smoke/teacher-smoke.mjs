// Live smoke test for the Teacher App API. Replaces the deleted mock↔http
// contract tests with an end-to-end check against a running backend.
//
// Prereq: the backend is up and a teacher account exists. Local backend ports:
//   `dotnet run` (Sms.Api http profile) -> http://localhost:5162
//   `docker-compose up` in ../sms-backend -> http://localhost:5080
// The account's role must be backend-canonical (`school.teacher` / `school.principal`),
// not the teacher-app's unqualified `teacher`/`principal` — the API's `teacher.app`
// authz policy requires the `school.*` form or timetable/calendar/library/assignments 403.
//
// Configure via env:
//   API_BASE_URL    e.g. http://localhost:5162/v1   (must include /v1)
//   SMOKE_EMAIL + SMOKE_PASSWORD   password login, OR
//   SMOKE_TOKEN     a pre-obtained access token (skips login)
//
// Run: node scripts/smoke/teacher-smoke.mjs
//
// It logs in, then GETs every teacher endpoint and asserts the response is
// enveloped ({data}) with the expected shape. 403/404 (role/data-absent) count
// as SKIP, not failure. Exits non-zero if any endpoint fails.

const BASE = process.env.API_BASE_URL ?? 'http://localhost:5162/v1';

async function call(path, token) {
  const res = await fetch(`${BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* empty/non-json */
  }
  return { status: res.status, body };
}

async function login() {
  if (process.env.SMOKE_TOKEN) return process.env.SMOKE_TOKEN;
  const email = process.env.SMOKE_EMAIL;
  const password = process.env.SMOKE_PASSWORD;
  if (!email || !password) {
    console.error('Set SMOKE_TOKEN, or SMOKE_EMAIL + SMOKE_PASSWORD.');
    process.exit(2);
  }
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json().catch(() => null);
  const token = body?.data?.access_token;
  if (!token) {
    console.error('Login failed:', res.status, JSON.stringify(body));
    process.exit(2);
  }
  return token;
}

// path -> assertion on the parsed body. 'list' = body.data is an array;
// 'data' = body.data is present.
const CHECKS = [
  ['/auth/me', 'data'],
  ['/dashboard/stats', 'data'],
  ['/classes', 'list'],
  ['/timetable', 'list'],
  ['/calendar', 'list'],
  ['/library', 'list'],
  ['/assignments', 'list'],
  ['/announcements', 'list'],
  ['/threads', 'list'],
  ['/leave', 'list'],
  ['/payslips', 'list'],
  ['/exam-papers', 'list'],
  ['/me/attendance/today', 'data'],
  ['/me/attendance/history', 'list'],
  ['/me/attendance/summary', 'data'],
  ['/bus/assigned', 'data'],
  ['/principal/overview', 'data'],
  ['/transport/fleet', 'list'],
  ['/transport/buses', 'list'],
];

function verdict(kind, status, body) {
  if (status === 403 || status === 404) return 'SKIP';
  if (status !== 200) return 'FAIL';
  if (!body || typeof body !== 'object' || !('data' in body)) return 'FAIL';
  if (kind === 'list' && !Array.isArray(body.data)) return 'FAIL';
  return 'PASS';
}

async function main() {
  console.log(`Smoke testing ${BASE}`);
  const token = await login();
  let failed = 0;
  for (const [path, kind] of CHECKS) {
    const { status, body } = await call(path, token);
    const v = verdict(kind, status, body);
    if (v === 'FAIL') failed++;
    const tag = v === 'PASS' ? '✓' : v === 'SKIP' ? '∅' : '✗';
    console.log(`${tag} ${v.padEnd(4)} ${String(status).padStart(3)}  ${path}`);
  }
  console.log(failed === 0 ? '\nAll endpoints OK.' : `\n${failed} endpoint(s) FAILED.`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
