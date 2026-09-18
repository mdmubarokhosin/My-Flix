import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-server';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'edge';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const { id } = await params;
    const settings = await db.get<Record<string, any>>('settings') || {};
    const existing = (settings.categories as Record<string, any>[]) || [];

    const filtered = existing.filter(cat => cat.id !== id);

    await db.update('settings', { categories: filtered });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/categories/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}
