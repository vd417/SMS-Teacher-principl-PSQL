import { toStudent, type StudentDTO } from '@/data/http/mappers';

describe('StudentDTO canonical contract', () => {
  const dto: StudentDTO = {
    id: 's1',
    admission_no: 'ADM-001',
    name: 'Maya Patel',
    initials: 'MP',
    gender: 'F',
    class_id: 'c1',
    grade: '6',
    section: 'A',
    class_label: '6-A',
    roll: '12',
    guardian_name: 'Priya Patel',
    guardian_phone: '9876543210',
    attendance_pct: 92,
    fee_status: 'paid',
    fee_due: 0,
    house: 'Blue',
    avatar_hue: 210,
    status: 'active',
  };

  it('declares the canonical snake_case keys', () => {
    expect(Object.keys(dto).sort()).toEqual([
      'admission_no',
      'attendance_pct',
      'avatar_hue',
      'class_id',
      'class_label',
      'fee_due',
      'fee_status',
      'gender',
      'grade',
      'guardian_name',
      'guardian_phone',
      'house',
      'id',
      'initials',
      'name',
      'roll',
      'section',
      'status',
    ]);
  });

  it('maps to the existing domain Student shape', () => {
    expect(toStudent(dto)).toEqual({
      id: 's1',
      name: 'Maya Patel',
      roll: '12',
      initials: 'MP',
      classId: 'c1',
      attendance: 92,
      grade: '6',
      parent: 'Priya Patel',
      parentPhone: '9876543210',
    });
  });
});
