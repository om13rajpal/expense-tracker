/**
 * Sample data generator for testing and development
 * Creates realistic transaction data for the finance tracker
 */

import {
  Transaction,
  TransactionType,
  TransactionCategory,
  PaymentMethod,
  TransactionStatus,
} from './types';
import { generateId } from './utils';

/**
 * Sample merchants by category
 */
const SAMPLE_MERCHANTS: Partial<Record<TransactionCategory, string[]>> = {
  [TransactionCategory.GROCERIES]: [
    'DMart',
    'Reliance Fresh',
    'Big Bazaar',
    'Local Kirana Store',
    'Spencers',
  ],
  [TransactionCategory.DINING]: [
    'Swiggy',
    'Zomato',
    'McDonald\'s',
    'Domino\'s Pizza',
    'Starbucks',
    'Cafe Coffee Day',
  ],
  [TransactionCategory.TRANSPORT]: [
    'Uber',
    'Ola',
    'Rapido',
    'Metro Card Recharge',
    'Parking Fee',
  ],
  [TransactionCategory.UTILITIES]: [
    'Airtel Mobile',
    'Jio Recharge',
    'Electricity Board',
    'Internet Bill',
  ],
  [TransactionCategory.SHOPPING]: [
    'Amazon India',
    'Flipkart',
    'Myntra',
    'Ajio',
  ],
  [TransactionCategory.ENTERTAINMENT]: [
    'Netflix',
    'Amazon Prime',
    'BookMyShow',
    'PVR Cinemas',
  ],
  [TransactionCategory.SALARY]: [
    'Monthly Salary Credit',
    'Salary Transfer',
  ],
  [TransactionCategory.HEALTHCARE]: [
    'Apollo Pharmacy',
    'MedPlus',
    'Dr. Clinic',
  ],
  [TransactionCategory.FUEL]: [
    'Indian Oil Petrol Pump',
    'HP Gas Station',
  ],
};

/**
 * Generate sample transactions for testing
 * @param count - Number of transactions to generate
 * @param startDate - Start date for transactions
 * @param endDate - End date for transactions
 * @returns Array of sample transactions
 */
export function generateSampleTransactions(
  count: number = 100,
  startDate: Date = new Date(2024, 0, 1),
  endDate: Date = new Date()
): Transaction[] {
  const transactions: Transaction[] = [];

  for (let i = 0; i < count; i++) {
    const transaction = generateRandomTransaction(startDate, endDate);
    transactions.push(transaction);
  }

  // Sort by date descending
  return transactions.sort((a, b) => b.date.getTime() - a.date.getTime());
}

/**
 * Generate a single random transaction
 */
function generateRandomTransaction(
  startDate: Date,
  endDate: Date
): Transaction {
  // Random date between start and end
  const date = new Date(
    startDate.getTime() +
      Math.random() * (endDate.getTime() - startDate.getTime())
  );

  // 80% expenses, 15% income, 5% other
  const typeRand = Math.random();
  let type: TransactionType;
  if (typeRand < 0.8) {
    type = TransactionType.EXPENSE;
  } else if (typeRand < 0.95) {
    type = TransactionType.INCOME;
  } else {
    type = TransactionType.TRANSFER;
  }

  // Select category based on type
  let category: TransactionCategory;
  let merchant: string;
  let amount: number;

  if (type === TransactionType.INCOME) {
    category = TransactionCategory.SALARY;
    merchant = 'Monthly Salary Credit';
    amount = 40000 + Math.random() * 60000; // 40k-100k
  } else {
    // Random expense category
    const expenseCategories = [
      TransactionCategory.GROCERIES,
      TransactionCategory.DINING,
      TransactionCategory.TRANSPORT,
      TransactionCategory.UTILITIES,
      TransactionCategory.SHOPPING,
      TransactionCategory.ENTERTAINMENT,
      TransactionCategory.HEALTHCARE,
      TransactionCategory.FUEL,
    ];

    category = expenseCategories[
      Math.floor(Math.random() * expenseCategories.length)
    ];

    // Get merchant from category
    const merchants = SAMPLE_MERCHANTS[category] || ['Unknown Merchant'];
    merchant = merchants[Math.floor(Math.random() * merchants.length)];

    // Amount based on category
    amount = getRandomAmountForCategory(category);
  }

  // Random payment method
  const paymentMethods = [
    PaymentMethod.UPI,
    PaymentMethod.CREDIT_CARD,
    PaymentMethod.DEBIT_CARD,
    PaymentMethod.CASH,
  ];
  const paymentMethod =
    paymentMethods[Math.floor(Math.random() * paymentMethods.length)];

  // Random account
  const accounts = ['HDFC Savings', 'ICICI Credit Card', 'Cash', 'Paytm Wallet'];
  const account = accounts[Math.floor(Math.random() * accounts.length)];

  // 10% recurring
  const recurring = Math.random() < 0.1;

  return {
    id: generateId(),
    date,
    description: generateDescription(category, merchant),
    merchant,
    category,
    amount,
    type,
    paymentMethod,
    account,
    status: TransactionStatus.COMPLETED,
    tags: generateTags(category),
    recurring,
  };
}

/**
 * Get random amount based on category
 */
function getRandomAmountForCategory(category: TransactionCategory): number {
  const ranges: Partial<Record<TransactionCategory, [number, number]>> = {
    [TransactionCategory.GROCERIES]: [500, 3000],
    [TransactionCategory.DINING]: [200, 1500],
    [TransactionCategory.TRANSPORT]: [50, 500],
    [TransactionCategory.UTILITIES]: [300, 2000],
    [TransactionCategory.SHOPPING]: [500, 5000],
    [TransactionCategory.ENTERTAINMENT]: [200, 1000],
    [TransactionCategory.HEALTHCARE]: [300, 2000],
    [TransactionCategory.FUEL]: [500, 2000],
  };

  const [min, max] = ranges[category] || [100, 1000];
  return Math.floor(min + Math.random() * (max - min));
}

/**
 * Generate description for transaction
 */
function generateDescription(
  category: TransactionCategory,
  merchant: string
): string {
  const descriptions: Partial<Record<TransactionCategory, string[]>> = {
    [TransactionCategory.GROCERIES]: [
      'Monthly grocery shopping',
      'Weekly groceries',
      'Fresh vegetables and fruits',
    ],
    [TransactionCategory.DINING]: [
      'Food delivery order',
      'Dinner at restaurant',
      'Coffee and snacks',
    ],
    [TransactionCategory.TRANSPORT]: [
      'Cab to office',
      'Metro ride',
      'Auto rickshaw',
    ],
    [TransactionCategory.UTILITIES]: [
      'Mobile recharge',
      'Internet bill payment',
      'Electricity bill',
    ],
    [TransactionCategory.SHOPPING]: [
      'Online shopping',
      'Clothing purchase',
      'Electronics order',
    ],
    [TransactionCategory.ENTERTAINMENT]: [
      'Subscription renewal',
      'Movie tickets',
      'Concert tickets',
    ],
    [TransactionCategory.SALARY]: [
      'Salary credit for the month',
      'Monthly income',
    ],
  };

  const options = descriptions[category] || ['Transaction'];
  const desc = options[Math.floor(Math.random() * options.length)];
  return `${desc} - ${merchant}`;
}

/**
 * Generate tags for transaction
 */
function generateTags(category: TransactionCategory): string[] {
  const tagOptions: Partial<Record<TransactionCategory, string[]>> = {
    [TransactionCategory.GROCERIES]: ['essential', 'monthly', 'food'],
    [TransactionCategory.DINING]: ['food', 'lifestyle'],
    [TransactionCategory.TRANSPORT]: ['commute', 'essential'],
    [TransactionCategory.UTILITIES]: ['bills', 'essential', 'recurring'],
    [TransactionCategory.SHOPPING]: ['lifestyle', 'discretionary'],
    [TransactionCategory.ENTERTAINMENT]: ['lifestyle', 'leisure'],
    [TransactionCategory.SALARY]: ['income', 'monthly'],
  };

  const tags = tagOptions[category] || [];
  // Return 1-2 random tags
  const count = Math.floor(Math.random() * 2) + 1;
  return tags.slice(0, count);
}

/**
 * Generate CSV sample data
 * @param count - Number of transactions
 * @returns CSV string
 */
export function generateSampleCSV(count: number = 100): string {
  const transactions = generateSampleTransactions(count);

  const headers = [
    'date',
    'description',
    'merchant',
    'category',
    'amount',
    'type',
    'paymentMethod',
    'account',
    'status',
    'tags',
    'notes',
    'location',
    'receiptUrl',
    'recurring',
    'relatedTransactionId',
  ];

  const rows = transactions.map(t => [
    t.date.toISOString().split('T')[0],
    t.description,
    t.merchant,
    t.category,
    t.amount.toFixed(2),
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
      row
        .map(cell => {
          const cellStr = String(cell);
          if (
            cellStr.includes(',') ||
            cellStr.includes('"') ||
            cellStr.includes('\n')
          ) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        })
        .join(',')
    )
    .join('\n');
}

/**
 * Generate transactions for a specific month
 * @param year - Year
 * @param month - Month (0-11)
 * @param transactionsPerDay - Average transactions per day
 * @returns Array of transactions
 */
export function generateMonthTransactions(
  year: number,
  month: number,
  transactionsPerDay: number = 3
): Transaction[] {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);
  const days = endDate.getDate();
  const count = days * transactionsPerDay;

  return generateSampleTransactions(count, startDate, endDate);
}

/**
 * Generate year of transactions
 * @param year - Year to generate
 * @returns Array of transactions
 */
export function generateYearTransactions(year: number): Transaction[] {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);

  // ~3 transactions per day = ~1000 transactions per year
  return generateSampleTransactions(1000, startDate, endDate);
}
