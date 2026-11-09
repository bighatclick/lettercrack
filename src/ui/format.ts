/** 83_000 → "1:23"; 3_723_000 → "1:02:03". */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/** "2027-01-18" → "18 January 2027" (in the app language). Read in UTC so the day never shifts. */
export function formatLocalDate(date: string, language: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString(language, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}
