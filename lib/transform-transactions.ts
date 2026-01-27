// Transform Google Sheets transactions to DataTable format
import type { Transaction } from './types';
import { TransactionType } from './types';

export interface DataTableTransaction {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  type: 'income' | 'expense';
  paymentMethod: string;
  merchant?: string;
}

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
    date: dateStr,
    description: transaction.description || '',
    category: transaction.category || 'Uncategorized',
    amount: Math.abs(transaction.amount),
    type,
    paymentMethod: transaction.paymentMethod || 'Other',
    merchant: transaction.merchant,
  };
}

export function transformTransactionsForTable(transactions: Transaction[]): DataTableTransaction[] {
  if (!transactions || !Array.isArray(transactions)) {
    return [];
  }
  return transactions.map(transformTransactionForTable);
}
