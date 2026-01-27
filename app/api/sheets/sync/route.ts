// Google Sheets sync API route
import { NextRequest, NextResponse } from 'next/server';
import { fetchTransactionsFromSheet, getCachedTransactions, clearCache } from '@/lib/sheets';
import { corsHeaders, handleOptions, withAuth } from '@/lib/middleware';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

/**
 * GET /api/sheets/sync
 * Fetch and cache transaction data from Google Sheets
 *
 * Query parameters:
 * - force: boolean - Force refresh even if cache exists
 *
 * Response:
 * {
 *   "success": boolean,
 *   "message": string,
 *   "transactions": Transaction[],
 *   "lastSync": string,
 *   "count": number
 * }
 */
export async function GET(request: NextRequest) {
  return withAuth(async (req, context) => {
    try {
      const searchParams = req.nextUrl.searchParams;
      const force = searchParams.get('force') === 'true';

      // Check if we have cached data and force refresh is not requested
      const cached = getCachedTransactions();
      if (!force && cached.transactions && cached.lastSync) {
        return NextResponse.json(
          {
            success: true,
            message: 'Using cached data',
            transactions: cached.transactions,
            lastSync: cached.lastSync,
            count: cached.transactions.length,
            cached: true,
          },
          { status: 200, headers: corsHeaders() }
        );
      }

      // Clear cache if force refresh
      if (force) {
        clearCache();
      }

      // Fetch fresh data from Google Sheets
      const { transactions, lastSync } = await fetchTransactionsFromSheet();

      return NextResponse.json(
        {
          success: true,
          message: 'Data synced successfully',
          transactions,
          lastSync,
          count: transactions.length,
          cached: false,
        },
        { status: 200, headers: corsHeaders() }
      );
    } catch (error: unknown) {
      console.error('Sheets sync error:', getErrorMessage(error));
      return NextResponse.json(
        {
          success: false,
          message: `Failed to sync data: ${getErrorMessage(error)}`,
        },
        { status: 500, headers: corsHeaders() }
      );
    }
  })(request);
}

/**
 * DELETE /api/sheets/sync
 * Clear the cached transaction data
 */
export async function DELETE(request: NextRequest) {
  return withAuth(async (req, context) => {
    try {
      clearCache();

      return NextResponse.json(
        {
          success: true,
          message: 'Cache cleared successfully',
        },
        { status: 200, headers: corsHeaders() }
      );
    } catch (error: unknown) {
      console.error('Cache clear error:', getErrorMessage(error));
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to clear cache',
        },
        { status: 500, headers: corsHeaders() }
      );
    }
  })(request);
}

/**
 * OPTIONS /api/sheets/sync
 */
export async function OPTIONS() {
  return handleOptions();
}
