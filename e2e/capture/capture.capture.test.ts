import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SEED } from '../support/config';
import { lastSchoolDay } from '../support/dates';
import { raw } from '../support/raw';
import { redact } from '../support/redact';
import { loginAs, type Actor } from '../support/session';
import { ROWS, type CaptureCtx } from './rows';

const OUT = join(__dirname, '..', '..', 'docs', 'superpowers', 'audits', 'sms-api-capture');

function firstId(body: unknown, pred: (row: Record<string, unknown>) => boolean): string | null {
  const data = (body as { data?: unknown })?.data;
  const list = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
  const hit = list.find(pred);
  return hit ? String(hit.id ?? hit.bus_id ?? '') || null : null;
}

async function buildCtx(teacherA: Actor, principal: Actor): Promise<CaptureCtx> {
  const date = lastSchoolDay();
  const classes = await raw(teacherA, 'GET', '/classes');
  const classAId = firstId(classes.body, (c) => c.name === SEED.classA);
  if (!classAId)
    throw new Error('seed class IX-A not visible to teacher A — seed missing or a CLS-01 finding');
  const students = await raw(teacherA, 'GET', `/classes/${classAId}/students`);
  const papers = await raw(teacherA, 'GET', '/exam-papers');
  const buses = await raw(principal, 'GET', '/transport/buses');
  const busRow = ((buses.body as { data?: Record<string, unknown>[] })?.data ?? []).find(
    (b) => b.bus_no === SEED.busNo
  );
  const overview = await raw(principal, 'GET', '/principal/overview');
  const staff = ((overview.body as { data?: { staff?: Record<string, unknown>[] } })?.data?.staff ??
    [])[0];
  const threads = await raw(teacherA, 'GET', '/threads');
  return {
    date,
    classAId,
    studentAId: firstId(students.body, () => true) ?? '',
    paperAId: firstId(papers.body, (p) => p.name === SEED.examPaperA) ?? '',
    busId: String(busRow?.id ?? busRow?.bus_id ?? ''),
    staffPersonId: String(staff?.teacher_id ?? staff?.person_id ?? staff?.id ?? ''),
    threadId: firstId(threads.body, () => true),
    routeId: busRow ? String(busRow.route_id ?? '') || null : null,
  };
}

test('capture every GET row as teacher A, teacher B and principal (redacted evidence for the parity matrix)', async () => {
  const actors: Record<string, Actor> = {
    teacherA: await loginAs(SEED.teacherA.email, SEED.teacherA.password),
    teacherB: await loginAs(SEED.teacherB.email, SEED.teacherB.password),
    principal: await loginAs(SEED.principal.email, SEED.principal.password),
  };
  const ctx = await buildCtx(actors.teacherA, actors.principal);
  const summary: { rowId: string; role: string; status: number; zod: string }[] = [];

  for (const [role, actor] of Object.entries(actors)) {
    mkdirSync(join(OUT, role), { recursive: true });
    for (const row of ROWS) {
      const path = row.path(ctx);
      const res = await raw(actor, 'GET', path);
      let zod = 'n/a';
      if (row.repo && res.status >= 200 && res.status < 300) {
        try {
          await row.repo(actor.repos, ctx);
          zod = 'ok';
        } catch (e) {
          zod = `error: ${(e as Error).message.slice(0, 500)}`;
        }
      }
      writeFileSync(
        join(OUT, role, `${row.id}.json`),
        JSON.stringify(
          redact({
            rowId: row.id,
            role,
            method: 'GET',
            path,
            status: res.status,
            zod,
            body: res.body,
          }),
          null,
          2
        )
      );
      summary.push({ rowId: row.id, role, status: res.status, zod });
    }
  }
  writeFileSync(join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));
  expect(summary).toHaveLength(ROWS.length * 3);
});
