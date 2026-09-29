/** Latest Mon–Fri on or before `now` (local), as YYYY-MM-DD. The seed timetable is Mon–Fri only (WeekDay). */
export function lastSchoolDay(now: Date = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
