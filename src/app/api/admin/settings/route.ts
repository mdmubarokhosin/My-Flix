import { NextRequest, NextResponse } from 'next/server';
import { db, getBody } from '@/lib/firebase-server';
import { requireAdmin, setAdminPassword, verifyPassword } from '@/lib/auth';

export const runtime = 'edge';

// GET /api/admin/settings — fetch all settings (sensitive keys are NOT stripped
// here since this route is admin-only; client-side uses /api/settings for the
// public version with sensitive keys stripped).
export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const settings = await db.get<Record<string, unknown>>('settings');
    // Never return the actual hash or plaintext password to the client.
    if (settings) {
      delete settings.adminPassword;
      delete settings.adminPasswordHash;
    }
    return NextResponse.json(settings || {});
  } catch (error) {
    console.error('GET /api/admin/settings error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 },
    );
  }
}

// PUT /api/admin/settings — update settings (merge).
// Password change requires `currentPassword` to be supplied AND verified.
export async function PUT(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const body = await getBody<
      Record<string, unknown> & {
        currentPassword?: string;
        newPassword?: string;
      }
    >(req);

    const {
      currentPassword,
      newPassword,
      adminPassword: legacyNewPassword,
      ...data
    } = body;

    // Build update object, only allow known setting keys.
    const allowedKeys = [
      'tmdbApiKey',
      'imdbApiKey',
      'bohudurApiKey',
      'telegramBotToken',
      'defaultLanguage',
      'coinsPerAd',
      'adsNotice',
    ];

    const updateData: Record<string, unknown> = {};
    for (const key of allowedKeys) {
      if (data[key] !== undefined) {
        if (key === 'coinsPerAd') {
          updateData[key] = Number(data[key]) || 0;
        } else {
          updateData[key] = data[key];
        }
      }
    }

    // Handle password change. Two paths:
    //   (a) `newPassword` (preferred) — requires `currentPassword`.
    //   (b) `adminPassword` (legacy) — also requires `currentPassword` if a
    //       hashed password exists. If no password is configured yet (first
    //       setup), we allow it without `currentPassword`.
    const desiredNewPassword = typeof newPassword === 'string' ? newPassword : (typeof legacyNewPassword === 'string' ? legacyNewPassword : '');
    if (desiredNewPassword) {
      if (desiredNewPassword.length < 6) {
        return NextResponse.json(
          { error: 'Password must be at least 6 characters long' },
          { status: 400 },
        );
      }
      const settings = await db.get<Record<string, unknown>>('settings');
      const existingHash = settings?.adminPasswordHash as string | undefined;
      const existingPlain = settings?.adminPassword as string | undefined;

      if (existingHash || existingPlain) {
        // Verify currentPassword against the stored hash/plaintext.
        const provided = typeof currentPassword === 'string' ? currentPassword : '';
        const ok = existingHash
          ? await verifyPassword(provided, existingHash)
          : provided === existingPlain;
        if (!ok) {
          return NextResponse.json(
            { error: 'Current password is incorrect' },
            { status: 403 },
          );
        }
      }
      // Set the new password as a bcrypt hash (and clear legacy plaintext).
      await setAdminPassword(desiredNewPassword);
    }

    if (Object.keys(updateData).length === 0 && !desiredNewPassword) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 },
      );
    }

    if (Object.keys(updateData).length > 0) {
      await db.update('settings', updateData);
    }
    const updated = await db.get<Record<string, unknown>>('settings');
    if (updated) {
      delete updated.adminPassword;
      delete updated.adminPasswordHash;
    }
    return NextResponse.json({ success: true, settings: updated });
  } catch (error) {
    console.error('PUT /api/admin/settings error:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 },
    );
  }
}
