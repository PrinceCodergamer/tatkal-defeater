/**
 * Format a journey date (YYYY-MM-DD) in LOCAL time.
 * Parsing `new Date('2026-08-01')` treats it as UTC midnight, which then
 * rolls back a day in IST (+5:30) — the off-by-one the browser test caught.
 * Splitting the parts avoids the TZ shift entirely.
 */
export function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function formatJourneyDate(iso: string, opts?: Intl.DateTimeFormatOptions): string {
  if (!iso) return '';
  try {
    return parseLocalDate(iso).toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      ...opts,
    });
  } catch {
    return iso;
  }
}
