/**
 * NWI (Needs/Wants/Investments/Savings) Configuration API
 * Manages the user's allocation split and category mappings.
 *
 * GET /api/nwi-config - Fetch NWI config (seeds defaults on first access)
 * PUT /api/nwi-config - Update allocation percentages and category mappings
 *
 * Percentages across all four buckets must sum to 100.
 * Categories are auto-deduplicated across buckets by priority:
 * savings > investments > wants > needs.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/mongodb';
import { corsHeaders, handleOptions, withAuth } from '@/lib/middleware';
import { getDefaultNWIConfig } from '@/lib/nwi';
import { TransactionCategory, NWIConfig } from '@/lib/types';

/** @constant MongoDB collection name for NWI configuration documents. */
const COLLECTION = 'nwi_config';

/**
 * @constant Next.js ISR revalidation interval in seconds.
 * Caches the NWI config response for 5 minutes.
 */
export const revalidate = 300; // 5 minutes

/**
 * OPTIONS /api/nwi-config
 * CORS preflight handler. Returns allowed methods and headers.
 */
export async function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/nwi-config
 * Fetch the user's NWI (Needs/Wants/Investments/Savings) configuration.
 * Seeds default configuration on first access if none exists.
 * Response is cached for 5 minutes via Next.js ISR.
 *
 * @requires Authentication - JWT via `auth-token` cookie
 *
 * @returns {200} `{ success: true, config: NWIConfig }`
 * @returns {500} `{ success: false, error: string }` - Server error
 */
export async function GET(request: NextRequest) {
  return withAuth(async (_req, { user }) => {
    try {
      const db = await getMongoDb();
      const col = db.collection(COLLECTION);

      let doc = await col.findOne({ userId: user.userId });

      if (!doc) {
        const defaultConfig = getDefaultNWIConfig(user.userId);
        await col.insertOne(defaultConfig);
        doc = await col.findOne({ userId: user.userId });
      }

      const headers = new Headers(corsHeaders());
      headers.set('Cache-Control', 'public, max-age=300, s-maxage=300'); // 5 minutes

      // Backfill savings bucket for existing configs that don't have it
      if (!doc!.savings) {
        const defaultSavings = { percentage: 0, categories: ['Savings'] };
        const investmentCats = (doc!.investments?.categories || []).filter(
          (c: string) => c !== 'Savings'
        );
        await col.updateOne(
          { userId: user.userId },
          { $set: { savings: defaultSavings, 'investments.categories': investmentCats } }
        );
        doc!.savings = defaultSavings;
        doc!.investments.categories = investmentCats;
      } else {
        // Fix duplicate: remove 'Savings' from investments if it also exists in savings bucket
        const savingsCats: string[] = doc!.savings?.categories || [];
        const investCats: string[] = doc!.investments?.categories || [];
        const dupes = investCats.filter((c: string) => savingsCats.includes(c));
        if (dupes.length > 0) {
          const fixedInvestCats = investCats.filter((c: string) => !savingsCats.includes(c));
          await col.updateOne(
            { userId: user.userId },
            { $set: { 'investments.categories': fixedInvestCats } }
          );
          doc!.investments.categories = fixedInvestCats;
        }
      }

      return NextResponse.json(
        {
          success: true,
          config: {
            needs: doc!.needs,
            wants: doc!.wants,
            investments: doc!.investments,
            savings: doc!.savings,
          },
        },
        { headers }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error in GET /api/nwi-config:', message);
      return NextResponse.json(
        { success: false, error: 'Failed to load NWI config' },
        { status: 500, headers: corsHeaders() }
      );
    }
  })(request);
}

/**
 * PUT /api/nwi-config
 * Update the user's NWI allocation percentages and category mappings.
 * Validates that all four bucket percentages sum to 100.
 * Auto-deduplicates categories across buckets by priority: savings > investments > wants > needs.
 *
 * @requires Authentication - JWT via `auth-token` cookie
 *
 * @body {NWIConfig} config - The updated NWI configuration with needs, wants, investments, savings buckets
 *
 * @returns {200} `{ success: true, config: NWIConfig }`
 * @returns {400} `{ success: false, error: string }` - Invalid percentages (must sum to 100)
 * @returns {500} `{ success: false, error: string }` - Server error
 */
export async function PUT(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const body = await req.json();
      const { needs, wants, investments, savings } = body as Partial<
        Pick<NWIConfig, 'needs' | 'wants' | 'investments' | 'savings'>
      >;

      const db = await getMongoDb();
      const col = db.collection(COLLECTION);

      // Validate percentages sum to 100 when any percentage is provided
      const hasAnyPercentage = needs?.percentage != null || wants?.percentage != null ||
        investments?.percentage != null || savings?.percentage != null;
      if (hasAnyPercentage) {
        // Load current config to fill in missing buckets
        const currentDoc = await col.findOne({ userId: user.userId });
        const nP = needs?.percentage ?? currentDoc?.needs?.percentage ?? 0;
        const wP = wants?.percentage ?? currentDoc?.wants?.percentage ?? 0;
        const iP = investments?.percentage ?? currentDoc?.investments?.percentage ?? 0;
        const sP = savings?.percentage ?? currentDoc?.savings?.percentage ?? 0;
        const total = nP + wP + iP + sP;
        if (total !== 100) {
          return NextResponse.json(
            { success: false, error: `Percentages must sum to 100 (got ${total})` },
            { status: 400, headers: corsHeaders() }
          );
        }
      }

      // Auto-deduplicate categories across buckets (savings > investments > wants > needs)
      // Higher-priority buckets keep the category; lower-priority ones have it removed
      const buckets = [savings, investments, wants, needs]; // priority order
      const claimed = new Set<string>();
      for (const bucket of buckets) {
        if (bucket?.categories) {
          bucket.categories = bucket.categories.filter((c: TransactionCategory) => {
            if (claimed.has(c)) return false;
            claimed.add(c);
            return true;
          });
        }
      }

      const updateFields: Record<string, unknown> = {
        updatedAt: new Date().toISOString(),
      };
      if (needs) updateFields.needs = needs;
      if (wants) updateFields.wants = wants;
      if (investments) updateFields.investments = investments;
      if (savings) updateFields.savings = savings;

      await col.updateOne(
        { userId: user.userId },
        { $set: updateFields }
      );

      const updatedDoc = await col.findOne({ userId: user.userId });

      return NextResponse.json(
        {
          success: true,
          config: {
            needs: updatedDoc!.needs,
            wants: updatedDoc!.wants,
            investments: updatedDoc!.investments,
            savings: updatedDoc!.savings,
          },
        },
        { headers: corsHeaders() }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error in PUT /api/nwi-config:', message);
      return NextResponse.json(
        { success: false, error: 'Failed to update NWI config' },
        { status: 500, headers: corsHeaders() }
      );
    }
  })(request);
}
