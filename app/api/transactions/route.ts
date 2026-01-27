// Transactions API route
import { NextRequest, NextResponse } from 'next/server';
import { getCachedTransactions, filterTransactions, fetchTransactionsFromSheet } from '@/lib/sheets';
import { corsHeaders, handleOptions, withAuth } from '@/lib/middleware';
import type { Transaction } from '@/lib/types';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

/**
 * GET /api/transactions
 * Get filtered transaction data
 *
 * Query parameters:
 * - category: string - Filter by category
 * - paymentMethod: string - Filter by payment method
 * - startDate: string - Filter by start date (ISO format)
 * - endDate: string - Filter by end date (ISO format)
 * - minAmount: number - Filter by minimum amount
 * - maxAmount: number - Filter by maximum amount
 * - limit: number - Limit number of results (default: all)
 * - offset: number - Offset for pagination (default: 0)
 * - sort: string - Sort field (date, amount, category)
 * - order: string - Sort order (asc, desc)
 *
 * Response:
 * {
 *   "success": boolean,
 *   "transactions": Transaction[],
 *   "count": number,
 *   "total": number,
 *   "filters": object
 * }
 */
export async function GET(request: NextRequest) {
  return withAuth(async (req, context) => {
    try {
      const searchParams = req.nextUrl.searchParams;

      // Get transactions from cache or fetch if needed
      let cached = getCachedTransactions();

      // If no cache, fetch from sheets
      if (!cached.transactions) {
        const { transactions } = await fetchTransactionsFromSheet();
        cached = { transactions, lastSync: new Date().toISOString() };
      }

      if (!cached.transactions) {
        return NextResponse.json(
          {
            success: false,
            message: 'No transaction data available. Please sync first.',
          },
          { status: 404, headers: corsHeaders() }
        );
      }

      // Parse query parameters
      const filters = {
        category: searchParams.get('category') || undefined,
        paymentMethod: searchParams.get('paymentMethod') || undefined,
        startDate: searchParams.get('startDate') || undefined,
        endDate: searchParams.get('endDate') || undefined,
        minAmount: searchParams.get('minAmount') ? parseFloat(searchParams.get('minAmount')!) : undefined,
        maxAmount: searchParams.get('maxAmount') ? parseFloat(searchParams.get('maxAmount')!) : undefined,
      };

      const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
      const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;
      const sortField = searchParams.get('sort') || 'date';
      const sortOrder = searchParams.get('order') || 'desc';

      // Filter transactions
      let filtered = filterTransactions(cached.transactions, filters);

      // Sort transactions
      filtered = sortTransactions(filtered, sortField, sortOrder);

      const total = filtered.length;

      // Apply pagination
      if (limit) {
        filtered = filtered.slice(offset, offset + limit);
      }

      return NextResponse.json(
        {
          success: true,
          transactions: filtered,
          count: filtered.length,
          total,
          filters,
          pagination: {
            limit,
            offset,
            hasMore: limit ? offset + limit < total : false,
          },
        },
        { status: 200, headers: corsHeaders() }
      );
    } catch (error: unknown) {
      console.error('Transactions fetch error:', getErrorMessage(error));
      return NextResponse.json(
        {
          success: false,
          message: `Failed to fetch transactions: ${getErrorMessage(error)}`,
        },
        { status: 500, headers: corsHeaders() }
      );
    }
  })(request);
}

/**
 * Sort transactions by field
 */
function sortTransactions(
  transactions: Transaction[],
  field: string,
  order: string
): Transaction[] {
  const sorted = [...transactions];

  sorted.sort((a, b) => {
    let aVal: number | string = new Date(a.date).getTime();
    let bVal: number | string = new Date(b.date).getTime();

    switch (field) {
      case 'date':
        aVal = new Date(a.date).getTime();
        bVal = new Date(b.date).getTime();
        break;
      case 'amount':
        aVal = a.amount;
        bVal = b.amount;
        break;
      case 'category':
        aVal = a.category;
        bVal = b.category;
        break;
      case 'merchant':
        aVal = a.merchant;
        bVal = b.merchant;
        break;
      default:
        aVal = new Date(a.date).getTime();
        bVal = new Date(b.date).getTime();
    }

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return order === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }

    if (order === 'asc') {
      return aVal > bVal ? 1 : -1;
    }
    return aVal < bVal ? 1 : -1;
  });

  return sorted;
}

/**
 * OPTIONS /api/transactions
 */
export async function OPTIONS() {
  return handleOptions();
}
