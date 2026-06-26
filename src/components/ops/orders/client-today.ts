/**
 * America/Chicago YYYY-MM-DD for "today" — client-side copy of the server
 * helper in src/lib/ops/cooler-grouping.ts (kept tiny so client bundles
 * don't pull the server data layer).
 */
export function todayCT(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
