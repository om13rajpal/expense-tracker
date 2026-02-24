/**
 * Hourly Rate Settings API
 * Manages the user's "money in hours" configuration, which converts
 * expenses into working-hours equivalent for perspective.
 * Also controls the ghost budget feature toggle.
 *
 * Requires JWT authentication via the `auth-token` HTTP-only cookie.
 *
 * Endpoints:
 *   GET  /api/settings/hourly-rate - Retrieve current hourly rate settings
 *   POST /api/settings/hourly-rate - Create or update hourly rate settings
 *
 * MongoDB collection: `user_settings`
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, corsHeaders, handleOptions } from '@/lib/middleware';
import { getMongoDb } from '@/lib/mongodb';

/** @constant MongoDB collection name for user settings documents. */
const COLLECTION = 'user_settings';

/**
 * OPTIONS /api/settings/hourly-rate
 * CORS preflight handler. Returns allowed methods and headers.
 */
export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/settings/hourly-rate
 * Retrieve the authenticated user's hourly rate configuration.
 * Computes the hourly rate on-the-fly from monthlyIncome / workingHoursPerMonth.
 * Defaults to 176 working hours per month (22 days * 8 hours) if not set.
 *
 * @requires Authentication - JWT via `auth-token` cookie
 *
 * @returns {200} `{ success: true, enabled: boolean, monthlyIncome: number, workingHoursPerMonth: number, computedRate: number, ghostBudgetEnabled: boolean }`
 * @returns {500} `{ success: false, error: string }` - Server error
 */
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

/**
 * POST /api/settings/hourly-rate
 * Create or update the user's hourly rate settings via upsert.
 * Computes the effective hourly rate from monthlyIncome / workingHoursPerMonth.
 *
 * @requires Authentication - JWT via `auth-token` cookie
 *
 * @body {number} [monthlyIncome] - Gross monthly income in INR (defaults to 0)
 * @body {number} [workingHoursPerMonth] - Working hours per month (defaults to 176)
 * @body {boolean} [enabled] - Toggle the "money in hours" display feature
 * @body {boolean} [ghostBudgetEnabled] - Toggle the ghost budget feature
 *
 * @returns {200} `{ success: true, enabled, monthlyIncome, workingHoursPerMonth, computedRate, ghostBudgetEnabled }`
 * @returns {500} `{ success: false, error: string }` - Server error
 */
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
