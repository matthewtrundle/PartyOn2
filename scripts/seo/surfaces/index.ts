/**
 * Surface registry — one entry per SEMrush dashboard the orchestrator
 * walks through.
 *
 * Each surface implements the `Surface` interface: navigate + scrape +
 * return a payload. Failures are wrapped in the envelope upstream; the
 * surface module itself only throws.
 *
 * Order matters — surfaces are scraped sequentially in the order
 * listed below. Position Tracking + Site Audit run first because they're
 * the SEO Director's primary inputs.
 */
import type { Page } from 'playwright';
import type {
  ScrapeContext,
  SurfaceKey,
} from '../lib/types';

import { positionTracking } from './position-tracking';
import { keywordGap } from './keyword-gap';
import { siteAudit } from './site-audit';
import { organicResearch } from './organic-research';
import { backlinkAnalytics } from './backlink-analytics';
import { aiBrandVisibility } from './ai-brand-visibility';
import { aiPromptTracking } from './ai-prompt-tracking';
import { keywordMagic } from './keyword-magic';

export interface Surface<T = unknown> {
  key: SurfaceKey;
  /** Best-effort URL — orchestrator nav-checks before scraping. */
  url: (ctx: ScrapeContext) => string;
  /** Set true if SEMrush requires a project id; orchestrator discovers + injects. */
  needsProjectId: boolean;
  /** Returns the payload. Throws on irrecoverable failure. */
  scrape: (page: Page, ctx: ScrapeContext) => Promise<T>;
}

export const SURFACES: Surface[] = [
  positionTracking,
  siteAudit,
  organicResearch,
  backlinkAnalytics,
  keywordGap,
  aiBrandVisibility,
  aiPromptTracking,
  keywordMagic,
];
