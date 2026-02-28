/**
 * Image Upload API endpoint for bucket list items.
 *
 * POST - Upload an image file (JPEG, PNG, WebP, GIF) up to 5 MB.
 *        Optionally links the uploaded image to a bucket list item
 *        by setting its `coverImageUrl` field in MongoDB.
 *
 * Returns the public URL path of the saved image on success.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getMongoDb } from '@/lib/mongodb';
import { corsHeaders, handleOptions, withAuth } from '@/lib/middleware';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

/** Maximum allowed file size in bytes (5 MB). */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/** Set of accepted MIME types for uploaded images. */
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

/** Map from MIME type to file extension. */
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/** Directory under `public/` where uploaded images are stored. */
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'bucket-list');

export async function OPTIONS() {
  return handleOptions();
}

/**
 * POST /api/upload
 *
 * Accepts multipart form data with the following fields:
 * - `file`   (required) – The image file to upload.
 * - `itemId` (optional) – A bucket list item ID. When provided the item's
 *   `coverImageUrl` is updated in MongoDB to point to the new image.
 *
 * @returns `{ success: true, url: "/uploads/bucket-list/<filename>" }` on success.
 */
export async function POST(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      // --- Parse multipart form data ---
      let formData: FormData;
      try {
        formData = await req.formData();
      } catch {
        return NextResponse.json(
          { success: false, error: 'Invalid form data. Expected multipart/form-data.' },
          { status: 400, headers: corsHeaders() }
        );
      }

      const file = formData.get('file');
      const itemId = formData.get('itemId') as string | null;

      // --- Validate file presence ---
      if (!file || !(file instanceof Blob)) {
        return NextResponse.json(
          { success: false, error: 'No file provided. Include a "file" field.' },
          { status: 400, headers: corsHeaders() }
        );
      }

      // --- Validate MIME type ---
      if (!ALLOWED_TYPES.has(file.type)) {
        return NextResponse.json(
          {
            success: false,
            error: `Unsupported file type "${file.type}". Allowed types: JPEG, PNG, WebP, GIF.`,
          },
          { status: 400, headers: corsHeaders() }
        );
      }

      // --- Validate file size ---
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            success: false,
            error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is 5 MB.`,
          },
          { status: 400, headers: corsHeaders() }
        );
      }

      // --- Build a collision-resistant filename ---
      const ext = MIME_TO_EXT[file.type] ?? 'bin';
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 10);
      const filename = `${user.userId}_${timestamp}_${random}.${ext}`;

      // --- Ensure the upload directory exists ---
      await mkdir(UPLOAD_DIR, { recursive: true });

      // --- Write the file to disk ---
      const buffer = Buffer.from(await file.arrayBuffer());
      const filePath = path.join(UPLOAD_DIR, filename);
      await writeFile(filePath, buffer);

      // --- Public URL path served by Next.js static file serving ---
      const url = `/uploads/bucket-list/${filename}`;

      // --- Optionally update the bucket list item's cover image ---
      if (itemId && typeof itemId === 'string') {
        let objectId: ObjectId;
        try {
          objectId = new ObjectId(itemId);
        } catch {
          // Still return success for the upload, but warn about the invalid ID
          return NextResponse.json(
            {
              success: true,
              url,
              warning: 'File uploaded but itemId is not a valid ObjectId. Item was not updated.',
            },
            { headers: corsHeaders() }
          );
        }

        const db = await getMongoDb();
        await db.collection('bucket_list').updateOne(
          { _id: objectId, userId: user.userId },
          { $set: { coverImageUrl: url, updatedAt: new Date().toISOString() } }
        );
      }

      return NextResponse.json(
        { success: true, url },
        { headers: corsHeaders() }
      );
    } catch (error) {
      console.error('Error in POST /api/upload:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to upload file' },
        { status: 500, headers: corsHeaders() }
      );
    }
  })(request);
}
