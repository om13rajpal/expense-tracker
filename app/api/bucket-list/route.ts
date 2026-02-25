/**
 * Bucket List API endpoints
 * CRUD operations for wishlist/savings items with gamification integration.
 *
 * GET    - List all items for user with computed summary stats
 * POST   - Create a new bucket list item (awards 10 XP)
 * PUT    - Update an item (awards 50 XP on completion, 25 XP milestone every 5th)
 * DELETE - Delete an item by query param ?id=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getMongoDb } from '@/lib/mongodb';
import { corsHeaders, handleOptions, withAuth } from '@/lib/middleware';
import { awardXP, checkBadgeUnlocks } from '@/lib/gamification';
import type { BucketListItem, BucketListSummary } from '@/lib/types';

const COLLECTION = 'bucket_list';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/bucket-list
 * Retrieve all bucket list items for the authenticated user, sorted by sortOrder.
 * Returns items array and a summary with totals and progress.
 */
export async function GET(request: NextRequest) {
  return withAuth(async (_req, { user }) => {
    try {
      const db = await getMongoDb();
      const col = db.collection(COLLECTION);

      const docs = await col
        .find({ userId: user.userId })
        .sort({ sortOrder: 1, createdAt: -1 })
        .toArray();

      const items: BucketListItem[] = docs.map((doc) => ({
        id: doc._id.toString(),
        userId: doc.userId,
        name: doc.name,
        description: doc.description,
        category: doc.category,
        priority: doc.priority,
        status: doc.status,
        targetAmount: doc.targetAmount,
        savedAmount: doc.savedAmount,
        monthlyAllocation: doc.monthlyAllocation,
        targetDate: doc.targetDate,
        sortOrder: doc.sortOrder,
        priceHistory: Array.isArray(doc.priceHistory) ? doc.priceHistory : [],
        dealAlerts: Array.isArray(doc.dealAlerts) ? doc.dealAlerts : [],
        imageUrl: doc.imageUrl,
        aiStrategy: doc.aiStrategy,
        aiStrategyGeneratedAt: doc.aiStrategyGeneratedAt,
        coverImageUrl: doc.coverImageUrl,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      }));

      // Compute summary stats
      const totalItems = items.length;
      const completedItems = items.filter((i) => i.status === 'completed').length;
      const totalTargetAmount = items.reduce((sum, i) => sum + i.targetAmount, 0);
      const totalSavedAmount = items.reduce((sum, i) => sum + i.savedAmount, 0);
      const overallProgress =
        totalTargetAmount > 0
          ? Math.round((totalSavedAmount / totalTargetAmount) * 100)
          : 0;

      const totalMonthlyAllocation = items
        .filter((i) => i.status !== 'completed')
        .reduce((sum, i) => sum + i.monthlyAllocation, 0);

      const summary: BucketListSummary = {
        totalItems,
        completedItems,
        totalTargetAmount,
        totalSavedAmount,
        overallProgress,
        totalMonthlyAllocation,
      };

      return NextResponse.json(
        { success: true, items, summary },
        { headers: corsHeaders() }
      );
    } catch (error) {
      console.error('Error in GET /api/bucket-list:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to load bucket list' },
        { status: 500, headers: corsHeaders() }
      );
    }
  })(request);
}

/**
 * POST /api/bucket-list
 * Create a new bucket list item. Awards 10 XP.
 * Body: { name, targetAmount, category?, priority?, description?, monthlyAllocation?, targetDate? }
 */
export async function POST(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const body = await req.json();
      const {
        name,
        targetAmount,
        category,
        priority,
        description,
        monthlyAllocation,
        targetDate,
        coverImageUrl,
      } = body;

      // Validation
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Name is required' },
          { status: 400, headers: corsHeaders() }
        );
      }

      if (typeof targetAmount !== 'number' || targetAmount <= 0) {
        return NextResponse.json(
          { success: false, error: 'Target amount must be a positive number' },
          { status: 400, headers: corsHeaders() }
        );
      }

      const db = await getMongoDb();
      const col = db.collection(COLLECTION);

      // Determine next sort order
      const lastItem = await col
        .find({ userId: user.userId })
        .sort({ sortOrder: -1 })
        .limit(1)
        .toArray();
      const nextSortOrder = lastItem.length > 0 ? (lastItem[0].sortOrder ?? 0) + 1 : 0;

      const now = new Date().toISOString();

      const doc = {
        userId: user.userId,
        name: name.trim(),
        description: typeof description === 'string' ? description.trim() : undefined,
        category: category || 'other',
        priority: priority || 'medium',
        status: 'wishlist',
        targetAmount,
        savedAmount: 0,
        monthlyAllocation:
          typeof monthlyAllocation === 'number' && monthlyAllocation >= 0
            ? monthlyAllocation
            : 0,
        targetDate: targetDate || undefined,
        sortOrder: nextSortOrder,
        priceHistory: [],
        dealAlerts: [],
        coverImageUrl: typeof coverImageUrl === 'string' && coverImageUrl.trim() ? coverImageUrl.trim() : undefined,
        createdAt: now,
        updatedAt: now,
      };

      const result = await col.insertOne(doc);

      // Award 10 XP for creating a bucket list item
      await awardXP(db, user.userId, 'bucket_list_created', 10, 'Added item to bucket list');
      await checkBadgeUnlocks(db, user.userId, 'bucket_list_created');

      return NextResponse.json(
        {
          success: true,
          item: { ...doc, id: result.insertedId.toString() },
        },
        { status: 201, headers: corsHeaders() }
      );
    } catch (error) {
      console.error('Error in POST /api/bucket-list:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create bucket list item' },
        { status: 500, headers: corsHeaders() }
      );
    }
  })(request);
}

/**
 * PUT /api/bucket-list
 * Update an existing bucket list item.
 * Body: { id, ...fields }
 * If `addAmount` (number) is provided, savedAmount is incremented instead of replaced.
 * If status changes to 'completed', awards 50 XP. Every 5th completion awards 25 XP milestone.
 */
export async function PUT(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const body = await req.json();
      const { id, addAmount, ...fields } = body;

      if (!id || typeof id !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Item id is required' },
          { status: 400, headers: corsHeaders() }
        );
      }

      let objectId: ObjectId;
      try {
        objectId = new ObjectId(id);
      } catch {
        return NextResponse.json(
          { success: false, error: 'Invalid item id' },
          { status: 400, headers: corsHeaders() }
        );
      }

      const db = await getMongoDb();
      const col = db.collection(COLLECTION);

      // Fetch current item to check status change
      const currentItem = await col.findOne({ _id: objectId, userId: user.userId });
      if (!currentItem) {
        return NextResponse.json(
          { success: false, error: 'Bucket list item not found' },
          { status: 404, headers: corsHeaders() }
        );
      }

      const now = new Date().toISOString();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateOps: Record<string, any> = {};

      // Build $set from allowed fields
      const allowedFields = [
        'name',
        'description',
        'category',
        'priority',
        'status',
        'targetAmount',
        'savedAmount',
        'monthlyAllocation',
        'targetDate',
        'sortOrder',
        'coverImageUrl',
      ];

      const setFields: Record<string, unknown> = { updatedAt: now };
      for (const key of allowedFields) {
        if (fields[key] !== undefined) {
          setFields[key] = fields[key];
        }
      }
      updateOps.$set = setFields;

      // If addAmount is provided, increment savedAmount instead of setting it
      if (typeof addAmount === 'number' && addAmount !== 0) {
        updateOps.$inc = { savedAmount: addAmount };
        // Remove savedAmount from $set to avoid conflict
        delete setFields.savedAmount;
      }

      const result = await col.findOneAndUpdate(
        { _id: objectId, userId: user.userId },
        updateOps,
        { returnDocument: 'after' }
      );

      if (!result) {
        return NextResponse.json(
          { success: false, error: 'Bucket list item not found' },
          { status: 404, headers: corsHeaders() }
        );
      }

      // Check if status changed to 'completed'
      const wasCompleted = currentItem.status === 'completed';
      const isNowCompleted = result.status === 'completed';

      if (!wasCompleted && isNowCompleted) {
        // Award 50 XP for completing a bucket list item
        await awardXP(db, user.userId, 'bucket_list_completed', 50, `Completed bucket list item: ${result.name}`);

        // Check milestone: every 5th completion awards 25 bonus XP
        const completedCount = await col.countDocuments({
          userId: user.userId,
          status: 'completed',
        });
        if (completedCount > 0 && completedCount % 5 === 0) {
          await awardXP(
            db,
            user.userId,
            'bucket_list_milestone',
            25,
            `Bucket list milestone: ${completedCount} items completed!`
          );
        }

        await checkBadgeUnlocks(db, user.userId, 'bucket_list_completed');
      }

      const item: BucketListItem = {
        id: result._id.toString(),
        userId: result.userId,
        name: result.name,
        description: result.description,
        category: result.category,
        priority: result.priority,
        status: result.status,
        targetAmount: result.targetAmount,
        savedAmount: result.savedAmount,
        monthlyAllocation: result.monthlyAllocation,
        targetDate: result.targetDate,
        sortOrder: result.sortOrder,
        priceHistory: Array.isArray(result.priceHistory) ? result.priceHistory : [],
        dealAlerts: Array.isArray(result.dealAlerts) ? result.dealAlerts : [],
        imageUrl: result.imageUrl,
        aiStrategy: result.aiStrategy,
        aiStrategyGeneratedAt: result.aiStrategyGeneratedAt,
        coverImageUrl: result.coverImageUrl,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      };

      return NextResponse.json(
        { success: true, item },
        { headers: corsHeaders() }
      );
    } catch (error) {
      console.error('Error in PUT /api/bucket-list:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update bucket list item' },
        { status: 500, headers: corsHeaders() }
      );
    }
  })(request);
}

/**
 * DELETE /api/bucket-list?id=xxx
 * Delete a bucket list item by id (query param).
 */
export async function DELETE(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const { searchParams } = new URL(req.url);
      const id = searchParams.get('id');

      if (!id || typeof id !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Item id is required' },
          { status: 400, headers: corsHeaders() }
        );
      }

      let objectId: ObjectId;
      try {
        objectId = new ObjectId(id);
      } catch {
        return NextResponse.json(
          { success: false, error: 'Invalid item id' },
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
      console.error('Error in DELETE /api/bucket-list:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete bucket list item' },
        { status: 500, headers: corsHeaders() }
      );
    }
  })(request);
}
