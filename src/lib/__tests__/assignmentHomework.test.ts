import { homeworkCreateBodies } from '../assignmentHomework';
import type { Assignment } from '@/data/domain';

const assignment: Assignment = {
  id: 'asgn-1',
  title: 'Algebra Set',
  classId: 'class-1',
  className: 'IV-A',
  subject: 'Math',
  dueDate: '2026-08-01',
  submissionsCount: 0,
  totalStudents: 2,
  status: 'active',
};

test('homeworkCreateBodies fans out one homework row per student', () => {
  const bodies = homeworkCreateBodies(
    assignment,
    { title: 'Algebra Set', classId: 'class-1', dueDate: '2026-08-01' },
    ['stu-1', 'stu-2']
  );
  expect(bodies).toEqual([
    {
      student_id: 'stu-1',
      assignment_id: 'asgn-1',
      title: 'Algebra Set',
      due_date: '2026-08-01',
    },
    {
      student_id: 'stu-2',
      assignment_id: 'asgn-1',
      title: 'Algebra Set',
      due_date: '2026-08-01',
    },
  ]);
});
