import type { ClassesRepository } from '@/data/repositories/types';

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
