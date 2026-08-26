// Local-time date helpers. We build YYYY-MM-DD from local components (not
// toISOString, which is UTC and drifts a day near midnight). Parsing splits the
// string and uses the Date(y, m, d) constructor so there is no UTC interpretation.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pad = (n: number) => String(n).padStart(2, '0');

export function todayISO(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatLongDate(iso: string): string {
  const d = parseISO(iso);
  return `${DAYS[d.getDay()]}, ${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Mon / Tue / … matching timetable `day` keys. */
export function weekdayShort(iso: string): string {
  return DAYS[parseISO(iso).getDay()];
}

export function addDays(iso: string, n: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return todayISO(d);
}

export function greeting(d: Date = new Date()): string {
  const h = d.getHours();
  if (h < 12) return 'Good morning,';
  if (h < 17) return 'Good afternoon,';
  return 'Good evening,';
}

/** Minutes east of UTC for the device timezone (e.g. IST → 330). */
export function deviceUtcOffsetMinutes(d: Date = new Date()): number {
  return -d.getTimezoneOffset();
}

/** Normalize API date or datetime strings to YYYY-MM-DD. */
export function toDateOnly(iso: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  return iso.slice(0, 10);
}

/**
 * Parse API instants for display. Naive UTC timestamps from .NET (no Z suffix)
 * are treated as UTC; ISO strings with offsets are parsed normally.
 */
export function parseApiInstant(iso: string): Date {
  const s = iso.trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s) && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(s)) {
    return new Date(`${s}Z`);
  }
  return new Date(s);
}

export function formatTimeOfDay(iso?: string): string {
  if (!iso) return '—';
  const d = parseApiInstant(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
