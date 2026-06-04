/**
 * One-off custom themes for specific GroupOrderV2 dashboards.
 *
 * Keyed by shareCode. If a dashboard's shareCode is in this map, a tall
 * branded hero band is rendered at the top of the page. Otherwise the
 * dashboard renders normally.
 *
 * To remove a theme (after the party): just delete the entry.
 */
export interface CustomDashboardTheme {
  heroImageUrl: string;
  heroAlt: string;
  /** Optional short subtitle under the title (e.g. "Boat Party") */
  eyebrow?: string;
}

export const customDashboardThemes: Record<string, CustomDashboardTheme> = {
  // Ashley's birthday boat party — Sunday May 17, 2026
  IHWM6B: {
    heroImageUrl: '/images/dashboards/ashley-birthday.png',
    heroAlt: "Ashley's birthday boat party",
    eyebrow: 'Anderson Mill Marina · Sun, May 17',
  },
};

export function getCustomDashboardTheme(shareCode: string | undefined): CustomDashboardTheme | null {
  if (!shareCode) return null;
  return customDashboardThemes[shareCode] ?? null;
}
