import type { Class, Exam } from '@/data/domain';
import { SEED } from './config';
import type { Actor } from './session';

export async function seedClass(actor: Actor, name: string): Promise<Class> {
  const c = (await actor.repos.classes.list()).find((x) => x.name === name);
  if (!c) throw new Error(`seed class ${name} not visible to ${actor.session.user.name}`);
  return c;
}

export async function seedPaper(actor: Actor): Promise<Exam> {
  const p = (await actor.repos.exams.list()).find((x) => x.title === SEED.examPaperA);
  if (!p) throw new Error(`seed paper ${SEED.examPaperA} not visible`);
  return p;
}

export const runId = `${Date.now().toString(36)}`;
