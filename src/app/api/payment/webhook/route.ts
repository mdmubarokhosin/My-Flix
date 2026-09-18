import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-server';
import {
  creditCoinsForPayment,
  executeBohudurPayment,
  queryBohudurPayment,
  verifyWebhookSignature,
} from '@/lib/payment-utils';

export const runtime = 'edge';

// POST /api/payment/webhook — receives webhook from Bohudur.
//
// SECURITY: verifies the X-Bohudur-Signature header against
// BOHUDUR_WEBHOOK_SECRET (if configured). Even without a shared secret,
// we ALWAYS re-query Bohudur for the canonical payment status before
// crediting — we never trust the webhook payload's status field alone.
export async function POST(req: NextRequest) {
  try {
    if (!verifyWebhookSignature(req)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const paymentkey = body?.paymentkey;
    const status = body?.status;

    if (!paymentkey || typeof paymentkey !== 'string') {
      return NextResponse.json({ received: true });
    }
    if (!status) {
      return NextResponse.json({ received: true });
    }

    // Process asynchronously — don't block the webhook response.
    void processWebhook(paymentkey, String(status)).catch((err) => {
      console.error('[Bohudur Webhook] Processing error:', err);
    });

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ received: true });
  }
}

async function processWebhook(paymentkey: string, webhookStatus: string) {
  // Find the payment by paymentkey. (Linear scan over payments collection —
  // acceptable for now since payment volumes are low; for high scale, add a
  // `paymentKeys/<paymentkey>` → paymentId reverse index.)
  const paymentsData = await db.get<Record<string, Record<string, unknown>>>('payments');
  if (!paymentsData) return;

  let targetPaymentId: string | null = null;
  let targetPayment: Record<string, unknown> | null = null;
  for (const [pid, pdata] of Object.entries(paymentsData)) {
    if (pdata?.paymentkey === paymentkey) {
      targetPaymentId = pid;
      targetPayment = pdata;
      break;
    }
  }
  if (!targetPaymentId || !targetPayment) return;
  if (targetPayment.status === 'completed') return;

  if (webhookStatus === 'COMPLETED') {
    // Re-query Bohudur for the canonical status (defense-in-depth).
    const settings = await db.get<Record<string, unknown>>('settings');
    const apiKey = String(settings?.bohudurApiKey || '').trim();
    if (!apiKey) return;

    const query = await queryBohudurPayment(paymentkey, apiKey);
    if (query.status !== 'COMPLETED') {
      // Webhook said COMPLETED but Bohudur API disagrees — do nothing.
      return;
    }

    // Execute (one-time capture).
    try {
      await executeBohudurPayment(paymentkey, apiKey);
    } catch (execErr) {
      console.error('[Bohudur Webhook] Execute error:', execErr);
    }

    // Credit coins (idempotent).
    await creditCoinsForPayment(targetPaymentId);
  } else if (webhookStatus === 'CANCELLED') {
    await db.update(`payments/${targetPaymentId}`, { status: 'cancelled' });
  }
}
