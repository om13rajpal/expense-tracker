/**
 * Hooks for fetching and syncing transactions from the API / Google Sheets.
 * @module hooks/use-transactions
 */
'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Transaction, TransactionQuery } from '@/lib/types';

interface TransactionsState {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  total: number;
  count: number;
  hasMore: boolean;
}

interface SyncState {
  isSyncing: boolean;
  lastSync: string | null;
  error: string | null;
}

/**
 * Fetches paginated transactions with optional filters and provides Google Sheets sync.
 * Automatically loads transactions on mount.
 * @param initialQuery - Optional default filters applied on initial load and after sync.
 */
export function useTransactions(initialQuery?: Partial<TransactionQuery>) {
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
   * Fetch transactions with optional filters
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
   * Sync data from Google Sheets
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
        await fetchTransactions(initialQuery);

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
  }, [fetchTransactions, initialQuery]);

  /**
   * Refresh transactions (shorthand for fetchTransactions with same query)
   */
  const refresh = useCallback(() => {
    return fetchTransactions(initialQuery);
  }, [fetchTransactions, initialQuery]);

  // Initial fetch on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTransactions(initialQuery);
  }, [fetchTransactions, initialQuery]);

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
 * @returns Sync state (`isSyncing`, `lastSync`, `error`) and a `sync` function.
 */
export function useSheetSync() {
  const [state, setState] = useState<SyncState>({
    isSyncing: false,
    lastSync: null,
    error: null,
  });

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
