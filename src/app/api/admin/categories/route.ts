import { NextRequest, NextResponse } from 'next/server';
import { db, getBody } from '@/lib/firebase-server';
import { requireAdmin } from '@/lib/auth';
import type { Category } from '@/lib/types';

export const runtime = 'edge';

// GET /api/admin/categories — list all categories
export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const categories = await db.get<Category[]>('settings/categories');
    return NextResponse.json(categories || []);
  } catch (error) {
    console.error('GET /api/admin/categories error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 },
    );
  }
}

// POST /api/admin/categories — replace all categories
export async function POST(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const body = await getBody<{ categories?: Category[] }>(req);
    const { adminPassword, categories } = body as Record<string, unknown> & { categories?: Category[] };

    if (!Array.isArray(categories)) {
      return NextResponse.json(
        { error: 'categories must be an array' },
        { status: 400 },
      );
    }

    for (const cat of categories) {
      if (!cat.id || !cat.name || !cat.icon) {
        return NextResponse.json(
          { error: 'Each category must have id, name, and icon' },
          { status: 400 },
        );
      }
    }

    await db.set('settings/categories', categories);
    return NextResponse.json({ success: true, categories }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/categories error:', error);
    return NextResponse.json(
      { error: 'Failed to update categories' },
      { status: 500 },
    );
  }
}

// PUT /api/admin/categories — replace all categories (alias for POST)
export async function PUT(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const body = await getBody<{ categories?: Category[] }>(req);
    const { adminPassword, categories } = body as Record<string, unknown> & { categories?: Category[] };

    if (!Array.isArray(categories)) {
      return NextResponse.json(
        { error: 'categories must be an array' },
        { status: 400 },
      );
    }

    for (const cat of categories) {
      if (!cat.id || !cat.name || !cat.icon) {
        return NextResponse.json(
          { error: 'Each category must have id, name, and icon' },
          { status: 400 },
        );
      }
    }

    await db.set('settings/categories', categories);
    return NextResponse.json({ success: true, categories });
  } catch (error) {
    console.error('PUT /api/admin/categories error:', error);
    return NextResponse.json(
      { error: 'Failed to update categories' },
      { status: 500 },
    );
  }
}
