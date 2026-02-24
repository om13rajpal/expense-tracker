/**
 * Bucket List Price Lookup API
 * Uses Perplexity Sonar for real-time product price search with caching.
 *
 * POST /api/bucket-list/price
 * Body: { itemName: string, itemId?: string }
 *
 * - Checks bucket_list_price_cache first (24h TTL)
 * - Falls back to Perplexity Sonar search on cache miss
 * - Rate limited: 20 requests/hour/user
 * - Optionally updates the bucket_list item's priceHistory and dealAlerts
 */

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getMongoDb } from '@/lib/mongodb';
import { corsHeaders, handleOptions, withAuth } from '@/lib/middleware';
import { searchProductPrice } from '@/lib/perplexity';
import { checkRateLimit } from '@/lib/rate-limit';
import type { PriceSnapshot, DealAlert } from '@/lib/types';

const CACHE_COLLECTION = 'bucket_list_price_cache';
const BUCKET_COLLECTION = 'bucket_list';
const RATE_LIMIT_ACTION = 'bucket_list_price';
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function OPTIONS() {
  return handleOptions();
}

/**
 * POST /api/bucket-list/price
 * Search for current prices of a product. Results are cached for 24 hours.
 * If itemId is provided, updates the bucket list item's priceHistory and dealAlerts.
 */
export async function POST(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const body = await req.json();
      const { itemName, itemId } = body;

      if (!itemName || typeof itemName !== 'string' || itemName.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'itemName is required' },
          { status: 400, headers: corsHeaders() }
        );
      }

      const db = await getMongoDb();

      // Rate limit check
      const allowed = await checkRateLimit(
        db,
        user.userId,
        RATE_LIMIT_ACTION,
        RATE_LIMIT_MAX,
        RATE_LIMIT_WINDOW
      );
      if (!allowed) {
        return NextResponse.json(
          { success: false, error: 'Rate limit exceeded. Max 20 price lookups per hour.' },
          { status: 429, headers: corsHeaders() }
        );
      }

      const cacheKey = itemName.trim().toLowerCase();

      // Check cache first
      const cacheCol = db.collection(CACHE_COLLECTION);
      const cached = await cacheCol.findOne({ cacheKey, userId: user.userId });

      if (cached) {
        return NextResponse.json(
          {
            success: true,
            prices: cached.prices,
            deals: cached.deals,
            citations: cached.citations,
            summary: cached.summary,
            imageUrl: cached.imageUrl,
            cached: true,
          },
          { headers: corsHeaders() }
        );
      }

      // Cache miss -- call Perplexity
      let prices: PriceSnapshot[] = [];
      let deals: DealAlert[] = [];
      let citations: string[] = [];
      let summary = '';
      let imageUrl: string | undefined;

      try {
        const result = await searchProductPrice(itemName.trim());
        citations = result.citations;

        // Parse the JSON response from Perplexity
        const cleaned = result.content
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();
        const parsed = JSON.parse(cleaned);

        const now = new Date().toISOString();

        if (Array.isArray(parsed.prices)) {
          prices = parsed.prices.map((p: Record<string, unknown>) => ({
            price: typeof p.price === 'number' ? p.price : 0,
            source: typeof p.source === 'string' ? p.source : 'Unknown',
            url: typeof p.url === 'string' ? p.url : undefined,
            checkedAt: now,
          }));
        }

        if (Array.isArray(parsed.deals)) {
          deals = parsed.deals.map((d: Record<string, unknown>) => ({
            title: typeof d.title === 'string' ? d.title : 'Deal',
            price: typeof d.price === 'number' ? d.price : 0,
            originalPrice: typeof d.originalPrice === 'number' ? d.originalPrice : undefined,
            discountPercent: typeof d.discountPercent === 'number' ? d.discountPercent : undefined,
            source: typeof d.source === 'string' ? d.source : 'Unknown',
            url: typeof d.url === 'string' ? d.url : undefined,
            foundAt: now,
          }));
        }

        summary = typeof parsed.summary === 'string' ? parsed.summary : '';

        if (typeof parsed.imageUrl === 'string' && parsed.imageUrl.startsWith('http')) {
          imageUrl = parsed.imageUrl;
        }
      } catch (parseError) {
        // Graceful fallback: return empty result if Perplexity fails or parsing fails
        console.error('Perplexity price lookup failed:', parseError);
        return NextResponse.json(
          {
            success: true,
            prices: [],
            deals: [],
            citations: [],
            summary: 'Price lookup unavailable at the moment. Please try again later.',
            cached: false,
          },
          { headers: corsHeaders() }
        );
      }

      // Cache the result with TTL
      await cacheCol.insertOne({
        cacheKey,
        userId: user.userId,
        prices,
        deals,
        citations,
        summary,
        imageUrl,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + CACHE_TTL_MS),
      });

      // If itemId is provided, update the bucket list item
      if (itemId && typeof itemId === 'string') {
        try {
          const objectId = new ObjectId(itemId);
          const bucketCol = db.collection(BUCKET_COLLECTION);
          const updateFields: Record<string, unknown> = {
            priceHistory: prices,
            dealAlerts: deals,
            updatedAt: new Date().toISOString(),
          };
          if (imageUrl) updateFields.imageUrl = imageUrl;

          await bucketCol.updateOne(
            { _id: objectId, userId: user.userId },
            { $set: updateFields }
          );
        } catch {
          // Non-critical: log but don't fail the request
          console.error('Failed to update bucket list item with price data');
        }
      }

      return NextResponse.json(
        {
          success: true,
          prices,
          deals,
          citations,
          summary,
          imageUrl,
          cached: false,
        },
        { headers: corsHeaders() }
      );
    } catch (error) {
      console.error('Error in POST /api/bucket-list/price:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to search prices' },
        { status: 500, headers: corsHeaders() }
      );
    }
  })(request);
}
