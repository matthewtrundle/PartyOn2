/**
 * Legacy redirect — Phase 1C moved the triage queue to /admin/recommendations
 * (unified Marketing + Operations + SEO). This stub preserves existing
 * bookmarks in operator browsers, the Monday Marketing briefing email, and
 * inline references in cron output.
 */

import { redirect } from 'next/navigation';

export default function LegacyMarketingRecommendationsRedirect(): never {
  redirect('/admin/recommendations?domain=marketing');
}
