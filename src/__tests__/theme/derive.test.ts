import { deriveColorSet } from '@/theme/derive';

describe('deriveColorSet', () => {
  it('is deterministic for the same id', () => {
    expect(deriveColorSet('c1')).toEqual(deriveColorSet('c1'));
  });
  it('returns color, colorSoft, colorTint strings', () => {
    const set = deriveColorSet('c1');
    expect(typeof set.color).toBe('string');
    expect(typeof set.colorSoft).toBe('string');
    expect(typeof set.colorTint).toBe('string');
  });
});
