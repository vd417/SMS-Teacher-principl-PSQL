/** Shared class → section picker destinations used across features. */
export type ClassSectionFlow = 'attendance' | 'marks' | 'timetable';

export type ClassSectionPickClassParams = {
  flow?: ClassSectionFlow;
};

export type ClassSectionPickSectionParams = {
  gradeName: string;
  flow?: ClassSectionFlow;
};

export function resolveFlow(flow?: ClassSectionFlow): ClassSectionFlow {
  return flow ?? 'attendance';
}

export function classPickCopy(flow: ClassSectionFlow): { title: string; subtitle: string } {
  switch (flow) {
    case 'marks':
      return { title: 'Enter Marks', subtitle: 'Select a class, then a section' };
    case 'timetable':
      return { title: 'Timetable', subtitle: 'Select a class, then a section' };
    default:
      return { title: 'Mark Attendance', subtitle: 'Select a class, then a section' };
  }
}

export function sectionPickSubtitle(flow: ClassSectionFlow): string {
  return flow === 'timetable' ? 'Choose a section' : 'Choose a section';
}
