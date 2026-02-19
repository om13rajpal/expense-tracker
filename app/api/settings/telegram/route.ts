/**
 * Telegram Settings API
 *
 * GET    - Return current telegram link status and notification preferences
 * POST   - Generate 6-digit link code (stored with 10min TTL)
 * PATCH  - Update notification preferences
 * DELETE - Unlink telegram account
 */
import { NextRequest, NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/mongodb';
import { corsHeaders, handleOptions, withAuth } from '@/lib/middleware';

// ─── GET: Telegram link status ──────────────────────────────────────

export const GET = withAuth(async (_req, { user }) => {
  try {
    const db = await getMongoDb();
    const settings = await db.collection('user_settings').findOne({ userId: user.userId });

    const linked = !!settings?.telegramChatId;

    return NextResponse.json(
      {
        success: true,
        linked,
        username: settings?.telegramUsername || undefined,
        linkedAt: settings?.telegramLinkedAt || undefined,
        notifications: settings?.telegramNotifications || {
          budgetBreach: true,
          weeklyDigest: true,
          renewalAlert: true,
          aiInsights: true,
          dailySummary: true,
        },
      },
      { headers: corsHeaders() }
    );
  } catch (error) {
    console.error('Telegram settings GET error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch telegram settings.' },
      { status: 500, headers: corsHeaders() }
    );
  }
});

// ─── POST: Generate link code ───────────────────────────────────────

export const POST = withAuth(async (_req, { user }) => {
  try {
    const db = await getMongoDb();

    // Check if already linked
    const settings = await db.collection('user_settings').findOne({ userId: user.userId });
    if (settings?.telegramChatId) {
      return NextResponse.json(
        { success: false, message: 'Telegram is already linked. Unlink first.' },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + 10 * 60 * 1000); // 10 minutes

    // Ensure TTL index exists
    const col = db.collection('telegram_link_tokens');
    try {
      await col.createIndex({ createdAt: 1 }, { expireAfterSeconds: 600 });
    } catch {
      // Index may already exist
    }

    // Remove any existing tokens for this user
    await col.deleteMany({ userId: user.userId });

    // Insert new token
    await col.insertOne({
      userId: user.userId,
      code,
      createdAt,
    });

    return NextResponse.json(
      {
        success: true,
        code,
        expiresAt: expiresAt.toISOString(),
      },
      { status: 201, headers: corsHeaders() }
    );
  } catch (error) {
    console.error('Telegram link code error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to generate link code.' },
      { status: 500, headers: corsHeaders() }
    );
  }
});

// ─── PATCH: Update notification preferences ─────────────────────────

export const PATCH = withAuth(async (req, { user }) => {
  try {
    const body = await req.json();
    const notifications = body.notifications;

    if (!notifications || typeof notifications !== 'object') {
      return NextResponse.json(
        { success: false, message: 'notifications object is required.' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const allowed = ['budgetBreach', 'weeklyDigest', 'renewalAlert', 'aiInsights', 'dailySummary'];
    const update: Record<string, boolean> = {};
    for (const key of allowed) {
      if (typeof notifications[key] === 'boolean') {
        update[`telegramNotifications.${key}`] = notifications[key];
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { success: false, message: 'No valid notification preferences provided.' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const db = await getMongoDb();
    await db.collection('user_settings').updateOne(
      { userId: user.userId },
      { $set: update },
      { upsert: true }
    );

    return NextResponse.json(
      { success: true },
      { headers: corsHeaders() }
    );
  } catch (error) {
    console.error('Telegram notification prefs error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update notification preferences.' },
      { status: 500, headers: corsHeaders() }
    );
  }
});

// ─── DELETE: Unlink telegram ────────────────────────────────────────

export const DELETE = withAuth(async (_req, { user }) => {
  try {
    const db = await getMongoDb();
    await db.collection('user_settings').updateOne(
      { userId: user.userId },
      {
        $unset: {
          telegramChatId: '',
          telegramUsername: '',
          telegramLinkedAt: '',
        },
      }
    );

    return NextResponse.json(
      { success: true },
      { headers: corsHeaders() }
    );
  } catch (error) {
    console.error('Telegram unlink error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to unlink telegram.' },
      { status: 500, headers: corsHeaders() }
    );
  }
});

// ─── OPTIONS: CORS preflight ────────────────────────────────────────

export const OPTIONS = handleOptions;
