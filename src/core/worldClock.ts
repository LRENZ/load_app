export interface ClockCity {
  key: 'taipei' | 'london' | 'new_york' | 'tokyo';
  zone: string;
}

export const CLOCK_CITIES: ClockCity[] = [
  { key: 'taipei', zone: 'Asia/Taipei' },
  { key: 'london', zone: 'Europe/London' },
  { key: 'new_york', zone: 'America/New_York' },
  { key: 'tokyo', zone: 'Asia/Tokyo' },
];

/** HH:mm in an IANA zone, using the platform's time zone database. */
export function timeIn(zone: string, at: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: zone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(at);
  const h = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const m = parts.find((p) => p.type === 'minute')?.value ?? '00';
  return `${h === '24' ? '00' : h}:${m}`;
}

/** yyyy-MM-dd in an IANA zone (to show when a city is on a different day). */
export function dateIn(zone: string, at: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}
