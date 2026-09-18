import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-server';
import { validateUserId } from '@/lib/auth';
import { requireUser } from '@/lib/auth-middleware';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireUser(req);
    if ('response' in auth) return auth.response;

    // Determine which user to fetch — only the authenticated user
    const requestedId = req.nextUrl.searchParams.get('id');
    const userId = requestedId || auth.userId;

    // If an id param is provided, it must match the authenticated user
    if (requestedId && requestedId !== auth.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!validateUserId(userId)) {
      return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 });
    }

    const user = await db.get(`users/${userId}`);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Strip sensitive data — limit transactions to last 10, don't return full array
    const userData = user as Record<string, any>;
    const safeUser: Record<string, any> = { id: userId };
    const safeKeys = ['firstName', 'lastName', 'username', 'photoUrl', 'balance', 'purchased', 'favorites', 'lastCheckIn', 'streak', 'adWatchedToday', 'lastAdDate', 'theme', 'isTelegramUser', 'isPremium', 'languageCode', 'createdAt', 'lastLogin'];
    for (const key of safeKeys) {
      if (userData[key] !== undefined) {
        safeUser[key] = userData[key];
      }
    }
    // Limit transactions to last 10
    const txns = Array.isArray(userData.transactions) ? userData.transactions : [];
    safeUser.transactions = txns.slice(0, 10);
    // Don't expose giftHistory

    return NextResponse.json(safeUser);
  } catch (error) {
    console.error('GET /api/user error:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { id, firstName, lastName, username, photoUrl } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Check if user exists
    const existing = await db.get(`users/${id}`);
    if (existing) {
      return NextResponse.json({ id, ...existing });
    }

    // Create new user
    const newUser = {
      firstName: firstName || '',
      lastName: lastName || '',
      username: username || '',
      photoUrl: photoUrl || '',
      balance: 0,
      purchased: [],
      favorites: [],
      lastCheckIn: null,
      streak: 0,
      adWatchedToday: 0,
      lastAdDate: null,
      transactions: [],
      giftHistory: [],
      createdAt: Date.now(),
      theme: 'dark',
    };

    await db.set(`users/${id}`, newUser);
    return NextResponse.json({ id, ...newUser }, { status: 201 });
  } catch (error) {
    console.error('POST /api/user error:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    // Auth check — expects ?userId=xxx in query params so the body is not consumed
    const auth = await requireUser(req);
    if ('response' in auth) return auth.response;

    const { ...updates } = await req.json();
    const userId = auth.userId; // Force use authenticated user's ID

    // Only allow updating safe profile fields
    // Do NOT allow updating: balance, purchased, favorites, isBanned
    const allowed = ['firstName', 'lastName', 'username', 'photoUrl', 'theme'];
    const updateData: Record<string, any> = {};
    for (const key of allowed) {
      if (updates[key] !== undefined) {
        updateData[key] = updates[key];
      }
    }

    await db.update(`users/${userId}`, updateData);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /api/user error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
