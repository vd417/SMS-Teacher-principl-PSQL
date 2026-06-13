import {
  toStudent,
  type StudentDTO,
  toExam,
  toExamDTO,
  type ExamPaperDTO,
  toGrade,
  type GradeDTO,
} from '@/data/http/mappers';

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

describe('ExamPaperDTO canonical contract', () => {
  const dto: ExamPaperDTO = {
    id: 'p1',
    exam_id: 'e1',
    name: 'Mid-Term Algebra',
    class_id: 'c1',
    class_name: '6-A',
    subject: 'Math',
    date: '2026-06-15',
    start_time: '10:00 AM',
    duration_min: 60,
    max_marks: 50,
    room: 'R-101',
    invigilator1: 'T. Rao',
    invigilator2: 'S. Khan',
    topics: ['Algebra'],
    status: 'upcoming',
  };

  it('maps canonical paper fields to the domain Exam shape', () => {
    expect(toExam(dto)).toEqual({
      id: 'p1',
      title: 'Mid-Term Algebra',
      classId: 'c1',
      className: '6-A',
      subject: 'Math',
      date: '2026-06-15',
      time: '10:00 AM',
      duration: 60,
      maxMarks: 50,
      topics: ['Algebra'],
      status: 'upcoming',
    });
  });

  it('writes canonical snake_case keys from a domain patch', () => {
    expect(toExamDTO({ title: 'T', classId: 'c1', duration: 45, maxMarks: 20 })).toEqual({
      name: 'T',
      class_id: 'c1',
      duration_min: 45,
      max_marks: 20,
    });
  });
});

describe('GradeDTO canonical contract', () => {
  const dto: GradeDTO = {
    id: 'g1',
    student_id: 's1',
    student_name: 'Maya Patel',
    exam_paper_id: 'p1',
    marks: 42,
    max_marks: 50,
    grade: 'A',
    gpa: 3.7,
    pass: true,
    date: '2026-06-16',
  };

  it('maps exam_paper_id into the domain examId field', () => {
    expect(toGrade(dto)).toEqual({
      studentId: 's1',
      studentName: 'Maya Patel',
      examId: 'p1',
      marks: 42,
      maxMarks: 50,
      grade: 'A',
    });
  });
});
