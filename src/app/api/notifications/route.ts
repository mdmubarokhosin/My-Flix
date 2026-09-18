import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-server';
import { requireAdmin } from '@/lib/auth';

// GET /api/notifications — সক্রিয় নোটিফিকেশন পড়ুন (ইউজার বা সব)
export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    const all = req.nextUrl.searchParams.get('all') === 'true';

    // Fetching all notifications (including inactive/targeted) requires admin auth
    // Check auth BEFORE fetching data to avoid unnecessary DB reads on unauthorized requests
    if (all) {
      const adminError = await requireAdmin(req);
      if (adminError) return adminError;
    }

    const data = await db.get<any>('notifications');
    const notifications = db.objectToArray<any>(data);

    if (all) {
      return NextResponse.json(notifications.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
    }

    // সাধারণ ইউজার: শুধু সক্রিয় নোটিফিকেশন (global বা targetUserId match)
    const active = notifications.filter((n: any) => {
      if (!n.targetUserId) return true; // global
      if (userId && n.targetUserId === userId) return true;
      return false;
    });

    return NextResponse.json(active.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0)));
  } catch (error) {
    console.error('GET /api/notifications error:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

// POST /api/notifications — নতুন নোটিফিকেশন তৈরি (অ্যাডমিন)
export async function POST(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { type, title, message, link, targetUserId } = body;

    if (!type || !title?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'type, title, message প্রয়োজন' }, { status: 400 });
    }

    if (type === 'action' && !link?.trim()) {
      return NextResponse.json({ error: 'action টাইপে link প্রয়োজন' }, { status: 400 });
    }

    const id = db.generateId();
    const notification = {
      type,
      title: title.trim(),
      message: message.trim(),
      link: type === 'action' ? link.trim() : '',
      targetUserId: targetUserId?.trim() || null,
      createdAt: Date.now(),
      createdBy: 'admin',
    };

    await db.set(`notifications/${id}`, notification);
    return NextResponse.json({ success: true, id, ...notification });
  } catch (error) {
    console.error('POST /api/notifications error:', error);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }
}

// DELETE /api/notifications?id=xxx — নোটিফিকেশন ডিলিট (অ্যাডমিন)
// ডিলিট করলে Firebase real-time listener সাথে সাথে ইউজারের ডায়ালগ বন্ধ করবে
export async function DELETE(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id প্রয়োজন' }, { status: 400 });
    }

    await db.remove(`notifications/${id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/notifications error:', error);
    return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 });
  }
}
