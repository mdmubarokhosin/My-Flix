import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-server';

export const runtime = 'edge';

export async function GET() {
  try {
    const data = await db.get<Record<string, any>>('shorts');
    const shorts = db.objectToArray<{
      title: string;
      url: string;
      thumbnail?: string;
      views: number;
      createdAt: number;
    }>(data);
    shorts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return NextResponse.json(shorts);
  } catch (error) {
    console.error('GET /api/shorts error:', error);
    return NextResponse.json({ error: 'Failed to fetch shorts' }, { status: 500 });
  }
}
