/**
 * Hooks for fetching and syncing transactions from the API / Google Sheets.
 * Provides paginated transaction loading with filters, Google Sheets sync
 * integration, and a standalone sync-only hook for components that do not
 * need to display transaction data.
 * @module hooks/use-transactions
 */
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Transaction, TransactionQuery } from '@/lib/types';

/**
 * Internal state for the transaction list and pagination metadata.
 * @property transactions - Array of loaded transaction objects
 * @property isLoading - True while a fetch is in progress
 * @property error - Error message from the last failed fetch, or null
 * @property total - Total number of transactions matching the current filters (across all pages)
 * @property count - Number of transactions returned in the current page
 * @property hasMore - Whether additional pages of results are available
 */
interface TransactionsState {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  total: number;
  count: number;
  hasMore: boolean;
}

/**
 * Internal state for the Google Sheets sync operation.
 * @property isSyncing - True while a sync operation is running
 * @property lastSync - ISO timestamp of the most recent successful sync, or null
 * @property error - Error message from the last failed sync, or null
 */
interface SyncState {
  isSyncing: boolean;
  lastSync: string | null;
  error: string | null;
}

/**
 * Fetches paginated transactions with optional filters and provides Google Sheets sync.
 * Automatically loads transactions on mount using the provided initial query.
 *
 * Supported filter parameters include category, payment method, date range,
 * amount range, and pagination (limit/offset).
 *
 * @param initialQuery - Optional default filters applied on initial load and after sync.
 *   Stored in a ref to avoid infinite re-render loops when callers pass inline object literals.
 * @returns An object containing:
 *   - `transactions` - Array of loaded transaction objects
 *   - `isLoading` - True while fetching transactions
 *   - `error` - Fetch error message, or null
 *   - `total` - Total matching transaction count across all pages
 *   - `count` - Number of transactions in the current response
 *   - `hasMore` - Whether more pages are available
 *   - `isSyncing` - True while a Google Sheets sync is running
 *   - `lastSync` - ISO timestamp of the last successful sync, or null
 *   - `syncError` - Sync error message, or null
 *   - `fetchTransactions(query?)` - Fetch transactions with optional filter overrides
 *   - `syncFromSheets(force?)` - Trigger a Google Sheets sync (pass `true` to force full re-sync)
 *   - `refresh()` - Re-fetch transactions with the original initial query
 */
export function useTransactions(initialQuery?: Partial<TransactionQuery>) {
  // Store initialQuery in a ref to avoid infinite re-render loops
  // when callers pass an inline object literal
  const queryRef = useRef(initialQuery)

  const [state, setState] = useState<TransactionsState>({
    transactions: [],
    isLoading: false,
    error: null,
    total: 0,
    count: 0,
    hasMore: false,
  });

  const [syncState, setSyncState] = useState<SyncState>({
    isSyncing: false,
    lastSync: null,
    error: null,
  });

  /**
   * Fetches transactions from `GET /api/transactions` with optional query filters.
   * Builds URL search parameters from the provided query object and updates
   * the transaction state with the response data.
   * @param query - Optional filter/pagination parameters to apply
   * @returns A promise resolving to `{ success: true, data: Transaction[] }` or `{ success: false, error: string }`
   */
  const fetchTransactions = useCallback(async (query?: Partial<TransactionQuery>) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Build query string
      const params = new URLSearchParams();

      if (query?.category) params.append('category', query.category);
      if (query?.paymentMethod) params.append('paymentMethod', query.paymentMethod);
      if (query?.startDate) params.append('startDate', query.startDate);
      if (query?.endDate) params.append('endDate', query.endDate);
      if (query?.minAmount !== undefined) params.append('minAmount', query.minAmount.toString());
      if (query?.maxAmount !== undefined) params.append('maxAmount', query.maxAmount.toString());
      if (query?.limit) params.append('limit', query.limit.toString());
      if (query?.offset) params.append('offset', query.offset.toString());

      const response = await fetch(`/api/transactions?${params.toString()}`, {
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        setState({
          transactions: data.transactions,
          isLoading: false,
          error: null,
          total: data.total,
          count: data.count,
          hasMore: data.pagination?.hasMore || false,
        });

        return { success: true, data: data.transactions };
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: data.message || 'Failed to fetch transactions',
        }));

        return { success: false, error: data.message };
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: message,
      }));

      return { success: false, error: message };
    }
  }, []);

  /**
   * Triggers a Google Sheets sync via `GET /api/sheets/sync`.
   * After a successful sync, automatically re-fetches transactions using the
   * initial query to refresh the displayed data.
   * @param force - When true, forces a full re-import from Sheets regardless of the last sync timestamp
   * @returns A promise resolving to `{ success: true, count: number }` or `{ success: false, error: string }`
   */
  const syncFromSheets = useCallback(async (force: boolean = false) => {
    setSyncState({ isSyncing: true, lastSync: null, error: null });

    try {
      const response = await fetch(`/api/sheets/sync?force=${force}`, {
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        setSyncState({
          isSyncing: false,
          lastSync: data.lastSync,
          error: null,
        });

        // Refresh transactions after sync
        await fetchTransactions(queryRef.current);

        return { success: true, count: data.count };
      } else {
        setSyncState({
          isSyncing: false,
          lastSync: null,
          error: data.message || 'Sync failed',
        });

        return { success: false, error: data.message };
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setSyncState({
        isSyncing: false,
        lastSync: null,
        error: message,
      });

      return { success: false, error: message };
    }
  }, [fetchTransactions]);

  /**
   * Convenience method to re-fetch transactions using the original initial query.
   * Useful as a refresh button callback.
   * @returns A promise resolving to the fetch result
   */
  const refresh = useCallback(() => {
    return fetchTransactions(queryRef.current);
  }, [fetchTransactions]);

  // Initial fetch on mount
  useEffect(() => {
    fetchTransactions(queryRef.current);
  }, [fetchTransactions]);

  return {
    // Transaction state
    transactions: state.transactions,
    isLoading: state.isLoading,
    error: state.error,
    total: state.total,
    count: state.count,
    hasMore: state.hasMore,

    // Sync state
    isSyncing: syncState.isSyncing,
    lastSync: syncState.lastSync,
    syncError: syncState.error,

    // Actions
    fetchTransactions,
    syncFromSheets,
    refresh,
  };
}

/**
 * Standalone hook for triggering a Google Sheets sync without loading transactions.
 * Useful in components like the sidebar or header that show sync status but
 * do not need to render the transaction list themselves.
 *
 * @returns An object containing:
 *   - `isSyncing` - True while the sync is in progress
 *   - `lastSync` - ISO timestamp of the most recent successful sync, or null
 *   - `error` - Error message from the last failed sync, or null
 *   - `sync(force?)` - Async function to trigger a sync (pass `true` to force full re-import)
 */
export function useSheetSync() {
  const [state, setState] = useState<SyncState>({
    isSyncing: false,
    lastSync: null,
    error: null,
  });

  /**
   * Triggers a Google Sheets sync via `GET /api/sheets/sync`.
   * @param force - When true, forces a full re-import regardless of last sync time
   * @returns A promise resolving to `{ success, count?, transactions?, error? }`
   */
  const sync = useCallback(async (force: boolean = false) => {
    setState({ isSyncing: true, lastSync: null, error: null });

    try {
      const response = await fetch(`/api/sheets/sync?force=${force}`, {
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        setState({
          isSyncing: false,
          lastSync: data.lastSync,
          error: null,
        });

        return { success: true, count: data.count, transactions: data.transactions };
      } else {
        setState({
          isSyncing: false,
          lastSync: null,
          error: data.message || 'Sync failed',
        });

        return { success: false, error: data.message };
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setState({
        isSyncing: false,
        lastSync: null,
        error: message,
      });

      return { success: false, error: message };
    }
  }, []);

  return {
    ...state,
    sync,
  };
}
