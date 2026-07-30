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
  if (a.includes('rocky hills')) return true;
  // Premier marina at 13993, stored variously as "FM 2769" / "Farm to Market
  // Rd 2769" / "Farm to Market 2769". Match the distinctive road number (2769)
  // together with any of those road forms so all spellings resolve.
  return /2769/.test(a) && /(\bfm\b|farm to market|13993)/.test(a);
}
