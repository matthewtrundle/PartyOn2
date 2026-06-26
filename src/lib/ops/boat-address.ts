/**
 * The Premier marina / boat-dock delivery address. A cruise (DISCO / PRIVATE)
 * label only applies to deliveries going HERE — a guest booked on a cruise
 * another day whose order ships to their house is not a cruise delivery.
 *
 * Server-safe (no React / client deps) so both UI components and API routes
 * can share the single source of truth for "is this going to the boat?".
 */
export function isBoatAddress(address: string | null | undefined): boolean {
  const a = (address || '').toLowerCase();
  return a.includes('13993 fm 2769') || a.includes('rocky hills');
}
