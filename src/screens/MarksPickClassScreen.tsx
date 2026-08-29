import React from 'react';
import { AttendancePickClassScreen } from './AttendancePickClassScreen';

/** Marks entry uses the shared class → section picker with flow=marks. */
export const MarksPickClassScreen: React.FC = () => (
  <AttendancePickClassScreen flowOverride="marks" />
);
