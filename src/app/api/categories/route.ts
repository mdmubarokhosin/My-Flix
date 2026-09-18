import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-server';
import { DEFAULT_CATEGORIES } from '@/lib/types';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'edge';

export async function GET() {
  try {
    const settings = await db.get<{ categories?: unknown[] }>('settings');
    let categories = settings?.categories;

    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      categories = DEFAULT_CATEGORIES;
    }

    const result = categories.map((cat: any, idx: number) => ({
      id: cat?.id || cat?.name?.toLowerCase().replace(/\s+/g, '-') || idx.toString(),
      name: cat?.name || '',
      icon: cat?.icon || 'fas fa-folder',
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/categories error:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const settings = await db.get<Record<string, any>>('settings') || {};
    let existing = (settings.categories as Record<string, any>[]) || [];

    if (!Array.isArray(existing)) existing = [];

    const catId = body.id || body.name?.toLowerCase().replace(/\s+/g, '-') || db.generateId();
    const categoryObj = {
      id: catId,
      name: body.name || '',
      icon: body.icon || 'Tags',
    };

    const index = existing.findIndex((c) => c.id === catId);
    if (index >= 0) {
      existing[index] = categoryObj;
    } else {
      existing.push(categoryObj);
    }

    await db.update('settings', { categories: existing });

    return NextResponse.json(categoryObj, { status: 200 });
  } catch (error) {
    console.error('POST /api/categories error:', error);
    return NextResponse.json({ error: 'Failed to save category' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { categories } = body;

    if (!Array.isArray(categories)) {
      return NextResponse.json({ error: 'categories array is required' }, { status: 400 });
    }

    await db.update('settings', { categories });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /api/categories error:', error);
    return NextResponse.json({ error: 'Failed to update categories' }, { status: 500 });
  }
}
