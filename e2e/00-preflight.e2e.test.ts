import { SEED } from './support/config';
import { loginAs } from './support/session';

test('the real HTTP layer logs in a seed teacher against sms-api', async () => {
  const a = await loginAs(SEED.teacherA.email, SEED.teacherA.password);
  expect(a.session.user.role).toBe('teacher');
  expect(a.session.tenant.name).toBe(SEED.mainSchool);
});
