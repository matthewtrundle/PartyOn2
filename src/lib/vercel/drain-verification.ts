/**
 * Vercel Drain Signature Verification
 *
 * Vercel sends an x-vercel-signature header with each drain request,
 * which is an HMAC-SHA1 hash of the payload body.
 *
 * @see https://vercel.com/docs/drains/security
 */

import crypto from 'crypto';

/**
 * Verify the signature of a Vercel Drain request
 *
 * @param rawBody - The raw request body as a string
 * @param signature - The x-vercel-signature header value
 * @param secret - The drain signature secret from Vercel settings
 * @returns true if signature is valid, false otherwise
 */
export function verifyDrainSignature(
  rawBody: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) {
    return false;
  }

  const bodyBuffer = Buffer.from(rawBody, 'utf-8');
  const expectedSignature = crypto
    .createHmac('sha1', secret)
    .update(bodyBuffer)
    .digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  try {
    const sigBuffer = Buffer.from(signature, 'utf-8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf-8');

    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

