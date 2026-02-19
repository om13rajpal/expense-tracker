import { NextRequest, NextResponse } from 'next/server';
import { withAuth, corsHeaders, handleOptions } from '@/lib/middleware';
import { getMongoDb } from '@/lib/mongodb';

const COLLECTION = 'user_settings';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(request: NextRequest) {
  return withAuth(async (_req, { user }) => {
    try {
      const db = await getMongoDb();
      const doc = await db.collection(COLLECTION).findOne({ userId: user.userId });

      const enabled = doc?.moneyInHoursEnabled === true;
      const monthlyIncome = doc?.hourlyRate?.monthlyIncome ?? 0;
      const workingHoursPerMonth = doc?.hourlyRate?.workingHoursPerMonth ?? 176;
      const computedRate = workingHoursPerMonth > 0 ? monthlyIncome / workingHoursPerMonth : 0;
      const ghostBudgetEnabled = doc?.ghostBudgetEnabled === true;

      return NextResponse.json(
        {
          success: true,
          enabled,
          monthlyIncome,
          workingHoursPerMonth,
          computedRate,
          ghostBudgetEnabled,
        },
        { headers: corsHeaders() }
      );
    } catch (error) {
      console.error('Error in GET /api/settings/hourly-rate:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to load settings' },
        { status: 500, headers: corsHeaders() }
      );
    }
  })(request);
}

export async function POST(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const body = await req.json();
      const { monthlyIncome, workingHoursPerMonth, enabled, ghostBudgetEnabled } = body;

      const income = typeof monthlyIncome === 'number' ? monthlyIncome : 0;
      const hours = typeof workingHoursPerMonth === 'number' && workingHoursPerMonth > 0
        ? workingHoursPerMonth
        : 176;
      const computedRate = hours > 0 ? income / hours : 0;

      const updateFields: Record<string, unknown> = {
        'hourlyRate.monthlyIncome': income,
        'hourlyRate.workingHoursPerMonth': hours,
        'hourlyRate.computed': computedRate,
        updatedAt: new Date().toISOString(),
      };

      if (typeof enabled === 'boolean') {
        updateFields.moneyInHoursEnabled = enabled;
      }
      if (typeof ghostBudgetEnabled === 'boolean') {
        updateFields.ghostBudgetEnabled = ghostBudgetEnabled;
      }

      const db = await getMongoDb();
      await db.collection(COLLECTION).updateOne(
        { userId: user.userId },
        { $set: updateFields },
        { upsert: true }
      );

      return NextResponse.json(
        {
          success: true,
          enabled: enabled ?? false,
          monthlyIncome: income,
          workingHoursPerMonth: hours,
          computedRate,
          ghostBudgetEnabled: ghostBudgetEnabled ?? false,
        },
        { headers: corsHeaders() }
      );
    } catch (error) {
      console.error('Error in POST /api/settings/hourly-rate:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to save settings' },
        { status: 500, headers: corsHeaders() }
      );
    }
  })(request);
}
