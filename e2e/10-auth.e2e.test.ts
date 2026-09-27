import { SEED } from './support/config';
import { raw } from './support/raw';
import { actorFor, loginAs } from './support/session';

describe('auth against sms-api (matrix AUTH-*)', () => {
  test('login → /auth/me maps the teacher and the tenant', async () => {
    const a = await loginAs(SEED.teacherA.email, SEED.teacherA.password);
    expect(a.session.user).toMatchObject({
      name: SEED.teacherA.name,
      role: 'teacher',
      employee: SEED.teacherA.employee,
    });
    expect(a.session.tenant).toMatchObject({ name: SEED.mainSchool, tier: 'platinum' });
  });

  test('principal login maps role principal', async () => {
    const p = await loginAs(SEED.principal.email, SEED.principal.password);
    expect(p.session.user.role).toBe('principal');
    expect(p.session.user.title).toBe('Principal');
  });

  test('wrong password → invalid_credentials', async () => {
    await expect(loginAs(SEED.teacherA.email, 'wrong-password')).rejects.toMatchObject({
      code: 'invalid_credentials',
    });
  });

  test('refresh rotates and the old refresh token is rejected', async () => {
    const a = await loginAs(SEED.teacherA.email, SEED.teacherA.password);
    const next = await a.repos.auth.refresh(a.session.refreshToken);
    expect(next.refreshToken).not.toBe(a.session.refreshToken);
    const reuse = await raw(null, 'POST', '/auth/refresh', {
      body: { refresh_token: a.session.refreshToken },
    });
    expect(reuse.status).toBe(401);
  });

  test('logout revokes the refresh token', async () => {
    const a = await loginAs(SEED.teacherA.email, SEED.teacherA.password);
    await a.repos.auth.logout(a.session.refreshToken);
    const after = await raw(null, 'POST', '/auth/refresh', {
      body: { refresh_token: a.session.refreshToken },
    });
    expect(after.status).toBe(401);
  });

  test('multi-school user lists both schools and switch-school moves the tenant', async () => {
    const m = await loginAs(SEED.multi.email, SEED.multi.password);
    const schools = await m.repos.auth.listMySchools();
    expect(schools.map((s) => s.name).sort()).toEqual([SEED.otherSchool, SEED.mainSchool].sort());
    const other = schools.find((s) => s.name === SEED.otherSchool)!;
    const switched = actorFor(await m.repos.auth.switchSchool(other.id));
    expect(switched.session.tenant.name).toBe(SEED.otherSchool);
    expect((await switched.repos.classes.list()).map((c) => c.name)).toEqual(['IX-A']);
  });
});
