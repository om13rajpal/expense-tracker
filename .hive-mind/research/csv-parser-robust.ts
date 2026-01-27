/**
 * Robust CSV Parser for Google Sheets Export
 * Handles quoted fields, commas within fields, and edge cases
 */

export interface Transaction {
  date: string;
  description: string;
  category: string;
  amount: number;
  paymentMethod: string;
  status: string;
}

/**
 * Parse CSV text with proper handling of quoted fields
 * Handles cases like: "Restaurant, Downtown","Food & Dining",45.50
 */
export function parseCSV(csvText: string): string[][] {
  const lines = csvText.trim().split('\n');
  const result: string[][] = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    const row: string[] = [];
    let currentField = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        // Handle escaped quotes ""
        if (insideQuotes && nextChar === '"') {
          currentField += '"';
          i++; // Skip next quote
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        // Field separator
        row.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }

    // Add last field
    row.push(currentField.trim());
    result.push(row);
  }

  return result;
}

/**
 * Transform CSV rows to Transaction objects
 * Assumes first row is headers
 */
export function transformToTransactions(rows: string[][]): Transaction[] {
  if (rows.length === 0) return [];

  // Skip header row
  const dataRows = rows.slice(1);

  return dataRows
    .filter(row => row.length >= 6 && row[0]) // Filter out empty rows
    .map(row => ({
      date: parseDate(row[0]),
      description: row[1] || 'Unknown',
      category: row[2] || 'Uncategorized',
      amount: parseAmount(row[3]),
      paymentMethod: row[4] || 'Unknown',
      status: parseStatus(row[5]),
    }));
}

/**
 * Parse date string to ISO format
 * Handles multiple formats: MM/DD/YYYY, YYYY-MM-DD, etc.
 */
function parseDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];

  // Try parsing as-is first
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }

  // Handle MM/DD/YYYY format
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [month, day, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Fallback to today
  return new Date().toISOString().split('T')[0];
}

/**
 * Parse amount string to number
 * Handles: $45.50, 45.50, (45.50), -45.50
 */
function parseAmount(amountStr: string): number {
  if (!amountStr) return 0;

  // Remove currency symbols, spaces, commas
  let cleaned = amountStr.replace(/[$£€¥,\s]/g, '');

  // Handle parentheses as negative
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    cleaned = '-' + cleaned.slice(1, -1);
  }

  const amount = parseFloat(cleaned);
  return isNaN(amount) ? 0 : Math.abs(amount);
}

/**
 * Parse status string to valid status
 * Normalizes various status formats
 */
function parseStatus(statusStr: string): 'completed' | 'pending' | 'failed' {
  const normalized = statusStr?.toLowerCase().trim() || '';

  if (normalized.includes('pend')) return 'pending';
  if (normalized.includes('fail') || normalized.includes('cancel')) return 'failed';
  return 'completed';
}

/**
 * Validate transaction object
 */
export function validateTransaction(transaction: Transaction): boolean {
  return (
    transaction.date.length > 0 &&
    transaction.description.length > 0 &&
    transaction.amount >= 0 &&
    ['completed', 'pending', 'failed'].includes(transaction.status)
  );
}

/**
 * Complete parsing pipeline with validation
 */
export function parseAndValidateCSV(csvText: string): {
  transactions: Transaction[];
  errors: string[];
} {
  const errors: string[] = [];

  try {
    const rows = parseCSV(csvText);

    if (rows.length === 0) {
      errors.push('CSV file is empty');
      return { transactions: [], errors };
    }

    if (rows.length === 1) {
      errors.push('CSV contains only headers, no data');
      return { transactions: [], errors };
    }

    const transactions = transformToTransactions(rows);

    // Validate each transaction
    const validTransactions: Transaction[] = [];
    transactions.forEach((transaction, index) => {
      if (validateTransaction(transaction)) {
        validTransactions.push(transaction);
      } else {
        errors.push(`Row ${index + 2} has invalid data: ${JSON.stringify(transaction)}`);
      }
    });

    return {
      transactions: validTransactions,
      errors,
    };

  } catch (error) {
    errors.push(`Parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { transactions: [], errors };
  }
}

/**
 * Example usage in API route
 */
export async function fetchAndParseGoogleSheet(
  spreadsheetId: string,
  sheetGid: string = '0'
): Promise<{
  success: boolean;
  data: Transaction[];
  errors?: string[];
  metadata?: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    lastFetched: string;
  };
}> {
  try {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${sheetGid}`;

    const response = await fetch(csvUrl, {
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const csvText = await response.text();
    const { transactions, errors } = parseAndValidateCSV(csvText);

    return {
      success: true,
      data: transactions,
      errors: errors.length > 0 ? errors : undefined,
      metadata: {
        totalRows: csvText.split('\n').length - 1, // Exclude header
        validRows: transactions.length,
        invalidRows: errors.length,
        lastFetched: new Date().toISOString(),
      },
    };

  } catch (error) {
    return {
      success: false,
      data: [],
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}
