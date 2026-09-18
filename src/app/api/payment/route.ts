import { NextRequest, NextResponse } from 'next/server';
import { db, getBody } from '@/lib/firebase-server';
import { requireUser } from '@/lib/auth-middleware';
import { requireNotBanned } from '@/lib/auth';
import { z } from 'zod';

export const runtime = 'edge';

const BOHUDUR_BASE = 'https://request.bohudur.one';

const CreatePaymentSchema = z.object({
  packageId: z.string().min(1),
  packageName: z.string().optional(),
  coins: z.number().int().positive().optional(),
  amount: z.number().positive().optional(),
  userName: z.string().optional(),
  email: z.string().email().optional(),
});

// POST /api/payment — create a Bohudur payment session.
//
// SECURITY: coins + amount are validated against the server-side
// `coinPackages` collection. The client CANNOT specify an arbitrary
// amount/coins combo — only `packageId` is honored. If the package
// doesn't exist or isn't active, the request is rejected.
export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser(req.clone());
    if ('response' in auth) return auth.response;

    const bannedResponse = await requireNotBanned(auth.userId);
    if (bannedResponse) return bannedResponse;

    const body = await getBody<Record<string, unknown>>(req);
    const parsed = CreatePaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { packageId, userName, email } = parsed.data;

    // ---- Server-side package validation (CRITICAL) ----
    // Look up the package by id. Reject if missing or not active.
    const packagesData = await db.get<Record<string, { active?: boolean; coins?: number; price?: number; name?: string }>>('coinPackages');
    const pkg = packagesData?.[packageId];
    if (!pkg) {
      return NextResponse.json({ error: 'Invalid package' }, { status: 400 });
    }
    if (pkg.active === false) {
      return NextResponse.json({ error: 'This package is not available' }, { status: 400 });
    }
    const coins = Number(pkg.coins) || 0;
    const amount = Number(pkg.price) || 0;
    const packageName = pkg.name || 'Coin Package';
    if (coins <= 0 || amount <= 0) {
      return NextResponse.json({ error: 'Invalid package configuration' }, { status: 400 });
    }

    // ---- Bohudur API key ----
    const settings = await db.get<Record<string, unknown>>('settings');
    const apiKey = String(settings?.bohudurApiKey || '').trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Payment system is not configured. Admin: set the Bohudur API key in Settings.' },
        { status: 503 },
      );
    }

    // ---- User info ----
    const user = await db.get<Record<string, unknown>>(`users/${auth.userId}`);
    const fullName = userName || (user?.firstName as string) || 'User';
    const userEmail = email || `${auth.userId}@user.com`;

    // ---- Create payment record ----
    const paymentId = await db.push('payments', {
      userId: auth.userId,
      packageId,
      packageName,
      coins,
      amount,
      paymentkey: '',
      status: 'pending',
      createdAt: Date.now(),
    });

    // ---- Build URLs ----
    // Prefer NEXT_PUBLIC_APP_URL (production domain) over Origin header
    // because the Origin header may be missing or spoofed.
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || req.headers.get('origin') || 'http://localhost:3000').replace(/\/$/, '');
    const redirectUrl = `${appUrl}/api/payment/verify?paymentId=${paymentId}`;
    const cancelUrl = `${appUrl}/api/payment/verify?paymentId=${paymentId}&cancelled=true`;
    const webhookUrl = `${appUrl}/api/payment/webhook`;

    const requestBody: Record<string, unknown> = {
      full_name: fullName,
      email: userEmail,
      amount,
      return_type: 'GET',
      redirect_url: redirectUrl,
      cancel_url: cancelUrl,
    };

    if (webhookUrl.startsWith('https://')) {
      requestBody.webhook = { success: webhookUrl, cancel: webhookUrl };
    }
    requestBody.metadata = {
      paymentId,
      userId: auth.userId,
      packageId,
      coins,
    };

    // ---- Call Bohudur ----
    const bohudurRes = await fetch(`${BOHUDUR_BASE}/create/v2/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'AH-BOHUDUR-API-KEY': apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    const bohudurData = (await bohudurRes.json()) as Record<string, unknown>;

    if (bohudurData.status === 'success' && bohudurData.responseCode === 200) {
      await db.update(`payments/${paymentId}`, {
        paymentkey: bohudurData.paymentkey,
      });
      return NextResponse.json({
        success: true,
        payment_url: bohudurData.payment_url,
        paymentkey: bohudurData.paymentkey,
        paymentId,
      });
    }

    // Failed — mark payment record.
    await db.update(`payments/${paymentId}`, { status: 'failed' });

    const errorCode = bohudurData.responseCode;
    const errorMsg = (bohudurData.message as string) || 'Failed to create payment session';

    let userMessage = errorMsg;
    if (errorCode === 3013) {
      userMessage = 'Bohudur API Key সঠিক নয় বা নিষ্ক্রিয়। Admin কে Settings থেকে সঠিক API Key দিতে হবে।';
    } else if (errorCode === 3000) {
      userMessage = 'API Key পাওয়া যায়নি। Admin কে Settings থেকে Bohudur API Key সেট করতে হবে।';
    } else if (errorCode === 3005 || errorCode === 3015) {
      userMessage = 'পেমেন্টের পরিমাণ সঠিক নয়।';
    } else if (errorCode === 3007 || errorCode === 3008) {
      userMessage = 'রিটার্ন/ক্যানসেল URL সঠিক নয়। অ্যাপটি HTTPS এ হোস্ট করতে হবে।';
    }

    return NextResponse.json(
      { error: userMessage, bohudurCode: errorCode },
      { status: 400 },
    );
  } catch (error) {
    console.error('[Bohudur] POST /api/payment error:', error);
    return NextResponse.json({ error: 'Payment creation failed' }, { status: 500 });
  }
}
