import { NextRequest, NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/mongodb';
import { corsHeaders, handleOptions, withAuth } from '@/lib/middleware';
import { getDefaultNWIConfig } from '@/lib/nwi';
import { TransactionCategory, NWIConfig } from '@/lib/types';

const COLLECTION = 'nwi_config';

// Enable Next.js caching for this route
export const revalidate = 300; // 5 minutes

export async function OPTIONS() {
  return handleOptions();
}

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

export async function PUT(request: NextRequest) {
  return withAuth(async (req, { user }) => {
    try {
      const body = await req.json();
      const { needs, wants, investments, savings } = body as Partial<
        Pick<NWIConfig, 'needs' | 'wants' | 'investments' | 'savings'>
      >;

      // Validate percentages sum to 100 when all four are provided
      if (needs?.percentage != null && wants?.percentage != null && investments?.percentage != null && savings?.percentage != null) {
        const total = needs.percentage + wants.percentage + investments.percentage + savings.percentage;
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

      const db = await getMongoDb();
      const col = db.collection(COLLECTION);

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
