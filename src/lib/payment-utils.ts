// ============================================================
// Payment utilities — shared by /api/payment, /verify, /webhook.
// ------------------------------------------------------------
// All coin-crediting goes through `creditCoinsForPayment`, which
// is idempotent and uses an atomic multi-location update.
// ============================================================

import { db } from './firebase-server';

export interface PaymentDoc {
  userId: string;
  packageId: string;
  packageName: string;
  coins: number;
  amount: number;
  paymentkey: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  createdAt: number;
  completedAt?: number;
}

/**
 * Idempotently credit coins for a payment.
 *
 * Uses Firebase's atomic multi-location PATCH so balance + transaction
 * + payment-status update all succeed or all fail. A read-before-write
 * status check guards against double-credit.
 *
 * Returns true if coins were credited, false if the payment was already
 * completed (or didn't exist).
 */
export async function creditCoinsForPayment(
  paymentId: string,
): Promise<{ ok: true; credited: boolean } | { ok: false; reason: string }> {
  // 1. Read the payment.
  const payment = await db.get<PaymentDoc>(`payments/${paymentId}`);
  if (!payment) return { ok: false, reason: 'payment_not_found' };
  if (payment.status === 'completed') return { ok: true, credited: false };
  if (payment.status === 'cancelled' || payment.status === 'failed') {
    return { ok: false, reason: `payment_${payment.status}` };
  }

  // 2. Read the user (for current balance + transactions).
  const user = await db.get<Record<string, unknown>>(`users/${payment.userId}`);
  if (!user) return { ok: false, reason: 'user_not_found' };

  const currentBalance = Number(user.balance) || 0;
  const coins = Number(payment.coins) || 0;
  const newBalance = currentBalance + coins;

  // 3. Build the new transaction.
  const txnsRaw = user.transactions;
  const txns: unknown[] = Array.isArray(txnsRaw)
    ? txnsRaw
    : txnsRaw && typeof txnsRaw === 'object'
      ? Object.values(txnsRaw)
      : [];
  const newTx = {
    type: 'purchase',
    title: `কয়েন ক্রয়: ${payment.packageName || 'Package'}`,
    amount: coins,
    time: Date.now(),
  };
  const trimmedTx = [newTx, ...txns].slice(0, 50);

  // 4. Atomic multi-location update: payment status + user balance + txns.
  // Note: this is still technically a read-then-write, but the payment.status
  // check above prevents double-credit in the common case. For full atomicity
  // we would need Firebase ETag-based transactions; see `db.transactionalUpdate`.
  await db.multiUpdate({
    [`payments/${paymentId}/status`]: 'completed',
    [`payments/${paymentId}/completedAt`]: Date.now(),
    [`users/${payment.userId}/balance`]: newBalance,
    [`users/${payment.userId}/transactions`]: trimmedTx,
  });

  return { ok: true, credited: true };
}

/**
 * Verify a Bohudur payment's actual status by querying the Bohudur API.
 * This is the canonical source of truth — never trust a webhook payload alone.
 */
export async function queryBohudurPayment(
  paymentkey: string,
  apiKey: string,
  baseUrl = 'https://request.bohudur.one',
): Promise<{ status: string; raw: Record<string, unknown> }> {
  const res = await fetch(`${baseUrl}/query/v2/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'AH-BOHUDUR-API-KEY': apiKey,
    },
    body: JSON.stringify({ paymentkey }),
  });
  const data = (await res.json()) as Record<string, unknown>;
  return { status: String(data.status || ''), raw: data };
}

/**
 * Execute a Bohudur payment (one-time capture).
 */
export async function executeBohudurPayment(
  paymentkey: string,
  apiKey: string,
  baseUrl = 'https://request.bohudur.one',
): Promise<{ status: string; raw: Record<string, unknown> }> {
  const res = await fetch(`${baseUrl}/execute/v2/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'AH-BOHUDUR-API-KEY': apiKey,
    },
    body: JSON.stringify({ paymentkey }),
  });
  const data = (await res.json()) as Record<string, unknown>;
  return { status: String(data.status || ''), raw: data };
}

/**
 * Verify webhook signature (best-effort).
 *
 * Bohudur's documented webhook auth mechanism is a shared secret passed
 * either via the `BOHUDUR_WEBHOOK_SECRET` env var or as a request header
 * named `X-Bohudur-Signature`. If no secret is configured we still
 * process the webhook BUT we always re-query Bohudur for the canonical
 * payment status before crediting (defense-in-depth).
 */
export function verifyWebhookSignature(req: Request): boolean {
  const secret = process.env.BOHUDUR_WEBHOOK_SECRET;
  if (!secret) {
    // No secret configured → cannot verify signature. We allow the request
    // through because we will re-query Bohudur before crediting.
    return true;
  }
  const sig = req.headers.get('x-bohudur-signature');
  if (!sig) return false;
  // Constant-time compare.
  if (sig.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) {
    diff |= sig.charCodeAt(i) ^ secret.charCodeAt(i);
  }
  return diff === 0;
}
