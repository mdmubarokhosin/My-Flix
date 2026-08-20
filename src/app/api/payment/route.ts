import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-server';
import { requireUser } from '@/lib/auth-middleware';
import { requireNotBanned } from '@/lib/auth';

export const runtime = 'edge';

const BOHUDUR_BASE = 'https://request.bohudur.one';

// POST /api/payment — create a Bohudur payment session
export async function POST(req: NextRequest) {
  try {
    // Authenticate and validate user
    const auth = await requireUser(req.clone());
    if ('response' in auth) return auth.response;

    // Explicit ban check (defense-in-depth)
    const bannedResponse = await requireNotBanned(auth.userId);
    if (bannedResponse) return bannedResponse;

    const body = await req.json();
    const { packageId, packageName, coins, amount, userName, email } = body;
    const userId = auth.userId;

    if (!packageId || !coins || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get Bohudur API key from settings
    const settings = await db.get<Record<string, any>>('settings');
    const apiKey = String(settings?.bohudurApiKey || '').trim();
    if (!apiKey) {
      console.error('[Bohudur] API key not found in settings');
      return NextResponse.json({ error: 'Payment system is not configured. Admin: Set Bohudur API Key in Settings.' }, { status: 503 });
    }

    // Get user info for payment
    const user = await db.get<Record<string, any>>(`users/${userId}`);
    const fullName = userName || user?.firstName || 'User';
    const userEmail = email || `${userId}@user.com`;

    // Create payment record in Firebase first
    const paymentId = await db.push('payments', {
      userId,
      packageId,
      packageName: packageName || 'Coin Package',
      coins: Number(coins),
      amount: Number(amount),
      paymentkey: '',
      status: 'pending',
      createdAt: Date.now(),
    });

    // Build URLs
    const origin = req.headers.get('origin') || 'http://localhost:3000';
    const redirectUrl = `${origin}/api/payment/verify?paymentId=${paymentId}&userId=${userId}`;
    const cancelUrl = `${origin}/api/payment/verify?paymentId=${paymentId}&userId=${userId}&cancelled=true`;
    const webhookUrl = `${origin}/api/payment/webhook`;

    // Build request body per Bohudur docs
    const requestBody: Record<string, any> = {
      full_name: fullName,
      email: userEmail,
      amount: Number(amount),
      return_type: 'GET',
      redirect_url: redirectUrl,
      cancel_url: cancelUrl,
    };

    // Optional fields — only include if webhook URL is valid
    if (webhookUrl.startsWith('https://')) {
      requestBody.webhook = {
        success: webhookUrl,
        cancel: webhookUrl,
      };
    }

    // Optional metadata
    requestBody.metadata = {
      paymentId,
      userId,
      packageId,
      coins: Number(coins),
    };

    console.log('[Bohudur] Creating payment:', { amount: Number(amount), redirectUrl, keyLen: apiKey.length });

    // Call Bohudur create payment API
    const bohudurRes = await fetch(`${BOHUDUR_BASE}/create/v2/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'AH-BOHUDUR-API-KEY': apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    const bohudurData = await bohudurRes.json();
    console.log('[Bohudur] Response:', { code: bohudurData.responseCode, status: bohudurData.status, message: bohudurData.message });

    if (bohudurData.status === 'success' && bohudurData.responseCode === 200) {
      // Update payment record with paymentkey
      await db.update(`payments/${paymentId}`, {
        paymentkey: bohudurData.paymentkey,
      });

      return NextResponse.json({
        success: true,
        payment_url: bohudurData.payment_url,
        paymentkey: bohudurData.paymentkey,
        paymentId,
      });
    } else {
      // Mark payment as failed
      await db.update(`payments/${paymentId}`, { status: 'failed' });

      const errorCode = bohudurData.responseCode;
      const errorMsg = bohudurData.message || 'Failed to create payment session';

      // Map known error codes to user-friendly Bengali messages
      let userMessage = errorMsg;
      if (errorCode === 3013) {
        userMessage = 'Bohudur API Key সঠিক নয় বা নিষ্ক্রিয়। Admin কে Settings থেকে সঠিক API Key দিতে হবে।';
      } else if (errorCode === 3000) {
        userMessage = 'API Key পাওয়া যায়নি। Admin কে Settings থেকে Bohudur API Key সেট করতে হবে।';
      } else if (errorCode === 3005 || errorCode === 3015) {
        userMessage = 'পেমেন্টের পরিমাণ সঠিক নয়।';
      } else if (errorCode === 3007 || errorCode === 3008) {
        userMessage = 'রিটার্ন/ক্যান্সেল URL সঠিক নয়। অ্যাপটি HTTPS এ হোস্ট করতে হবে।';
      }

      return NextResponse.json(
        { error: userMessage, bohudurCode: errorCode },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[Bohudur] POST /api/payment error:', error);
    return NextResponse.json({ error: 'Payment creation failed' }, { status: 500 });
  }
}
