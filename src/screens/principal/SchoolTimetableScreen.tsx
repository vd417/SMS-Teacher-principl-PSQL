import React from 'react';
import { AttendancePickClassScreen } from '../AttendancePickClassScreen';

/** Principal timetable tab — same grade-card class picker as attendance. */
export const SchoolTimetableScreen: React.FC = () => (
  <AttendancePickClassScreen flowOverride="timetable" />
);
