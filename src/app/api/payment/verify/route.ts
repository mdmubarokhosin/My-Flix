import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-server';

export const runtime = 'edge';

const BOHUDUR_BASE = 'https://request.bohudur.one';

// GET /api/payment/verify — called when user returns from Bohudur checkout
// TODO: There is a race condition between this verify endpoint and the webhook endpoint.
// Both can attempt to credit coins for the same payment. The idempotency check in
// creditCoins mitigates double-crediting, but ideally this should use a distributed lock.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const paymentId = searchParams.get('paymentId')?.trim();
  const userId = searchParams.get('userId')?.trim();
  const cancelled = searchParams.get('cancelled');

  // Basic validation: paymentId and userId must be present, non-empty strings
  if (!paymentId || !userId) {
    console.error('[Bohudur Verify] Missing required params:', { paymentId, userId });
    return NextResponse.redirect(new URL('/?payment=error', req.url));
  }

  try {
    const payment = await db.get<Record<string, any>>(`payments/${paymentId}`);
    if (!payment) {
      console.error('[Bohudur Verify] Payment not found:', paymentId);
      return NextResponse.redirect(new URL('/?payment=error', req.url));
    }

    if (payment.status === 'completed') {
      return NextResponse.redirect(new URL('/?payment=success', req.url));
    }

    if (payment.status === 'failed' || payment.status === 'cancelled') {
      return NextResponse.redirect(new URL('/?payment=already_processed', req.url));
    }

    if (cancelled === 'true') {
      await db.update(`payments/${paymentId}`, { status: 'cancelled' });
      return NextResponse.redirect(new URL('/?payment=cancelled', req.url));
    }

    // Get API key from settings
    const settings = await db.get<Record<string, any>>('settings');
    const apiKey = String(settings?.bohudurApiKey || '').trim();
    if (!apiKey || !payment.paymentkey) {
      console.error('[Bohudur Verify] Missing API key or paymentkey');
      return NextResponse.redirect(new URL('/?payment=error', req.url));
    }

    // Step 1: Query Bohudur for actual payment status
    console.log('[Bohudur Verify] Querying payment:', paymentId);
    const queryRes = await fetch(`${BOHUDUR_BASE}/query/v2/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'AH-BOHUDUR-API-KEY': apiKey,
      },
      body: JSON.stringify({ paymentkey: payment.paymentkey }),
    });

    const queryData = await queryRes.json();
    console.log('[Bohudur Verify] Query result:', { status: queryData.status, code: queryData.responseCode });

    if (queryData.status === 'COMPLETED') {
      // Step 2: Execute payment (one-time only)
      console.log('[Bohudur Verify] Executing payment:', paymentId);
      try {
        const execRes = await fetch(`${BOHUDUR_BASE}/execute/v2/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'AH-BOHUDUR-API-KEY': apiKey,
          },
          body: JSON.stringify({ paymentkey: payment.paymentkey }),
        });

        const execData = await execRes.json();
        console.log('[Bohudur Verify] Execute result:', { status: execData.status, code: execData.responseCode });

        if (execData.status === 'EXECUTED') {
          await creditCoins(userId, paymentId, payment);
          return NextResponse.redirect(new URL('/?payment=success', req.url));
        }
      } catch (execErr) {
        console.error('[Bohudur Verify] Execute error:', execErr);
      }

      // Even if execute fails with a network error, still credit if query confirmed COMPLETED
      const recheck = await db.get<Record<string, any>>(`payments/${paymentId}`);
      if (recheck?.status !== 'completed') {
        await creditCoins(userId, paymentId, payment);
      }
      return NextResponse.redirect(new URL('/?payment=success', req.url));

    } else if (queryData.status === 'CANCELLED') {
      await db.update(`payments/${paymentId}`, { status: 'cancelled' });
      return NextResponse.redirect(new URL('/?payment=cancelled', req.url));
    } else if (queryData.status === 'PENDING') {
      return NextResponse.redirect(new URL('/?payment=pending', req.url));
    } else if (queryData.status === 'EXECUTED') {
      // Already executed by webhook
      const recheck = await db.get<Record<string, any>>(`payments/${paymentId}`);
      if (recheck?.status !== 'completed') {
        await creditCoins(userId, paymentId, payment);
      }
      return NextResponse.redirect(new URL('/?payment=success', req.url));
    } else {
      console.error('[Bohudur Verify] Unknown status:', queryData.status, queryData);
      await db.update(`payments/${paymentId}`, { status: 'failed' });
      return NextResponse.redirect(new URL('/?payment=error', req.url));
    }
  } catch (error) {
    console.error('[Bohudur Verify] Error:', error);
    return NextResponse.redirect(new URL('/?payment=error', req.url));
  }
}

async function creditCoins(userId: string, paymentId: string, payment: Record<string, any>) {
  // Idempotency check
  const existingPayment = await db.get<Record<string, any>>(`payments/${paymentId}`);
  if (existingPayment?.status === 'completed') return;

  console.log('[Bohudur] Crediting coins:', { userId, paymentId, coins: payment.coins });

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

  console.log('[Bohudur] Coins credited successfully:', { userId, newBalance });
}
