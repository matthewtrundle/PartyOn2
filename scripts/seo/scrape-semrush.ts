#!/usr/bin/env -S npx tsx
/**
 * SEMrush daily scrape orchestrator.
 *
 * Runs the 8-surface capture for partyondelivery.com and writes one
 * SeoSnapshot row per surface. Designed for unattended execution in
 * GitHub Actions on a daily cron — but also runnable locally for QA:
 *
 *   SEMRUSH_COOKIE_FILE=./cookie.json npx tsx scripts/seo/scrape-semrush.ts
 *
 * Failure semantics:
 *   - Cookie expired → exit 2 (notifies webhook + GH emails owner)
 *   - Per-surface failure → recorded in DB, run continues
 *   - All surfaces failed → exit 1
 *   - At least one surface succeeded → exit 0
 *
 * Environment:
 *   SEMRUSH_COOKIE_JSON       (preferred — inline JSON of .semrush.com cookies)
 *   SEMRUSH_COOKIE_FILE       (alt — path to JSON file)
 *   GHL_DASHBOARD_WEBHOOK_URL (optional — completion + failure pings)
 *   POSTGRES_URL              (read from .env — Prisma auto-loads)
 *   GITHUB_RUN_ID             (auto-set in Actions — used as runRef)
 *   GITHUB_SHA                (auto-set in Actions — appended to runRef)
 */
import { chromium, type Page } from 'playwright';
import { loadTenant, persistTenant } from './lib/tenant';
import { restoreSession, verifySession, SemrushSessionExpiredError } from './lib/auth';
import { saveSnapshot, shutdown } from './lib/persist';
import { notifyScrapeCompleted, notifyCookieExpired, type ScrapeSummary } from './lib/notify';
import { SURFACES, type Surface } from './surfaces';
import type { ScrapeContext, ScrapeEnvelope, SurfaceKey, TenantConfig } from './lib/types';
import { AiToolkitGatedError } from './surfaces/ai-brand-visibility';

const VIEWPORT = { width: 1440, height: 900 };

function makeRunRef(): string {
  const ghRun = process.env.GITHUB_RUN_ID;
  const ghSha = process.env.GITHUB_SHA?.slice(0, 7);
  if (ghRun) return ghSha ? `gh:${ghRun}@${ghSha}` : `gh:${ghRun}`;
  return `local:${new Date().toISOString().replace(/[:.]/g, '-')}`;
}

async function discoverProjectId(page: Page, tenant: TenantConfig): Promise<string | null> {
  if (tenant.semrushProjectId) return tenant.semrushProjectId;
  console.log('[scrape] no projectId on tenant — discovering from /projects/');
  try {
    await page.goto('https://www.semrush.com/projects/', {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    // Find a link to a project for our domain.
    const href = await page
      .locator(`a[href*="/projects/"]:has-text("${tenant.domain}")`)
      .first()
      .getAttribute('href')
      .catch(() => null);
    if (!href) return null;
    const m = href.match(/\/projects\/(\d+)/);
    return m?.[1] ?? null;
  } catch (err) {
    console.warn('[scrape] project discovery failed', err);
    return null;
  }
}

async function runSurface(
  surface: Surface,
  ctx: ScrapeContext,
  page: Page,
): Promise<ScrapeEnvelope> {
  const start = Date.now();
  const capturedAt = new Date().toISOString();

  if (surface.needsProjectId && !ctx.tenant.semrushProjectId) {
    return {
      surface: surface.key,
      domain: ctx.tenant.domain,
      capturedAt,
      durationMs: Date.now() - start,
      success: false,
      failure: 'SEMrush project id unknown — discovery step failed',
      payload: null,
    };
  }

  try {
    const targetUrl = surface.url(ctx);
    if (targetUrl !== page.url()) {
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    }
    const payload = await surface.scrape(page, ctx);
    return {
      surface: surface.key,
      domain: ctx.tenant.domain,
      capturedAt,
      durationMs: Date.now() - start,
      success: true,
      payload,
    };
  } catch (err) {
    if (err instanceof SemrushSessionExpiredError) throw err; // bubble up
    const failure =
      err instanceof AiToolkitGatedError
        ? 'AI Toolkit not in current plan'
        : (err as Error).message || String(err);
    return {
      surface: surface.key,
      domain: ctx.tenant.domain,
      capturedAt,
      durationMs: Date.now() - start,
      success: false,
      failure,
      payload: null,
    };
  }
}

async function main(): Promise<number> {
  const tenant = loadTenant();
  const runRef = makeRunRef();
  console.log(`[scrape] starting run ${runRef} for ${tenant.domain}`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  let cookieExpired = false;
  try {
    await restoreSession(context);
    await verifySession(page);
  } catch (err) {
    if (err instanceof SemrushSessionExpiredError) {
      console.error('[scrape] SEMrush session cookie expired');
      cookieExpired = true;
    } else {
      console.error('[scrape] auth failed', err);
      await browser.close();
      await shutdown();
      return 2;
    }
  }

  if (cookieExpired) {
    await notifyCookieExpired(runRef);
    await browser.close();
    await shutdown();
    return 2;
  }

  // Discover + persist project id if missing.
  const projectId = await discoverProjectId(page, tenant);
  if (projectId) {
    tenant.semrushProjectId = projectId;
    try {
      persistTenant(tenant);
    } catch (e) {
      console.warn('[scrape] could not persist tenant file', e);
    }
  }

  const ctx: ScrapeContext = { tenant, runRef, artifactsDir: '' };

  const summary: ScrapeSummary = {
    capturedAt: new Date().toISOString(),
    domain: tenant.domain,
    runRef,
    durations: {},
    successes: [],
    failures: [],
  };

  for (const surface of SURFACES) {
    console.log(`[scrape] → ${surface.key}`);
    let env: ScrapeEnvelope;
    try {
      env = await runSurface(surface, ctx, page);
    } catch (err) {
      if (err instanceof SemrushSessionExpiredError) {
        // Mid-run cookie expiry — record + notify + bail.
        console.error('[scrape] cookie expired mid-run on', surface.key);
        await notifyCookieExpired(runRef);
        summary.failures.push({ surface: surface.key, reason: 'cookie expired mid-run' });
        break;
      }
      env = {
        surface: surface.key,
        capturedAt: new Date().toISOString(),
        domain: tenant.domain,
        durationMs: 0,
        success: false,
        failure: (err as Error).message,
        payload: null,
      };
    }

    summary.durations[surface.key as SurfaceKey] = env.durationMs;
    if (env.success) summary.successes.push(env.surface);
    else summary.failures.push({ surface: env.surface, reason: env.failure });

    try {
      await saveSnapshot(env, runRef);
    } catch (err) {
      console.error('[scrape] saveSnapshot failed', err);
    }

    // Rate-limit between surfaces.
    await page.waitForTimeout(3_500);
  }

  await notifyScrapeCompleted(summary);
  await browser.close();
  await shutdown();

  console.log(
    `[scrape] done — ${summary.successes.length} ok, ${summary.failures.length} failed`,
  );
  if (summary.successes.length === 0) return 1;
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error('[scrape] fatal', err);
    process.exit(1);
  });
