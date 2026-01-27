/**
 * Data processor for parsing and transforming transaction data
 * Handles CSV parsing, data validation, and transformation to Transaction objects
 */

import {
  Transaction,
  RawTransaction,
  TransactionType,
  TransactionCategory,
  PaymentMethod,
  TransactionStatus,
} from './types';
import { categorizeTransaction } from './categorizer';
import { parseDate, generateId } from './utils';

/**
 * Parse CSV content to raw transaction objects
 * @param csvContent - CSV file content as string
 * @returns Array of raw transaction objects
 */
export function parseCSV(csvContent: string): RawTransaction[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];

  // Extract headers (first line)
  const headers = parseCSVLine(lines[0]);

  // Parse data rows
  const rawTransactions: RawTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;

    // Map values to header keys
    const transaction: Record<string, string> = {};
    headers.forEach((header, index) => {
      transaction[header.trim()] = values[index]?.trim() || '';
    });

    rawTransactions.push(transaction as unknown as RawTransaction);
  }

  return rawTransactions;
}

/**
 * Parse a single CSV line, handling quoted values
 * @param line - CSV line
 * @returns Array of values
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  // Add last field
  values.push(current);

  return values;
}

/**
 * Transform raw transaction to typed Transaction object
 * @param raw - Raw transaction data
 * @returns Typed Transaction object or null if invalid
 */
export function transformTransaction(raw: RawTransaction): Transaction | null {
  try {
    // Parse date
    const date = parseDate(raw.date);
    if (!date) {
      console.warn(`Invalid date for transaction: ${raw.date}`);
      return null;
    }

    // Parse amount
    const amount = parseAmount(raw.amount);
    if (isNaN(amount)) {
      console.warn(`Invalid amount for transaction: ${raw.amount}`);
      return null;
    }

    // Parse transaction type
    const type = parseTransactionType(raw.type);

    // Parse or auto-detect category
    const category = raw.category
      ? parseCategory(raw.category)
      : categorizeTransaction(raw.merchant, raw.description);

    // Parse payment method
    const paymentMethod = parsePaymentMethod(raw.paymentMethod);

    // Parse status
    const status = parseTransactionStatus(raw.status);

    // Parse tags
    const tags = raw.tags
      ? raw.tags.split(',').map(tag => tag.trim()).filter(Boolean)
      : [];

    // Parse recurring
    const recurring = raw.recurring
      ? raw.recurring.toLowerCase() === 'true' || raw.recurring === '1'
      : false;

    return {
      id: generateId(),
      date,
      description: raw.description || '',
      merchant: raw.merchant || 'Unknown',
      category,
      amount: Math.abs(amount),
      type,
      paymentMethod,
      account: raw.account || 'Default',
      status,
      tags,
      notes: raw.notes,
      location: raw.location,
      receiptUrl: raw.receiptUrl,
      recurring,
      relatedTransactionId: raw.relatedTransactionId,
    };
  } catch (error) {
    console.error('Error transforming transaction:', error, raw);
    return null;
  }
}

/**
 * Parse amount string to number
 * Handles various formats: "1,234.56", "₹1234", "(1234)" for negative
 * @param amountStr - Amount string
 * @returns Parsed amount
 */
export function parseAmount(amountStr: string): number {
  if (!amountStr) return 0;

  let cleaned = amountStr.toString().trim();

  // Handle negative amounts in parentheses
  const isNegative = cleaned.startsWith('(') && cleaned.endsWith(')');
  if (isNegative) {
    cleaned = cleaned.slice(1, -1);
  }

  // Remove currency symbols and commas
  cleaned = cleaned.replace(/[₹$,\s]/g, '');

  const amount = parseFloat(cleaned);
  return isNegative ? -amount : amount;
}

/**
 * Parse transaction type from string
 * @param typeStr - Type string
 * @returns Transaction type
 */
export function parseTransactionType(typeStr: string): TransactionType {
  if (!typeStr) return TransactionType.EXPENSE;

  const normalized = typeStr.toLowerCase().trim();

  switch (normalized) {
    case 'income':
    case 'credit':
    case 'deposit':
      return TransactionType.INCOME;

    case 'expense':
    case 'debit':
    case 'withdrawal':
      return TransactionType.EXPENSE;

    case 'transfer':
      return TransactionType.TRANSFER;

    case 'investment':
      return TransactionType.INVESTMENT;

    case 'refund':
      return TransactionType.REFUND;

    default:
      return TransactionType.EXPENSE;
  }
}

/**
 * Parse category from string
 * @param categoryStr - Category string
 * @returns Transaction category
 */
export function parseCategory(categoryStr: string): TransactionCategory {
  if (!categoryStr) return TransactionCategory.UNCATEGORIZED;

  // Try to match against enum values
  const normalized = categoryStr
    .toLowerCase()
    .replace(/[_\s-]/g, ' ')
    .trim();

  for (const [key, value] of Object.entries(TransactionCategory)) {
    if (value.toLowerCase() === normalized) {
      return value as TransactionCategory;
    }
  }

  return TransactionCategory.UNCATEGORIZED;
}

/**
 * Parse payment method from string
 * @param methodStr - Payment method string
 * @returns Payment method
 */
export function parsePaymentMethod(methodStr: string): PaymentMethod {
  if (!methodStr) return PaymentMethod.OTHER;

  const normalized = methodStr.toLowerCase().trim();

  if (normalized.includes('cash')) return PaymentMethod.CASH;
  if (normalized.includes('debit')) return PaymentMethod.DEBIT_CARD;
  if (normalized.includes('credit')) return PaymentMethod.CREDIT_CARD;
  if (normalized.includes('upi')) return PaymentMethod.UPI;
  if (normalized.includes('net banking') || normalized.includes('netbanking'))
    return PaymentMethod.NET_BANKING;
  if (normalized.includes('wallet')) return PaymentMethod.WALLET;
  if (normalized.includes('cheque') || normalized.includes('check'))
    return PaymentMethod.CHEQUE;

  return PaymentMethod.OTHER;
}

/**
 * Parse transaction status from string
 * @param statusStr - Status string
 * @returns Transaction status
 */
export function parseTransactionStatus(statusStr: string): TransactionStatus {
  if (!statusStr) return TransactionStatus.COMPLETED;

  const normalized = statusStr.toLowerCase().trim();

  switch (normalized) {
    case 'completed':
    case 'success':
    case 'successful':
      return TransactionStatus.COMPLETED;

    case 'pending':
    case 'processing':
      return TransactionStatus.PENDING;

    case 'failed':
    case 'failure':
      return TransactionStatus.FAILED;

    case 'cancelled':
    case 'canceled':
      return TransactionStatus.CANCELLED;

    default:
      return TransactionStatus.COMPLETED;
  }
}

/**
 * Process CSV content to Transaction objects
 * @param csvContent - CSV file content
 * @returns Array of Transaction objects
 */
export function processCSVData(csvContent: string): Transaction[] {
  const rawTransactions = parseCSV(csvContent);
  const transactions: Transaction[] = [];

  for (const raw of rawTransactions) {
    const transaction = transformTransaction(raw);
    if (transaction) {
      transactions.push(transaction);
    }
  }

  return transactions;
}

/**
 * Validate transaction data
 * @param transaction - Transaction to validate
 * @returns Validation result with errors
 */
export function validateTransaction(transaction: Partial<Transaction>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!transaction.date || !(transaction.date instanceof Date)) {
    errors.push('Invalid or missing date');
  }

  if (!transaction.description || transaction.description.trim() === '') {
    errors.push('Description is required');
  }

  if (
    transaction.amount === undefined ||
    transaction.amount === null ||
    isNaN(transaction.amount)
  ) {
    errors.push('Invalid or missing amount');
  }

  if (!transaction.type) {
    errors.push('Transaction type is required');
  }

  if (!transaction.category) {
    errors.push('Category is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Clean and normalize transaction data
 * @param transactions - Array of transactions
 * @returns Cleaned transactions
 */
export function cleanTransactions(transactions: Transaction[]): Transaction[] {
  return transactions
    .filter(t => validateTransaction(t).isValid)
    .map(t => ({
      ...t,
      description: t.description.trim(),
      merchant: t.merchant.trim(),
      amount: Math.abs(t.amount), // Ensure positive amounts
    }));
}

/**
 * Deduplicate transactions based on date, amount, and merchant
 * @param transactions - Array of transactions
 * @returns Deduplicated transactions
 */
export function deduplicateTransactions(
  transactions: Transaction[]
): Transaction[] {
  const seen = new Set<string>();
  const unique: Transaction[] = [];

  for (const transaction of transactions) {
    const key = `${transaction.date.toISOString()}-${transaction.amount}-${transaction.merchant}`;

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(transaction);
    }
  }

  return unique;
}

/**
 * Sort transactions by date (newest first)
 * @param transactions - Array of transactions
 * @returns Sorted transactions
 */
export function sortTransactionsByDate(
  transactions: Transaction[],
  order: 'asc' | 'desc' = 'desc'
): Transaction[] {
  return [...transactions].sort((a, b) => {
    const diff = a.date.getTime() - b.date.getTime();
    return order === 'asc' ? diff : -diff;
  });
}

/**
 * Export transactions to CSV format
 * @param transactions - Array of transactions
 * @returns CSV string
 */
export function exportToCSV(transactions: Transaction[]): string {
  const headers = [
    'Date',
    'Description',
    'Merchant',
    'Category',
    'Amount',
    'Type',
    'Payment Method',
    'Account',
    'Status',
    'Tags',
    'Notes',
    'Location',
    'Receipt URL',
    'Recurring',
    'Related Transaction ID',
  ];

  const rows = transactions.map(t => [
    t.date.toISOString().split('T')[0],
    t.description,
    t.merchant,
    t.category,
    t.amount.toString(),
    t.type,
    t.paymentMethod,
    t.account,
    t.status,
    t.tags.join(','),
    t.notes || '',
    t.location || '',
    t.receiptUrl || '',
    t.recurring.toString(),
    t.relatedTransactionId || '',
  ]);

  const csvRows = [headers, ...rows];

  return csvRows
    .map(row =>
      row.map(cell => {
        // Escape quotes and wrap in quotes if contains comma
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')
    )
    .join('\n');
}
