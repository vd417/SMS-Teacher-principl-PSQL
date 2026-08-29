import type { Assignment } from '@/data/domain';
import type { NewAssignmentInput } from '@/data/repositories/types';

/** One POST /homework body per student when fanning out a class assignment. */
export function homeworkCreateBodies(
  assignment: Assignment,
  input: NewAssignmentInput,
  studentIds: string[]
): {
  student_id: string;
  assignment_id: string;
  title: string;
  due_date: string;
}[] {
  return studentIds.map((studentId) => ({
    student_id: studentId,
    assignment_id: assignment.id,
    title: input.title,
    due_date: input.dueDate,
  }));
}
