/**
 * Friend Profiles API endpoints
 * CRUD operations for manually-added friend profiles used in the leaderboard.
 *
 * GET    - List all friend profiles for the authenticated user
 * POST   - Create a new friend profile
 * PUT    - Update a friend profile
 * DELETE - Delete a friend profile by query param ?id=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getMongoDb } from '@/lib/mongodb';
import { corsHeaders, handleOptions, withAuth } from '@/lib/middleware';

const COLLECTION = 'friend_profiles';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/friends
 * Retrieve all friend profiles for the authenticated user, sorted by createdAt.
 */
export async function GET(request: NextRequest) {
  return withAuth(async (_req, { user }) => {
    try {
      const db = await getMongoDb();
      const col = db.collection(COLLECTION);

      const docs = await col
        .find({ userId: user.userId })
        .sort({ createdAt: -1 })
        .toArray();

      const friends = docs.map((doc) => ({
        id: doc._id.toString(),
        userId: doc.userId,
        name: doc.name,
        avatarColor: doc.avatarColor,
        savingsRate: doc.savingsRate,
        healthScore: doc.healthScore,
        budgetAdherence: doc.budgetAdherence,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      }));

      return NextResponse.json(
        { success: true, friends },
        { headers: corsHeaders() }
      );
    } catch (error) {
      console.error('Error in GET /api/friends:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to load friend profiles' },
        { status: 500, headers: corsHeaders() }
      );
    }
  })(request);
}

/**
 * POST /api/friends
 * Create a new friend profile.
 * Body: { name, avatarColor?, savingsRate, healthScore, budgetAdherence }
 */
export async function POST(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const body = await req.json();
      const { name, avatarColor, savingsRate, healthScore, budgetAdherence } = body;

      // Validation
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Name is required' },
          { status: 400, headers: corsHeaders() }
        );
      }

      if (typeof savingsRate !== 'number' || savingsRate < 0 || savingsRate > 100) {
        return NextResponse.json(
          { success: false, error: 'Savings rate must be a number between 0 and 100' },
          { status: 400, headers: corsHeaders() }
        );
      }

      if (typeof healthScore !== 'number' || healthScore < 0 || healthScore > 100) {
        return NextResponse.json(
          { success: false, error: 'Health score must be a number between 0 and 100' },
          { status: 400, headers: corsHeaders() }
        );
      }

      if (typeof budgetAdherence !== 'number' || budgetAdherence < 0 || budgetAdherence > 100) {
        return NextResponse.json(
          { success: false, error: 'Budget adherence must be a number between 0 and 100' },
          { status: 400, headers: corsHeaders() }
        );
      }

      const db = await getMongoDb();
      const col = db.collection(COLLECTION);

      const now = new Date().toISOString();

      const doc = {
        userId: user.userId,
        name: name.trim(),
        avatarColor: typeof avatarColor === 'string' && avatarColor.trim() ? avatarColor.trim() : '#6366f1',
        savingsRate: Math.round(savingsRate * 10) / 10,
        healthScore: Math.round(healthScore),
        budgetAdherence: Math.round(budgetAdherence * 10) / 10,
        createdAt: now,
        updatedAt: now,
      };

      const result = await col.insertOne(doc);

      return NextResponse.json(
        {
          success: true,
          friend: { ...doc, id: result.insertedId.toString() },
        },
        { status: 201, headers: corsHeaders() }
      );
    } catch (error) {
      console.error('Error in POST /api/friends:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create friend profile' },
        { status: 500, headers: corsHeaders() }
      );
    }
  })(request);
}

/**
 * PUT /api/friends
 * Update an existing friend profile.
 * Body: { id, name?, avatarColor?, savingsRate?, healthScore?, budgetAdherence? }
 */
export async function PUT(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const body = await req.json();
      const { id, ...fields } = body;

      if (!id || typeof id !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Friend profile id is required' },
          { status: 400, headers: corsHeaders() }
        );
      }

      let objectId: ObjectId;
      try {
        objectId = new ObjectId(id);
      } catch {
        return NextResponse.json(
          { success: false, error: 'Invalid friend profile id' },
          { status: 400, headers: corsHeaders() }
        );
      }

      const db = await getMongoDb();
      const col = db.collection(COLLECTION);

      const now = new Date().toISOString();
      const allowedFields = ['name', 'avatarColor', 'savingsRate', 'healthScore', 'budgetAdherence'];

      const setFields: Record<string, unknown> = { updatedAt: now };
      for (const key of allowedFields) {
        if (fields[key] !== undefined) {
          if (key === 'name') {
            if (typeof fields[key] !== 'string' || fields[key].trim().length === 0) continue;
            setFields[key] = fields[key].trim();
          } else if (key === 'avatarColor') {
            if (typeof fields[key] === 'string' && fields[key].trim()) {
              setFields[key] = fields[key].trim();
            }
          } else {
            // Numeric fields: savingsRate, healthScore, budgetAdherence
            const val = Number(fields[key]);
            if (!isNaN(val) && val >= 0 && val <= 100) {
              setFields[key] = key === 'healthScore' ? Math.round(val) : Math.round(val * 10) / 10;
            }
          }
        }
      }

      const result = await col.findOneAndUpdate(
        { _id: objectId, userId: user.userId },
        { $set: setFields },
        { returnDocument: 'after' }
      );

      if (!result) {
        return NextResponse.json(
          { success: false, error: 'Friend profile not found' },
          { status: 404, headers: corsHeaders() }
        );
      }

      const friend = {
        id: result._id.toString(),
        userId: result.userId,
        name: result.name,
        avatarColor: result.avatarColor,
        savingsRate: result.savingsRate,
        healthScore: result.healthScore,
        budgetAdherence: result.budgetAdherence,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      };

      return NextResponse.json(
        { success: true, friend },
        { headers: corsHeaders() }
      );
    } catch (error) {
      console.error('Error in PUT /api/friends:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update friend profile' },
        { status: 500, headers: corsHeaders() }
      );
    }
  })(request);
}

/**
 * DELETE /api/friends?id=xxx
 * Delete a friend profile by id (query param).
 */
export async function DELETE(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const { searchParams } = new URL(req.url);
      const id = searchParams.get('id');

      if (!id || typeof id !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Friend profile id is required' },
          { status: 400, headers: corsHeaders() }
        );
      }

      let objectId: ObjectId;
      try {
        objectId = new ObjectId(id);
      } catch {
        return NextResponse.json(
          { success: false, error: 'Invalid friend profile id' },
          { status: 400, headers: corsHeaders() }
        );
      }

      const db = await getMongoDb();
      const col = db.collection(COLLECTION);

      const result = await col.deleteOne({
        _id: objectId,
        userId: user.userId,
      });

      return NextResponse.json(
        { success: true, deletedCount: result.deletedCount },
        { headers: corsHeaders() }
      );
    } catch (error) {
      console.error('Error in DELETE /api/friends:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete friend profile' },
        { status: 500, headers: corsHeaders() }
      );
    }
  })(request);
}
