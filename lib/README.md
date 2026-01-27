# Finance Tracker Utility Library

Comprehensive TypeScript library for processing and analyzing financial transaction data from Google Sheets.

## Overview

This library provides a complete set of utilities for:
- **Data Processing**: Parse CSV, validate, and transform transaction data
- **Analytics**: Calculate financial metrics, trends, and insights
- **Auto-Categorization**: Intelligent transaction categorization based on merchant patterns
- **Formatting**: Currency (INR) and date formatting utilities

## Files Structure

```
lib/
├── types.ts              # TypeScript interfaces and enums
├── data-processor.ts     # CSV parsing and data transformation
├── analytics.ts          # Financial analytics and calculations
├── categorizer.ts        # Auto-categorization engine
├── utils.ts              # Utility functions (date, currency, helpers)
├── index.ts              # Central export point
└── README.md             # This file
```

## Installation & Usage

```typescript
// Import specific functions
import { processCSVData, calculateAnalytics, formatCurrency } from '@/lib';

// Or import everything
import * from '@/lib';
```

## Core Types

### Transaction
Main transaction interface with 16 fields matching Google Sheets structure:

```typescript
interface Transaction {
  id: string;
  date: Date;
  description: string;
  merchant: string;
  category: TransactionCategory;
  amount: number;
  type: TransactionType;
  paymentMethod: PaymentMethod;
  account: string;
  status: TransactionStatus;
  tags: string[];
  notes?: string;
  location?: string;
  receiptUrl?: string;
  recurring: boolean;
  relatedTransactionId?: string;
}
```

### Transaction Types
- `INCOME` - Salary, freelance, business income
- `EXPENSE` - Purchases, bills, subscriptions
- `TRANSFER` - Account transfers
- `INVESTMENT` - Investment transactions
- `REFUND` - Refunds and returns

### Transaction Categories
25+ predefined categories including:
- **Income**: Salary, Freelance, Business, Investment Income
- **Essential**: Rent, Utilities, Groceries, Healthcare, Transport
- **Lifestyle**: Dining, Entertainment, Shopping, Travel
- **Financial**: Savings, Investment, Loans, Credit Cards

### Payment Methods
- Cash, Debit Card, Credit Card
- UPI, Net Banking, Wallet
- Cheque, Other

## Data Processing

### Parse CSV to Transactions

```typescript
import { processCSVData } from '@/lib/data-processor';

// Parse CSV content
const csvContent = await readFile('transactions.csv');
const transactions = processCSVData(csvContent);
```

### Transform & Validate

```typescript
import {
  transformTransaction,
  validateTransaction,
  cleanTransactions
} from '@/lib/data-processor';

// Transform raw data
const transaction = transformTransaction(rawData);

// Validate
const { isValid, errors } = validateTransaction(transaction);

// Clean and deduplicate
const clean = cleanTransactions(transactions);
```

### Export to CSV

```typescript
import { exportToCSV } from '@/lib/data-processor';

const csvString = exportToCSV(transactions);
// Download or save the CSV
```

## Analytics

### Calculate Complete Analytics

```typescript
import { calculateAnalytics } from '@/lib/analytics';

const analytics = calculateAnalytics(transactions);
console.log(analytics);
// {
//   totalIncome: 150000,
//   totalExpenses: 98000,
//   netSavings: 52000,
//   savingsRate: 34.67,
//   averageMonthlyIncome: 50000,
//   averageMonthlyExpense: 32666,
//   dailyAverageSpend: 1088,
//   categoryBreakdown: [...],
//   monthlyTrends: [...],
//   topExpenseCategories: [...],
//   topMerchants: [...]
// }
```

### Monthly Trends

```typescript
import { calculateMonthlyTrends } from '@/lib/analytics';

const trends = calculateMonthlyTrends(transactions);
// [{
//   month: "2024-01",
//   monthName: "January 2024",
//   income: 50000,
//   expenses: 32000,
//   savings: 18000,
//   savingsRate: 36,
//   transactionCount: 45
// }]
```

### Category Breakdown

```typescript
import { calculateCategoryBreakdown } from '@/lib/analytics';

const breakdown = calculateCategoryBreakdown(transactions);
// [{
//   category: "Groceries",
//   amount: 12500,
//   percentage: 12.76,
//   transactionCount: 23
// }]
```

### Top Expense Categories

```typescript
import { getTopExpenseCategories } from '@/lib/analytics';

const topCategories = getTopExpenseCategories(transactions, 5);
```

### Income vs Expense Analysis

```typescript
import { calculateIncomeVsExpense } from '@/lib/analytics';

const analysis = calculateIncomeVsExpense(transactions);
// {
//   income: 150000,
//   expenses: 98000,
//   difference: 52000,
//   ratio: 1.53
// }
```

## Auto-Categorization

### Categorize Single Transaction

```typescript
import { categorizeTransaction } from '@/lib/categorizer';

const category = categorizeTransaction(
  "Swiggy",
  "Food delivery order"
);
// Returns: TransactionCategory.DINING
```

### Bulk Categorization

```typescript
import { bulkCategorize } from '@/lib/categorizer';

const transactions = [
  { merchant: "Amazon", description: "Shopping" },
  { merchant: "Uber", description: "Ride to office" }
];

const categories = bulkCategorize(transactions);
// [TransactionCategory.SHOPPING, TransactionCategory.TRANSPORT]
```

### Get Suggested Categories

```typescript
import { getSuggestedCategories } from '@/lib/categorizer';

const suggestions = getSuggestedCategories("Unknown Store", "Purchase");
// [
//   { category: "Shopping", confidence: 75 },
//   { category: "Miscellaneous", confidence: 25 }
// ]
```

### Custom Patterns

```typescript
import { addCustomPattern } from '@/lib/categorizer';

// Add custom merchant pattern
addCustomPattern(TransactionCategory.GROCERIES, "my local store");
```

## Utility Functions

### Currency Formatting (INR)

```typescript
import { formatCurrency, formatCompactCurrency } from '@/lib/utils';

formatCurrency(1234567.89);
// "₹12,34,567.89"

formatCompactCurrency(1234567);
// "₹12.3L"

formatCompactCurrency(12345678);
// "₹1.2Cr"
```

### Date Formatting

```typescript
import { formatDate, formatMonthYear, formatRelativeDate } from '@/lib/utils';

formatDate(new Date(), 'short');
// "26/01/2024"

formatDate(new Date(), 'medium');
// "26 Jan 2024"

formatMonthYear(new Date());
// "January 2024"

formatRelativeDate(new Date());
// "Today"
```

### Date Parsing

```typescript
import { parseDate } from '@/lib/utils';

parseDate("26/01/2024");      // Date object
parseDate("26-Jan-2024");     // Date object
parseDate("2024-01-26");      // Date object
```

### Percentage Calculations

```typescript
import { calculatePercentage, formatPercentage } from '@/lib/utils';

calculatePercentage(450, 1500);
// 30

formatPercentage(30.5);
// "30.5%"
```

### Helper Functions

```typescript
import { groupBy, sum, average } from '@/lib/utils';

// Group array by key
const grouped = groupBy(transactions, 'category');

// Sum array of numbers
const total = sum([100, 200, 300]); // 600

// Calculate average
const avg = average([100, 200, 300]); // 200
```

## Category Pattern Matching

The categorizer uses intelligent pattern matching based on merchant names and descriptions. Here are some examples:

| Merchant | Auto-detected Category |
|----------|------------------------|
| Swiggy, Zomato | Dining |
| Amazon, Flipkart | Shopping |
| Uber, Ola | Transport |
| DMart, Reliance Fresh | Groceries |
| Airtel, Jio | Utilities |
| Netflix, Hotstar | Entertainment |
| Zerodha, Groww | Investment |

## Example: Complete Workflow

```typescript
import {
  processCSVData,
  calculateAnalytics,
  formatCurrency,
  formatMonthYear,
  TransactionType
} from '@/lib';

// 1. Load and process CSV
const csvContent = await fetch('/api/sheets/sync').then(r => r.text());
const transactions = processCSVData(csvContent);

// 2. Calculate analytics
const analytics = calculateAnalytics(transactions);

// 3. Display results
console.log(`Total Income: ${formatCurrency(analytics.totalIncome)}`);
console.log(`Total Expenses: ${formatCurrency(analytics.totalExpenses)}`);
console.log(`Net Savings: ${formatCurrency(analytics.netSavings)}`);
console.log(`Savings Rate: ${analytics.savingsRate.toFixed(1)}%`);

// 4. Show monthly trends
analytics.monthlyTrends.forEach(trend => {
  console.log(`${trend.monthName}: Saved ${formatCurrency(trend.savings)}`);
});

// 5. Top expense categories
analytics.topExpenseCategories.forEach(cat => {
  console.log(`${cat.category}: ${formatCurrency(cat.totalAmount)} (${cat.percentageOfTotal}%)`);
});
```

## Best Practices

1. **Always validate transactions** before processing
2. **Use type-safe enums** for categories, types, and payment methods
3. **Filter by status** - Only include completed transactions in analytics
4. **Handle edge cases** - Check for zero amounts, missing dates
5. **Deduplicate data** - Remove duplicate transactions before analysis
6. **Format for display** - Use formatCurrency and formatDate for UI

## Performance Considerations

- All functions are optimized for arrays of 1000+ transactions
- Use `cleanTransactions()` to remove invalid data before analytics
- Use `deduplicateTransactions()` to avoid counting duplicates
- Monthly/daily aggregations use efficient grouping algorithms

## Error Handling

All functions include comprehensive error handling:

```typescript
try {
  const transactions = processCSVData(csvContent);
  const analytics = calculateAnalytics(transactions);
} catch (error) {
  console.error('Error processing transactions:', error);
  // Handle error appropriately
}
```

## TypeScript Support

Full TypeScript support with:
- Complete type definitions
- JSDoc documentation
- Type inference
- Enum autocomplete
- Interface validation

## Contributing

When adding new features:
1. Add types to `types.ts`
2. Implement functions with full JSDoc comments
3. Export from `index.ts`
4. Update this README

## License

Part of Finance Tracker application.
