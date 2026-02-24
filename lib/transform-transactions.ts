/**
 * Transaction transformer for the DataTable component.
 *
 * Converts internal `Transaction` objects (with Date objects, enum types,
 * and optional fields) into a flat `DataTableTransaction` shape suitable
 * for client-side table rendering and sorting.
 *
 * @module lib/transform-transactions
 */

import type { Transaction } from './types';
import { TransactionType } from './types';

/** Flat transaction shape consumed by the DataTable component. */
export interface DataTableTransaction {
  id: string;
  _id?: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  type: 'income' | 'expense';
  paymentMethod: string;
  merchant?: string;
}

/**
 * Transform a single Transaction into a DataTableTransaction.
 *
 * Handles date conversion (Date or string to YYYY-MM-DD), maps the
 * transaction type enum to a simple "income" | "expense" string,
 * and extracts the MongoDB `_id` when present.
 *
 * @param transaction - Internal Transaction object.
 * @returns Flat row suitable for the DataTable component.
 */
export function transformTransactionForTable(transaction: Transaction): DataTableTransaction {
  // Handle date conversion
  let dateStr: string;
  if (transaction.date instanceof Date) {
    dateStr = transaction.date.toISOString().split('T')[0];
  } else {
    dateStr = String(transaction.date).split('T')[0];
  }

  // Map transaction type
  const type: 'income' | 'expense' =
    transaction.type === TransactionType.INCOME
      ? 'income'
      : 'expense';

  return {
    id: transaction.id,
    _id: (transaction as unknown as Record<string, unknown>)._id as string | undefined,
    date: dateStr,
    description: transaction.description || '',
    category: transaction.category || 'Uncategorized',
    amount: Math.abs(transaction.amount),
    type,
    paymentMethod: transaction.paymentMethod || 'Other',
    merchant: transaction.merchant,
  };
}

/**
 * Batch-transform an array of Transactions into DataTableTransaction rows.
 *
 * Returns an empty array if the input is null, undefined, or not an array.
 *
 * @param transactions - Array of internal Transaction objects.
 * @returns Array of flat DataTableTransaction rows.
 */
export function transformTransactionsForTable(transactions: Transaction[]): DataTableTransaction[] {
  if (!transactions || !Array.isArray(transactions)) {
    return [];
  }
  return transactions.map(transformTransactionForTable);
}
