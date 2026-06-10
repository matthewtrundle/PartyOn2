/**
 * Shared types for the SEMrush scrape pipeline.
 *
 * Each surface module exports a `scrape()` function returning one of
 * these payload types. The orchestrator wraps the result in an envelope
 * (success/failure + timing) before persisting to the SeoSnapshot table.
 */

export type SurfaceKey =
  | 'position-tracking'
  | 'keyword-gap'
  | 'site-audit'
  | 'organic-research'
  | 'backlink-analytics'
  | 'ai-brand-visibility'
  | 'ai-prompt-tracking'
  | 'keyword-magic';

export type ScrapeEnvelope<T = unknown> = {
  surface: SurfaceKey;
  capturedAt: string; // ISO
  domain: string;
  durationMs: number;
  success: true;
  payload: T;
} | {
  surface: SurfaceKey;
  capturedAt: string;
  domain: string;
  durationMs: number;
  success: false;
  failure: string;
  payload: null;
};

// ─── Per-surface payload schemas ─────────────────────────────────────

export type PositionTrackingPayload = {
  rows: Array<{
    keyword: string;
    position: number | null;
    previousPosition: number | null;
    url: string | null;
    searchVolume: number | null;
    kdPct: number | null;
    trackedSince: string | null;
  }>;
  totalKeywords: number;
};

export type KeywordGapPayload = {
  competitors: string[];
  /** First N rows per category, capped per orchestrator. */
  missing: GapRow[];
  weak: GapRow[];
  untapped: GapRow[];
};
export type GapRow = {
  keyword: string;
  volume: number | null;
  kdPct: number | null;
  intent: string | null;
  ourPosition: number | null;
  competitorPositions: Record<string, number | null>;
};

export type SiteAuditPayload = {
  healthPct: number | null;
  errors: number;
  warnings: number;
  notices: number;
  topIssues: Array<{ name: string; severity: string; count: number }>;
  pagesCrawled: number | null;
  pagesBlocked: number | null;
  lastCrawlAt: string | null;
};

export type OrganicResearchPayload = {
  trafficEstimate: number | null;
  rankingKeywords: number | null;
  authorityScore: number | null;
  topCount: { top3: number; top10: number; top20: number };
  topPages: Array<{ url: string; traffic: number; keywords: number }>;
};

export type BacklinkAnalyticsPayload = {
  totalBacklinks: number | null;
  referringDomains: number | null;
  topAnchors: Array<{ anchor: string; sharePct: number }>;
  recentDomains: Array<{ domain: string; firstSeen: string | null; pageScore: number | null }>;
};

export type AiBrandVisibilityPayload = {
  /** One entry per LLM tab found on the page. */
  llms: Array<{
    llm: string;
    presencePct: number | null;
    sentiment: { positive: number; neutral: number; negative: number } | null;
    topCitedDomains: Array<{ domain: string; sharePct: number | null }>;
  }>;
};

export type AiPromptTrackingPayload = {
  truncated: boolean;
  /** Flat array of prompt × LLM cells. */
  cells: Array<{
    prompt: string;
    llm: string;
    responseText: string;
    cited: boolean;
    rank: number | null;
    competitorsMentioned: string[];
  }>;
};

export type KeywordMagicPayload = {
  /** One entry per seed keyword from data/seo/semrush/_queue/keyword-magic.txt. */
  seeds: Array<{
    seed: string;
    related: Array<{
      keyword: string;
      volume: number | null;
      kdPct: number | null;
      intent: string | null;
      serpFeatures: string[];
    }>;
  }>;
};

// ─── Shared config + tenant context ─────────────────────────────────

export type TenantConfig = {
  domain: string;
  semrushProjectId?: string;
  competitors?: string[];
  /** Mapping of surface → URL templates if SEMrush updates the slug. */
  surfaceUrlOverrides?: Partial<Record<SurfaceKey, string>>;
};

export type ScrapeContext = {
  tenant: TenantConfig;
  runRef: string; // GH Actions run id or 'local-<timestamp>'
  /** Where per-surface debug screenshots go on disk before being uploaded / discarded. */
  artifactsDir: string;
};
