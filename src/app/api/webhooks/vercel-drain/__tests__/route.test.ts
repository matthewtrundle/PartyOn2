/**
 * Tests for POST /api/webhooks/vercel-drain — the Vercel Log Drain receiver.
 *
 * The failure this endpoint exists to avoid is a silent one: the previous drain
 * receiver stored nothing for months while answering 200. So these tests assert
 * on what actually reaches the database, not just on status codes — including
 * that a static-asset line, a build line and a malformed line are each dropped
 * for their own reason while the real page view survives.
 *
 * `verifyDrainSignature` runs for real (signatures are computed here with the
 * same HMAC-SHA1 the drain uses), so auth is exercised end to end.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import crypto from 'crypto';

const prismaMock = vi.hoisted(() => ({
  vercelEvent: { createMany: vi.fn() },
}));
vi.mock('@/lib/database/client', () => ({
  prisma: prismaMock,
  kv: {},
  isKVConfigured: () => false,
}));

import { POST, GET } from '../route';

const SECRET = 'test-drain-secret';
const TS = 1756000000000;

function sign(body: string, secret = SECRET): string {
  return crypto.createHmac('sha1', secret).update(Buffer.from(body, 'utf-8')).digest('hex');
}

function makeRequest(body: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/webhooks/vercel-drain', {
    method: 'POST',
    headers: { 'content-type': 'application/x-ndjson', ...headers },
    body,
  });
}

function signedRequest(body: string): NextRequest {
  return makeRequest(body, { 'x-vercel-signature': sign(body) });
}

/** A realistic page-view line: request data nested under `proxy`. */
const pageLine = JSON.stringify({
  id: 'line-page',
  source: 'edge',
  timestamp: TS,
  projectId: 'prj_party_on2',
  environment: 'production',
  deploymentId: 'dpl_abc',
  requestId: 'req-1',
  executionRegion: 'iad1',
  proxy: {
    method: 'GET',
    path: '/products?utm_source=google',
    userAgent: ['Mozilla/5.0 (Macintosh) Chrome/120.0.0.0 Safari/537.36'],
    referer: 'https://www.google.com/',
    statusCode: 200,
    clientIp: '203.0.113.7',
    vercelCache: 'MISS',
    responseByteSize: 4321,
    region: 'iad1',
  },
});

const assetLine = JSON.stringify({
  id: 'line-asset',
  source: 'static',
  timestamp: TS,
  proxy: { method: 'GET', path: '/_next/static/chunks/main.js', statusCode: 200, clientIp: '203.0.113.7' },
});

/** Build logs have no `proxy` and no status — they are not requests at all. */
const buildLine = JSON.stringify({
  id: 'line-build',
  source: 'build',
  type: 'stdout',
  timestamp: TS,
  message: 'Compiled successfully',
});

/** Rows handed to createMany across all calls. */
function storedRows(): Record<string, unknown>[] {
  return prismaMock.vercelEvent.createMany.mock.calls.flatMap(
    (call) => (call[0] as { data: Record<string, unknown>[] }).data
  );
}

describe('POST /api/webhooks/vercel-drain', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VERCEL_DRAIN_SECRET', SECRET);
    prismaMock.vercelEvent.createMany.mockImplementation(
      async ({ data }: { data: unknown[] }) => ({ count: data.length })
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('stores page views and drops asset, build and malformed lines', async () => {
    const body = [pageLine, assetLine, buildLine, '{not valid json'].join('\n');
    const res = await POST(signedRequest(body));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    // The malformed line never parses, so only three logs are "received".
    expect(json.received).toBe(3);
    expect(json.stored).toBe(1);

    const rows = storedRows();
    expect(rows).toHaveLength(1);
    expect(rows[0].path).toBe('/products');
  });

  it('maps the nested proxy fields onto the row', async () => {
    await POST(signedRequest(pageLine));
    const row = storedRows()[0];

    expect(row).toMatchObject({
      vercelId: 'line-page',
      projectId: 'prj_party_on2',
      source: 'edge',
      path: '/products', // query string stripped
      referrer: 'https://www.google.com/', // wire field is "referer"
      statusCode: 200,
      method: 'GET',
      userAgent: 'Mozilla/5.0 (Macintosh) Chrome/120.0.0.0 Safari/537.36', // unwrapped from array
      clientIp: '203.0.113.7',
      cacheStatus: 'MISS',
      responseBytes: 4321,
      executionRegion: 'iad1',
      environment: 'production',
      deploymentId: 'dpl_abc',
      requestId: 'req-1',
    });
    expect(row.timestamp).toBeInstanceOf(Date);
    expect((row.timestamp as Date).getTime()).toBe(TS);
  });

  it('rejects an unsigned delivery', async () => {
    const res = await POST(makeRequest(pageLine));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('invalid_signature');
    expect(prismaMock.vercelEvent.createMany).not.toHaveBeenCalled();
  });

  it('rejects a delivery signed with the wrong secret', async () => {
    const res = await POST(makeRequest(pageLine, { 'x-vercel-signature': sign(pageLine, 'wrong') }));
    expect(res.status).toBe(401);
    expect(prismaMock.vercelEvent.createMany).not.toHaveBeenCalled();
  });

  it('fails closed in production when no secret is configured', async () => {
    vi.stubEnv('VERCEL_DRAIN_SECRET', '');
    vi.stubEnv('NODE_ENV', 'production');
    const res = await POST(makeRequest(pageLine));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('not_configured');
  });

  it('answers an unsigned endpoint-verification ping without storing anything', async () => {
    const res = await POST(makeRequest('', { 'x-vercel-verify': 'verify-token-123' }));
    expect(res.status).toBe(200);
    expect(res.headers.get('x-vercel-verify')).toBe('verify-token-123');
    expect((await res.json())['x-vercel-verify']).toBe('verify-token-123');
    expect(prismaMock.vercelEvent.createMany).not.toHaveBeenCalled();
  });

  it('tolerates a JSON-array body rather than silently storing nothing', async () => {
    const body = `[${pageLine},${assetLine}]`;
    const res = await POST(signedRequest(body));
    const json = await res.json();
    expect(json.received).toBe(2);
    expect(json.stored).toBe(1);
  });

  it('survives a line with missing and malformed fields', async () => {
    const junk = JSON.stringify({ proxy: { method: 'GET', path: '/ok', statusCode: 'not-a-number' } });
    const res = await POST(signedRequest(junk));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.stored).toBe(1);
    const row = storedRows()[0];
    expect(row.source).toBe('unknown');
    expect(row.statusCode).toBeNull();
    expect(row.vercelId).toBeNull();
    expect(row.timestamp).toBeInstanceOf(Date);
  });

  it('redacts credential-bearing paths before they are stored', async () => {
    const line = JSON.stringify({
      id: 'line-dash',
      source: 'edge',
      timestamp: TS,
      proxy: { method: 'GET', path: '/dashboard/E97WPQ?tab=2', statusCode: 200, clientIp: '203.0.113.7' },
    });
    await POST(signedRequest(line));

    const row = storedRows()[0];
    expect(row.path).toBe('/dashboard/[code]');
    expect(JSON.stringify(row)).not.toContain('E97WPQ');
  });

  it('stamps is_datacenter from the client IP at ingest', async () => {
    const lines = [
      // Azure space (4.192.0.0/10) wearing a real-browser UA — a stealth scraper.
      JSON.stringify({
        id: 'dc-1',
        source: 'edge',
        timestamp: TS,
        proxy: {
          method: 'GET',
          path: '/kegs',
          statusCode: 200,
          clientIp: '4.200.10.20',
          userAgent: ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0 Safari/537.36'],
        },
      }),
      // Documentation space — a plain visitor as far as the flag is concerned.
      JSON.stringify({
        id: 'dc-2',
        source: 'edge',
        timestamp: TS,
        proxy: {
          method: 'GET',
          path: '/products',
          statusCode: 200,
          clientIp: '203.0.113.7',
          userAgent: ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'],
        },
      }),
    ].join('\n');
    await POST(signedRequest(lines));

    const rows = storedRows();
    expect(rows.find((r) => r.vercelId === 'dc-1')?.isDatacenter).toBe(true);
    expect(rows.find((r) => r.vercelId === 'dc-2')?.isDatacenter).toBe(false);
  });

  it('redacts a dashboard URL arriving as the referrer of the next page', async () => {
    const line = JSON.stringify({
      id: 'line-ref',
      source: 'edge',
      timestamp: TS,
      proxy: {
        method: 'GET',
        path: '/products',
        referer: 'https://partyondelivery.com/dashboard/E97WPQ',
        statusCode: 200,
        clientIp: '203.0.113.7',
      },
    });
    await POST(signedRequest(line));

    const row = storedRows()[0];
    expect(row.referrer).toBe('https://partyondelivery.com/dashboard/[code]');
    expect(JSON.stringify(row)).not.toContain('E97WPQ');
  });

  it('strips control characters that would otherwise poison the whole insert chunk', async () => {
    // A NUL byte in a header is trivial to send and Postgres rejects it in TEXT.
    // Unstripped it would fail the batch, 500, and be retried into the same failure.
    const line = JSON.stringify({
      id: 'line-nul',
      source: 'edge',
      timestamp: TS,
      proxy: {
        method: 'GET',
        path: '/pro\u0000ducts',
        userAgent: ['Mozilla/5.0 \u0000 evil'],
        statusCode: 200,
        clientIp: '203.0.113.7',
      },
    });
    const res = await POST(signedRequest(line));

    expect(res.status).toBe(200);
    const row = storedRows()[0];
    expect(row.path).toBe('/products');
    expect(row.userAgent).not.toContain('\u0000');
  });

  it('caps an oversized user-agent instead of storing unbounded text', async () => {
    const line = JSON.stringify({
      id: 'line-longua',
      source: 'edge',
      timestamp: TS,
      proxy: { method: 'GET', path: '/', userAgent: ['x'.repeat(9000)], statusCode: 200, clientIp: '1.2.3.4' },
    });
    await POST(signedRequest(line));

    expect((storedRows()[0].userAgent as string).length).toBeLessThanOrEqual(1024);
  });

  it('rejects an oversized batch before buffering it', async () => {
    const req = makeRequest(pageLine, {
      'x-vercel-signature': sign(pageLine),
      'content-length': String(50 * 1024 * 1024),
    });
    const res = await POST(req);

    expect(res.status).toBe(413);
    expect(prismaMock.vercelEvent.createMany).not.toHaveBeenCalled();
  });

  it('returns 500 on a database failure so Vercel retries instead of losing the batch', async () => {
    prismaMock.vercelEvent.createMany.mockRejectedValueOnce(new Error('connection refused'));
    const res = await POST(signedRequest(pageLine));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('internal_error');
  });

  it('handles an empty body without touching the database', async () => {
    const res = await POST(signedRequest(''));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.received).toBe(0);
    expect(json.stored).toBe(0);
    expect(prismaMock.vercelEvent.createMany).not.toHaveBeenCalled();
  });
});

describe('GET /api/webhooks/vercel-drain', () => {
  it('reports health, which is how a deploy is confirmed to carry this route', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true, status: 'ok', endpoint: 'vercel-drain' });
  });
});
