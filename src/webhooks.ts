import { createHmac, timingSafeEqual } from 'node:crypto';
import type { VerifyWebhookSignatureOptions } from './types';

/** The header that carries a monitor delivery's signature: `t=<unix>,v1=<hex>`. */
export const WEBHOOK_SIGNATURE_HEADER = 'Desearch-Signature';

/** How old (or how far in the future) a signature's timestamp may be by default, in seconds. */
export const WEBHOOK_TOLERANCE_SECONDS = 300;

const HEX_SHA256 = /^[0-9a-f]{64}$/i;

/**
 * Check a Monitors webhook delivery: true when the `Desearch-Signature` header was made with `secret`
 * over this exact body, less than `toleranceSeconds` (default 300) from now.
 *
 * The header is `t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<raw body>">`, keyed with the monitor's
 * `webhook_secret` as returned (`whsec_...`, prefix included). Pass the raw request body as received,
 * before any JSON parsing: re-serialized JSON does not match. Signatures are compared in constant
 * time. A missing, malformed or stale header returns false.
 *
 * @param secret - The monitor's `webhook_secret`, from `createMonitor` or `rotateMonitorWebhookSecret`.
 * @param header - The `Desearch-Signature` header value.
 * @param body - The raw request body, as a string or bytes (a Buffer works).
 * @param options - Optional `toleranceSeconds` and `now` (Unix seconds, for tests).
 * @returns Whether the delivery is authentic and recent.
 * @throws TypeError when `body` is neither a string nor bytes (for example an already parsed object).
 */
export function verifyWebhookSignature(
  secret: string,
  header: string | null | undefined,
  body: string | Uint8Array,
  options: VerifyWebhookSignatureOptions = {}
): boolean {
  if (typeof body !== 'string' && !(body instanceof Uint8Array)) {
    throw new TypeError(
      'verifyWebhookSignature needs the raw request body as a string or bytes, not a parsed object'
    );
  }
  if (!secret || typeof header !== 'string') {
    return false;
  }

  let timestamp: string | undefined;
  const signatures: string[] = [];
  for (const part of header.split(',')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key === 't') {
      if (timestamp !== undefined) return false;
      timestamp = value;
    } else if (key === 'v1') {
      signatures.push(value);
    }
  }
  if (timestamp === undefined || !/^\d+$/.test(timestamp)) {
    return false;
  }

  const tolerance = options.toleranceSeconds ?? WEBHOOK_TOLERANCE_SECONDS;
  const now = options.now ?? Date.now() / 1000;
  if (Math.abs(now - Number(timestamp)) > tolerance) {
    return false;
  }

  const expected = createHmac('sha256', secret)
    .update(`${timestamp}.`)
    .update(body)
    .digest();
  let valid = false;
  for (const signature of signatures) {
    if (!HEX_SHA256.test(signature)) continue;
    // Both sides are 32 bytes here, so timingSafeEqual never throws on length.
    if (timingSafeEqual(expected, Buffer.from(signature, 'hex'))) {
      valid = true;
    }
  }
  return valid;
}
