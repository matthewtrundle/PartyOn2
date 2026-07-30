/**
 * Prospect email deliverability verification (Partner Outreach 2.0, PR2).
 *
 * ZeroBounce is the vendor (Allan's locked decision 2026-07-22): pay-as-you-go,
 * ~$0.008/verification. Gating rules live with the enroll path: VALID,
 * CATCH_ALL and ROLE all send; only INVALID blocks (missing mailbox =
 * guaranteed hard bounce). See enroll-gate.ts.
 *
 * Fail-closed design: 'unknown' results and timeouts DO NOT update the row —
 * the caller returns 502 and the prospect stays at its previous status, so a
 * vendor outage can never flip an email to sendable.
 */

/** Statuses stored in partner_prospects.email_verify_status (CHECK constraint). */
export type EmailVerifyStatus =
  | 'UNVERIFIED'
  | 'VALID'
  | 'INVALID'
  | 'CATCH_ALL'
  | 'UNKNOWN'
  | 'ROLE';

/** One verification result, vendor-agnostic. */
export interface VerifyResult {
  status: EmailVerifyStatus;
  /** Scrubbed vendor response for the drawer / debugging (stored as JSONB —
   * scalar values only so it satisfies Prisma's InputJsonValue). */
  raw: Record<string, string | number | boolean | null>;
}

/** Vendor interface — swap implementations without touching the route. */
export interface EmailVerifier {
  verify(email: string): Promise<VerifyResult>;
}

/** Thrown when the vendor cannot give a usable answer (route → 502, row untouched). */
export class VerificationUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VerificationUnavailableError';
  }
}

const ZEROBOUNCE_URL = 'https://api.zerobounce.net/v2/validate';
const TIMEOUT_MS = 8_000;

/**
 * Map a ZeroBounce response to our status vocabulary.
 * Exported for the test matrix.
 *
 *   role_based* sub-status → ROLE (sendable — usually the published inbox)
 *   valid                  → VALID
 *   catch-all              → CATCH_ALL (sendable — server accepts anything)
 *   invalid / spamtrap / abuse / do_not_mail → INVALID
 *   unknown / anything else → UNKNOWN (caller must NOT store it)
 */
export function mapZeroBounceStatus(zbStatus: string, zbSubStatus: string): EmailVerifyStatus {
  if (zbSubStatus.startsWith('role_based')) return 'ROLE';
  switch (zbStatus) {
    case 'valid':
      return 'VALID';
    case 'catch-all':
      return 'CATCH_ALL';
    case 'invalid':
    case 'spamtrap':
    case 'abuse':
    case 'do_not_mail':
      return 'INVALID';
    default:
      return 'UNKNOWN';
  }
}

/** ZeroBounce GET /v2/validate with an 8s timeout. */
export class ZeroBounceVerifier implements EmailVerifier {
  constructor(private readonly apiKey: string) {}

  async verify(email: string): Promise<VerifyResult> {
    const url = new URL(ZEROBOUNCE_URL);
    url.searchParams.set('api_key', this.apiKey);
    url.searchParams.set('email', email);
    url.searchParams.set('ip_address', '');

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: 'no-store',
      });
    } catch {
      // Timeout / network failure — never store a guess.
      throw new VerificationUnavailableError('zerobounce-unreachable');
    }
    if (!response.ok) {
      throw new VerificationUnavailableError(`zerobounce-http-${response.status}`);
    }

    const data = (await response.json()) as Record<string, unknown>;
    // ZeroBounce returns 200 with an "error" field on bad key / no credits.
    if (typeof data.error === 'string' && data.error) {
      throw new VerificationUnavailableError('zerobounce-error');
    }
    const status = mapZeroBounceStatus(
      typeof data.status === 'string' ? data.status : '',
      typeof data.sub_status === 'string' ? data.sub_status : ''
    );
    if (status === 'UNKNOWN') {
      throw new VerificationUnavailableError('zerobounce-unknown');
    }
    // Store only the fields we need — no api_key echo, bounded size,
    // scalar values only (Prisma InputJsonValue).
    const scalar = (v: unknown): string | number | boolean | null =>
      typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ? v : null;
    const raw: VerifyResult['raw'] = {
      status: scalar(data.status),
      sub_status: scalar(data.sub_status),
      free_email: scalar(data.free_email),
      mx_found: scalar(data.mx_found),
      smtp_provider: scalar(data.smtp_provider),
      did_you_mean: scalar(data.did_you_mean),
      processed_at: scalar(data.processed_at),
    };
    return { status, raw };
  }
}

/**
 * The configured verifier, or null when ZEROBOUNCE_API_KEY is unset
 * (route → 501 "verification unavailable").
 */
export function getEmailVerifier(): EmailVerifier | null {
  const key = process.env.ZEROBOUNCE_API_KEY;
  return key ? new ZeroBounceVerifier(key) : null;
}
