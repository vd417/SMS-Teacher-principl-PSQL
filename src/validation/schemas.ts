import { z } from 'zod';

export const examSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  classId: z.string().min(1, 'Please select a class'),
  subject: z.string().min(1, 'Please select a subject'),
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required'),
  duration: z.number().min(5, 'Min 5 minutes').max(300, 'Max 300 minutes'),
  maxMarks: z.number().min(1, 'Min 1 mark').max(1000, 'Max 1000 marks'),
  topics: z.array(z.string()),
});

export const assignmentSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  classId: z.string().min(1, 'Please select a class'),
  subject: z.string().min(1, 'Please select a subject'),
  period: z.number().nullable().optional(),
  dueDate: z.string().min(1, 'Due date is required'),
  description: z.string().optional(),
  imageUri: z.string().optional(),
});

export const leaveSchema = z.object({
  type: z.enum(['casual', 'sick', 'emergency', 'other']),
  from: z.string().min(1, 'Start date is required'),
  to: z.string().min(1, 'End date is required'),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
  substitute: z.string().optional(),
});

export const ptmSchema = z.object({
  classId: z.string().min(1, 'Please select a class'),
  studentId: z.string().min(1, 'Please select a student'),
  subject: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required'),
  mode: z.string().min(1, 'Please select a mode'),
});

export const chatMessageSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(500, 'Message too long'),
});

export type ExamSchemaType = z.infer<typeof examSchema>;
export type AssignmentSchemaType = z.infer<typeof assignmentSchema>;
export type LeaveSchemaType = z.infer<typeof leaveSchema>;
export type ChatMessageSchemaType = z.infer<typeof chatMessageSchema>;
export type PtmSchemaType = z.infer<typeof ptmSchema>;
