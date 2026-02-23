/**
 * Bucket List Reorder API
 * Bulk-update sortOrder fields for drag-and-drop reordering.
 *
 * PUT /api/bucket-list/reorder
 * Body: { items: [{ id: string, sortOrder: number }] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getMongoDb } from '@/lib/mongodb';
import { corsHeaders, handleOptions, withAuth } from '@/lib/middleware';

const COLLECTION = 'bucket_list';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * PUT /api/bucket-list/reorder
 * Bulk update sortOrder for multiple bucket list items.
 * Validates all IDs are valid ObjectIds before performing bulkWrite.
 */
export async function PUT(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const body = await req.json();
      const { items } = body;

      if (!Array.isArray(items) || items.length === 0) {
        return NextResponse.json(
          { success: false, error: 'items array is required' },
          { status: 400, headers: corsHeaders() }
        );
      }

      // Validate all IDs are valid ObjectIds
      const operations = [];
      for (const item of items) {
        if (!item.id || typeof item.id !== 'string') {
          return NextResponse.json(
            { success: false, error: 'Each item must have a valid id' },
            { status: 400, headers: corsHeaders() }
          );
        }

        if (typeof item.sortOrder !== 'number') {
          return NextResponse.json(
            { success: false, error: 'Each item must have a numeric sortOrder' },
            { status: 400, headers: corsHeaders() }
          );
        }

        let objectId: ObjectId;
        try {
          objectId = new ObjectId(item.id);
        } catch {
          return NextResponse.json(
            { success: false, error: `Invalid id: ${item.id}` },
            { status: 400, headers: corsHeaders() }
          );
        }

        operations.push({
          updateOne: {
            filter: { _id: objectId, userId: user.userId },
            update: {
              $set: {
                sortOrder: item.sortOrder,
                updatedAt: new Date().toISOString(),
              },
            },
          },
        });
      }

      const db = await getMongoDb();
      const col = db.collection(COLLECTION);
      const result = await col.bulkWrite(operations);

      return NextResponse.json(
        {
          success: true,
          modifiedCount: result.modifiedCount,
        },
        { headers: corsHeaders() }
      );
    } catch (error) {
      console.error('Error in PUT /api/bucket-list/reorder:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to reorder items' },
        { status: 500, headers: corsHeaders() }
      );
    }
  })(request);
}
