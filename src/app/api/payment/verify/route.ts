import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-server';
import {
  creditCoinsForPayment,
  executeBohudurPayment,
  queryBohudurPayment,
} from '@/lib/payment-utils';

export const runtime = 'edge';

// GET /api/payment/verify — called when user returns from Bohudur checkout.
//
// SECURITY (IDOR fix): the userId is read from the payment record itself,
// NOT from the query string. The previous implementation trusted a
// `?userId=` query param, which let any attacker credit any user's account
// by knowing only the paymentId.
//
// The user is redirected to this URL by Bohudur, so we can't add a server
// cookie here. Instead we rely on: (a) paymentId being unguessable (Firebase
// push key), (b) payment.userId being authoritative.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const paymentId = searchParams.get('paymentId')?.trim();
  const cancelled = searchParams.get('cancelled');

  if (!paymentId) {
    return NextResponse.redirect(new URL('/?payment=error', req.url));
  }

  try {
    const payment = await db.get<Record<string, unknown>>(`payments/${paymentId}`);
    if (!payment) {
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

    const settings = await db.get<Record<string, unknown>>('settings');
    const apiKey = String(settings?.bohudurApiKey || '').trim();
    if (!apiKey || !payment.paymentkey) {
      return NextResponse.redirect(new URL('/?payment=error', req.url));
    }

    // Query Bohudur for the actual payment status.
    const query = await queryBohudurPayment(
      payment.paymentkey as string,
      apiKey,
    );

    if (query.status === 'COMPLETED') {
      // Execute (one-time capture).
      try {
        await executeBohudurPayment(payment.paymentkey as string, apiKey);
      } catch (execErr) {
        console.error('[Bohudur Verify] Execute error:', execErr);
      }
      // Credit coins (idempotent — safe to call even if webhook already did).
      await creditCoinsForPayment(paymentId);
      return NextResponse.redirect(new URL('/?payment=success', req.url));
    }

    if (query.status === 'CANCELLED') {
      await db.update(`payments/${paymentId}`, { status: 'cancelled' });
      return NextResponse.redirect(new URL('/?payment=cancelled', req.url));
    }
    if (query.status === 'PENDING') {
      return NextResponse.redirect(new URL('/?payment=pending', req.url));
    }
    if (query.status === 'EXECUTED') {
      // Webhook already executed — just credit if not yet credited.
      await creditCoinsForPayment(paymentId);
      return NextResponse.redirect(new URL('/?payment=success', req.url));
    }

    await db.update(`payments/${paymentId}`, { status: 'failed' });
    return NextResponse.redirect(new URL('/?payment=error', req.url));
  } catch (error) {
    console.error('[Bohudur Verify] Error:', error);
    return NextResponse.redirect(new URL('/?payment=error', req.url));
  }
}
