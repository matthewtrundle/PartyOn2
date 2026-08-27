/**
 * Vercel Log Drain receiver.
 *
 * A Log Drain streams one NDJSON line per HTTP request to this endpoint. Each
 * line is stored in `vercel_events`, from which page views and human-vs-bot
 * splits are derived (see `src/lib/analytics/vercel-events.ts`).
 *
 * Two things about log drains are easy to get wrong and worth stating here:
 * the request data is nested under `proxy`, not at the top level, and there is
 * no "pageview" event type — that belongs to Vercel's separate Web Analytics
 * drain. Filtering for one would store nothing at all.
 *
 * @see https://vercel.com/docs/drains
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database/client';
import { verifyDrainSignature } from '@/lib/vercel/drain-verification';
import { isNoisePath, redactPath } from '@/lib/analytics/vercel-events';

/** Drain batches can be large; give the handler the same headroom as our other webhooks. */
export const maxDuration = 60;

/** Rows per insert. 17 columns × 500 stays far below Postgres' bind-parameter ceiling. */
const CHUNK_SIZE = 500;

/** Longest path/referrer we keep — `path` is indexed, and btree entries are size-capped. */
const MAX_URL_LENGTH = 500;

/** Cap for every other stored string, so a hostile header can't store unbounded text. */
const MAX_TEXT_LENGTH = 1024;

/** C0 control characters — Postgres rejects NUL in TEXT, so they never reach a row. */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001F]/g;

/** Largest batch we will read. Real drain batches are small NDJSON lines. */
const MAX_BODY_BYTES = 4 * 1024 * 1024;

type JsonRecord = Record<string, unknown>;

/** A row ready for insertion into `vercel_events`. */
interface DrainEventRecord {
  vercelId: string | null;
  projectId: string | null;
  source: string;
  timestamp: Date;
  path: string | null;
  referrer: string | null;
  statusCode: number | null;
  method: string | null;
  userAgent: string | null;
  clientIp: string | null;
  cacheStatus: string | null;
  responseBytes: number | null;
  executionRegion: string | null;
  environment: string | null;
  deploymentId: string | null;
  requestId: string | null;
}

function asRecord(value: unknown): JsonRecord | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

/**
 * Coerce to a stored string.
 *
 * C0 control characters are stripped because Postgres rejects NUL bytes in TEXT
 * outright: one request carrying a NUL byte in its user-agent would otherwise fail
 * the entire 500-row insert chunk, return 500, and be retried by Vercel into the
 * same failure — silently losing every legitimate row batched alongside it.
 */
function asString(value: unknown, maxLength = MAX_TEXT_LENGTH): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(CONTROL_CHARS, '').slice(0, maxLength);
  return cleaned.length > 0 ? cleaned : null;
}

function asInt(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : null;
}

/** Vercel sends epoch milliseconds; anything unusable falls back to receipt time. */
function toTimestamp(value: unknown): Date {
  const ms = typeof value === 'number' ? value : Number(value);
  if (Number.isFinite(ms)) {
    const date = new Date(ms);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return new Date();
}

/**
 * Split a drain payload into log objects.
 *
 * NDJSON is the configured format, but a drain misconfigured to "JSON array"
 * is tolerated rather than silently storing zero rows. Malformed lines are
 * skipped individually so one bad line cannot discard a whole batch.
 */
function parseDrainPayload(body: string): JsonRecord[] {
  const trimmed = body.trim();
  if (!trimmed) return [];

  const logs: JsonRecord[] = [];

  if (trimmed.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          const record = asRecord(item);
          if (record) logs.push(record);
        }
        return logs;
      }
    } catch {
      // Not a valid array after all — fall through to line-by-line parsing.
    }
  }

  for (const line of trimmed.split('\n')) {
    const candidate = line.trim();
    if (!candidate) continue;
    try {
      const record = asRecord(JSON.parse(candidate));
      if (record) logs.push(record);
    } catch {
      // Skip the malformed line; the rest of the batch still lands.
    }
  }
  return logs;
}

/**
 * Map one raw log line onto a database row.
 *
 * Every field is coerced defensively: a single odd line must not be able to
 * throw and take its whole insert chunk down with it.
 */
function toEvent(log: JsonRecord): DrainEventRecord {
  const proxy = asRecord(log.proxy) ?? {};

  // Query string is dropped and credential-bearing segments are replaced with
  // their route template before the path is ever stored.
  const rawPath = asString(proxy.path, MAX_URL_LENGTH) ?? asString(log.path, MAX_URL_LENGTH);
  const path = rawPath ? redactPath(rawPath.split('?')[0]).slice(0, MAX_URL_LENGTH) : null;

  const rawUserAgent = proxy.userAgent;
  const userAgent = Array.isArray(rawUserAgent)
    ? asString(rawUserAgent[0])
    : asString(rawUserAgent);

  // The wire field is "referer" (one r) — the misspelling is in the HTTP spec.
  const referrer =
    asString(proxy.referer, MAX_URL_LENGTH) ?? asString(proxy.referrer, MAX_URL_LENGTH);

  return {
    vercelId: asString(log.id) ?? asString(log.requestId),
    projectId: asString(log.projectId),
    source: asString(log.source) ?? 'unknown',
    timestamp: toTimestamp(log.timestamp ?? proxy.timestamp),
    path,
    referrer,
    statusCode: asInt(proxy.statusCode) ?? asInt(log.statusCode),
    method: asString(proxy.method),
    userAgent,
    clientIp: asString(proxy.clientIp),
    cacheStatus: asString(proxy.vercelCache),
    responseBytes: asInt(proxy.responseByteSize),
    executionRegion: asString(log.executionRegion) ?? asString(proxy.region),
    environment: asString(log.environment),
    deploymentId: asString(log.deploymentId),
    requestId: asString(log.requestId),
  };
}

/** Build logs carry no request data (no `proxy`, no status) — skip them. */
function isRequestLog(log: JsonRecord): boolean {
  return asRecord(log.proxy) !== null || (log.statusCode !== undefined && log.statusCode !== null);
}

/**
 * Receive a batch of drain lines.
 *
 * Responds 500 on unexpected failure so Vercel retries and the data survives;
 * duplicate lines from a retry are collapsed at query time.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Reject an oversized batch before buffering it: this endpoint is reachable
    // unauthenticated, and the body is read before the signature can be checked.
    const declaredLength = Number(request.headers.get('content-length') ?? '0');
    if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
      console.error(`[Vercel Drain] Rejected oversized batch (${declaredLength} bytes)`);
      return NextResponse.json({ success: false, error: 'payload_too_large' }, { status: 413 });
    }

    const rawBody = await request.text();

    // Endpoint-verification ping: must be answered before any auth check,
    // because it is not signed. Nothing is stored.
    const verifyToken = request.headers.get('x-vercel-verify');
    if (verifyToken) {
      return NextResponse.json(
        { success: true, 'x-vercel-verify': verifyToken },
        { headers: { 'x-vercel-verify': verifyToken } }
      );
    }

    const secret = process.env.VERCEL_DRAIN_SECRET ?? '';
    const mustVerify = secret.length > 0 || process.env.NODE_ENV === 'production';

    if (mustVerify) {
      if (secret.length === 0) {
        console.error('[Vercel Drain] VERCEL_DRAIN_SECRET is not set — rejecting delivery');
        return NextResponse.json({ success: false, error: 'not_configured' }, { status: 401 });
      }
      const signature = request.headers.get('x-vercel-signature');
      if (!verifyDrainSignature(rawBody, signature, secret)) {
        console.error('[Vercel Drain] Invalid signature');
        return NextResponse.json({ success: false, error: 'invalid_signature' }, { status: 401 });
      }
    }

    const logs = parseDrainPayload(rawBody);
    const events = logs.filter(isRequestLog).map(toEvent).filter((e) => !isNoisePath(e.path));

    let stored = 0;
    for (let i = 0; i < events.length; i += CHUNK_SIZE) {
      const result = await prisma.vercelEvent.createMany({ data: events.slice(i, i + CHUNK_SIZE) });
      stored += result.count;
    }

    const ms = Date.now() - startTime;
    console.log(`[Vercel Drain] Received ${logs.length} lines, stored ${stored} in ${ms}ms`);

    return NextResponse.json({ success: true, received: logs.length, stored, ms });
  } catch (error) {
    console.error('[Vercel Drain] Error:', error);
    return NextResponse.json({ success: false, error: 'internal_error' }, { status: 500 });
  }
}

/** Health check — also the marker used to confirm a deploy carries this route. */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ success: true, status: 'ok', endpoint: 'vercel-drain' });
}
