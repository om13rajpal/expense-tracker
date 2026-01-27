/**
 * Budget API endpoints
 * Handles budget retrieval and updates using MongoDB
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, corsHeaders, handleOptions } from '@/lib/middleware';
import { getMongoDb } from '@/lib/mongodb';
import { DEFAULT_BUDGETS } from '@/lib/budget-mapping';

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/budgets
 * Retrieve budgets for the authenticated user
 */
export async function GET(request: NextRequest) {
  return withAuth(async (_req, { user }) => {
    try {
      const db = await getMongoDb();
      const doc = await db.collection('budgets').findOne({ userId: user.userId });

      return NextResponse.json(
        {
          success: true,
          budgets: doc?.budgets || DEFAULT_BUDGETS,
          updatedAt: doc?.updatedAt || null,
        },
        { headers: corsHeaders() }
      );
    } catch (error) {
      console.error('Error in GET /api/budgets:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to load budgets' },
        { status: 500, headers: corsHeaders() }
      );
    }
  })(request);
}

/**
 * POST /api/budgets
 * Update all budgets for the authenticated user
 */
export async function POST(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const body = await req.json();
      const { budgets } = body;

      if (!budgets || typeof budgets !== 'object') {
        return NextResponse.json(
          { success: false, error: 'Invalid budgets data' },
          { status: 400, headers: corsHeaders() }
        );
      }

      for (const [category, amount] of Object.entries(budgets)) {
        if (typeof amount !== 'number' || amount < 0) {
          return NextResponse.json(
            { success: false, error: `Invalid budget amount for ${category}` },
            { status: 400, headers: corsHeaders() }
          );
        }
      }

      const updatedAt = new Date().toISOString();
      const db = await getMongoDb();

      await db.collection('budgets').updateOne(
        { userId: user.userId },
        {
          $set: {
            budgets,
            updatedAt,
            userId: user.userId,
          },
        },
        { upsert: true }
      );

      return NextResponse.json(
        {
          success: true,
          message: 'Budgets updated successfully',
          budgets,
          updatedAt,
        },
        { headers: corsHeaders() }
      );
    } catch (error) {
      console.error('Error in POST /api/budgets:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update budgets' },
        { status: 500, headers: corsHeaders() }
      );
    }
  })(request);
}

/**
 * PUT /api/budgets
 * Update a single budget category for the authenticated user
 */
export async function PUT(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const body = await req.json();
      const { category, amount } = body;

      if (!category || typeof category !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Invalid category' },
          { status: 400, headers: corsHeaders() }
        );
      }

      if (typeof amount !== 'number' || amount < 0) {
        return NextResponse.json(
          { success: false, error: 'Invalid amount' },
          { status: 400, headers: corsHeaders() }
        );
      }

      const updatedAt = new Date().toISOString();
      const db = await getMongoDb();

      const existing = await db.collection('budgets').findOne({ userId: user.userId });
      const currentBudgets = existing?.budgets || DEFAULT_BUDGETS;
      const updatedBudgets = { ...currentBudgets, [category]: amount };

      await db.collection('budgets').updateOne(
        { userId: user.userId },
        {
          $set: {
            budgets: updatedBudgets,
            updatedAt,
            userId: user.userId,
          },
        },
        { upsert: true }
      );

      return NextResponse.json(
        {
          success: true,
          message: `Budget for ${category} updated successfully`,
          budgets: updatedBudgets,
          updatedAt,
        },
        { headers: corsHeaders() }
      );
    } catch (error) {
      console.error('Error in PUT /api/budgets:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update budget' },
        { status: 500, headers: corsHeaders() }
      );
    }
  })(request);
}
