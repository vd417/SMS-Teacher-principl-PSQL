import {
  deriveColorSet,
  deriveGradeColorSet,
  deriveSubjectColorSet,
  classCardColorSet,
  attendancePctColor,
} from '@/theme/derive';
import { Colors } from '@/theme/colors';

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

describe('classCardColorSet', () => {
  it('matches deriveColorSet for the same class id', () => {
    expect(classCardColorSet('class-9a')).toEqual(deriveColorSet('class-9a'));
  });
});

describe('deriveGradeColorSet', () => {
  it('matches deriveColorSet for the same grade name', () => {
    expect(deriveGradeColorSet('IV')).toEqual(deriveColorSet('IV'));
  });
});

describe('deriveSubjectColorSet', () => {
  it('matches deriveColorSet for the same subject name', () => {
    expect(deriveSubjectColorSet('Mathematics')).toEqual(deriveColorSet('Mathematics'));
  });
  it('is stable for empty subject names', () => {
    expect(deriveSubjectColorSet('')).toEqual(deriveSubjectColorSet('  '));
  });
});

describe('attendancePctColor', () => {
  it('returns muted when there are no students', () => {
    expect(attendancePctColor(null, false)).toBe(Colors.inkMuted);
  });
  it('returns green for high attendance', () => {
    expect(attendancePctColor(85, true)).toBe(Colors.present);
  });
  it('returns amber for medium attendance', () => {
    expect(attendancePctColor(60, true)).toBe(Colors.late);
  });
  it('returns red for low attendance', () => {
    expect(attendancePctColor(30, true)).toBe(Colors.absent);
  });
});
