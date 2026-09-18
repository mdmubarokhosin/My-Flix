import { NextRequest, NextResponse } from 'next/server';
import { clearAdminCookie } from '@/lib/auth';

export const runtime = 'edge';

// POST /api/admin/logout — clears the admin session cookie.
export async function POST(_req: NextRequest) {
  const res = NextResponse.json({ success: true });
  return clearAdminCookie(res);
}
