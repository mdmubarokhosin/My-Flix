import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-server';

export const runtime = 'edge';

const BOHUDUR_BASE = 'https://request.bohudur.one';

// POST /api/payment/webhook — receives webhook from Bohudur
//
// SECURITY WARNING: Webhook signature verification should be added for production.
// Bohudur should provide a way to verify webhook authenticity (e.g., HMAC signature,
// shared secret, or IP allowlisting). Without verification, an attacker could forge
// webhook payloads to credit coins without paying.
//
// TODO: Once Bohudur documents a webhook verification mechanism, implement it here
// before processing any webhook payload.
export async function POST(req: NextRequest) {
  try {
    // TODO(CRITICAL): Add webhook signature verification before processing.
    // Without signature verification, any attacker can forge a webhook payload
    // (e.g., { paymentkey: "<valid_key>", status: "COMPLETED" }) to credit coins
    // without making an actual payment. Implement ONE of the following:
    //   1. HMAC signature verification (if Bohudur signs webhooks with a secret)
    //   2. IP allowlisting (restrict to Bohudur's known webhook IP ranges)
    //   3. Shared secret header validation
    // Contact Bohudur support for their webhook verification documentation.
    // See: https://docs.bohudur.one (or equivalent) for webhook security details.

    const body = await req.json();
    const { paymentkey, status } = body;

    console.log('[Bohudur Webhook] Received:', { paymentkey, status });

    // Basic validation: verify the request body has a paymentkey field before processing.
    // This is a minimal safeguard — full signature verification is still needed for production.
    if (!paymentkey || typeof paymentkey !== 'string') {
      console.error('[Bohudur Webhook] Missing or invalid paymentkey in body');
      return NextResponse.json({ received: true });
    }

    if (!status) {
      return NextResponse.json({ received: true });
    }

    // Process asynchronously — don't block the response
    processWebhook(paymentkey, status).catch((err) => {
      console.error('[Bohudur Webhook] Processing error:', err);
    });

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ received: true });
  }
}

async function processWebhook(paymentkey: string, webhookStatus: string) {
  // Find payment by paymentkey
  const paymentsData = await db.get<Record<string, any>>('payments');
  if (!paymentsData) return;

  let targetPaymentId: string | null = null;
  let targetPayment: Record<string, any> | null = null;

  for (const [pid, pdata] of Object.entries(paymentsData)) {
    const p = pdata as Record<string, any>;
    if (p.paymentkey === paymentkey) {
      targetPaymentId = pid;
      targetPayment = p;
      break;
    }
  }

  if (!targetPaymentId || !targetPayment) {
    console.error('[Bohudur Webhook] Payment not found for key:', paymentkey);
    return;
  }
  if (targetPayment.status === 'completed') {
    console.log('[Bohudur Webhook] Already completed, skipping:', targetPaymentId);
    return;
  }

  if (webhookStatus === 'COMPLETED') {
    // Verify via query API before crediting (per Bohudur best practice)
    const settings = await db.get<Record<string, any>>('settings');
    const apiKey = String(settings?.bohudurApiKey || '').trim();
    if (!apiKey) {
      console.error('[Bohudur Webhook] API key not found in settings');
      return;
    }

    const queryRes = await fetch(`${BOHUDUR_BASE}/query/v2/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'AH-BOHUDUR-API-KEY': apiKey,
      },
      body: JSON.stringify({ paymentkey }),
    });
    const queryData = await queryRes.json();
    console.log('[Bohudur Webhook] Query result:', { status: queryData.status });

    if (queryData.status === 'COMPLETED') {
      // Execute payment (one-time only)
      try {
        const execRes = await fetch(`${BOHUDUR_BASE}/execute/v2/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'AH-BOHUDUR-API-KEY': apiKey,
          },
          body: JSON.stringify({ paymentkey }),
        });
        const execData = await execRes.json();
        console.log('[Bohudur Webhook] Execute result:', { status: execData.status, code: execData.responseCode });
      } catch (execErr) {
        console.error('[Bohudur Webhook] Execute error:', execErr);
      }

      // Credit coins regardless of execute result if query confirms COMPLETED
      await creditCoins(targetPayment.userId, targetPaymentId, targetPayment);
    }
  } else if (webhookStatus === 'CANCELLED') {
    await db.update(`payments/${targetPaymentId}`, { status: 'cancelled' });
    console.log('[Bohudur Webhook] Payment cancelled:', targetPaymentId);
  }
}

async function creditCoins(userId: string, paymentId: string, payment: Record<string, any>) {
  // Idempotency check
  const existingPayment = await db.get<Record<string, any>>(`payments/${paymentId}`);
  if (existingPayment?.status === 'completed') return;

  console.log('[Bohudur Webhook] Crediting coins:', { userId, paymentId, coins: payment.coins });

  await db.update(`payments/${paymentId}`, {
    status: 'completed',
    completedAt: Date.now(),
  });

  const userData = await db.get<Record<string, any>>(`users/${userId}`);
  const currentBalance = userData?.balance || 0;
  const newBalance = currentBalance + (payment.coins || 0);

  const transactions = userData?.transactions || [];
  const newTx = {
    type: 'purchase',
    title: `কয়েন ক্রয়: ${payment.packageName || 'Package'}`,
    amount: payment.coins,
    time: Date.now(),
  };
  transactions.unshift(newTx);
  const trimmedTx = transactions.slice(0, 50);

  await db.update(`users/${userId}`, {
    balance: newBalance,
    transactions: trimmedTx,
  });

  console.log('[Bohudur Webhook] Coins credited:', { userId, newBalance });
}
