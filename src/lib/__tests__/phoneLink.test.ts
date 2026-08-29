import { normalizePhone } from '../phoneLink';

describe('normalizePhone', () => {
  it('strips spaces and dashes', () => {
    expect(normalizePhone('73881 19922')).toBe('7388119922');
    expect(normalizePhone('73881-19922')).toBe('7388119922');
  });

  it('keeps leading country code plus', () => {
    expect(normalizePhone('+91 73881 19922')).toBe('+917388119922');
  });

  it('returns empty for blank input', () => {
    expect(normalizePhone('   ')).toBe('');
  });
});
