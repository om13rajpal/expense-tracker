# Finance Tracker Library - Quick Reference

## Quick Import Guide

```typescript
// Import everything
import * as FinanceLib from '@/lib';

// Import specific functions
import {
  // Data Processing
  processCSVData,
  transformTransaction,
  validateTransaction,

  // Analytics
  calculateAnalytics,
  calculateMonthlyTrends,
  calculateCategoryBreakdown,

  // Categorization
  categorizeTransaction,
  bulkCategorize,

  // Formatting
  formatCurrency,
  formatCompactCurrency,
  formatDate,

  // Types
  Transaction,
  Analytics,
  TransactionType,
  TransactionCategory,
} from '@/lib';
```

## Most Common Use Cases

### 1. Process CSV Data
```typescript
const transactions = processCSVData(csvContent);
```

### 2. Calculate Analytics
```typescript
const analytics = calculateAnalytics(transactions);
console.log(analytics.totalIncome);      // 150000
console.log(analytics.totalExpenses);    // 98000
console.log(analytics.netSavings);       // 52000
console.log(analytics.savingsRate);      // 34.67
```

### 3. Format Currency
```typescript
formatCurrency(123456.78);           // "₹1,23,456.78"
formatCompactCurrency(1234567);      // "₹12.3L"
formatCompactCurrency(12345678);     // "₹1.2Cr"
```

### 4. Auto-Categorize
```typescript
categorizeTransaction("Swiggy", "Food delivery");
// Returns: TransactionCategory.DINING
```

### 5. Format Dates
```typescript
formatDate(new Date(), 'short');     // "26/01/2024"
formatDate(new Date(), 'medium');    // "26 Jan 2024"
formatDate(new Date(), 'long');      // "26 January 2024"
formatMonthYear(new Date());         // "January 2024"
```

## Transaction Categories (25+)

### Income
- `SALARY`, `FREELANCE`, `BUSINESS`, `INVESTMENT_INCOME`, `OTHER_INCOME`

### Essential
- `RENT`, `UTILITIES`, `GROCERIES`, `HEALTHCARE`, `INSURANCE`, `TRANSPORT`, `FUEL`

### Lifestyle
- `DINING`, `ENTERTAINMENT`, `SHOPPING`, `TRAVEL`, `EDUCATION`, `FITNESS`, `PERSONAL_CARE`

### Financial
- `SAVINGS`, `INVESTMENT`, `LOAN_PAYMENT`, `CREDIT_CARD`, `TAX`

### Other
- `SUBSCRIPTION`, `GIFTS`, `CHARITY`, `MISCELLANEOUS`, `UNCATEGORIZED`

## Payment Methods
- `CASH`, `DEBIT_CARD`, `CREDIT_CARD`, `UPI`, `NET_BANKING`, `WALLET`, `CHEQUE`, `OTHER`

## Transaction Types
- `INCOME`, `EXPENSE`, `TRANSFER`, `INVESTMENT`, `REFUND`

## Analytics Object Structure

```typescript
interface Analytics {
  // Totals
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number;

  // Averages
  averageMonthlyIncome: number;
  averageMonthlyExpense: number;
  averageMonthlySavings: number;
  dailyAverageSpend: number;

  // Breakdowns
  categoryBreakdown: CategoryBreakdown[];
  paymentMethodBreakdown: PaymentMethodBreakdown[];

  // Trends
  monthlyTrends: MonthlyTrend[];

  // Top Items
  topExpenseCategories: CategorySummary[];
  topMerchants: MerchantSummary[];

  // Other
  recurringExpenses: number;
}
```

## Common Merchant Patterns

| Category | Merchants |
|----------|-----------|
| Dining | Swiggy, Zomato, McDonald's, Domino's, Starbucks |
| Shopping | Amazon, Flipkart, Myntra, Ajio |
| Transport | Uber, Ola, Rapido, Metro |
| Groceries | DMart, Big Bazaar, Reliance Fresh |
| Utilities | Airtel, Jio, Vodafone |
| Entertainment | Netflix, Prime, Hotstar, BookMyShow |
| Investment | Zerodha, Groww, Upstox |

## Testing & Development

```typescript
// Generate sample data
import { generateSampleTransactions } from '@/lib';

const transactions = generateSampleTransactions(100);
const monthData = generateMonthTransactions(2024, 0); // Jan 2024
const yearData = generateYearTransactions(2024);
```

## Dashboard Integration Examples

### Section Cards
```typescript
import { calculateAnalytics, formatCompactCurrency } from '@/lib';

const analytics = calculateAnalytics(transactions);

<Card title="Total Income" value={formatCompactCurrency(analytics.totalIncome)} />
<Card title="Total Expenses" value={formatCompactCurrency(analytics.totalExpenses)} />
<Card title="Net Savings" value={formatCompactCurrency(analytics.netSavings)} />
```

### Charts
```typescript
import { calculateMonthlyTrends } from '@/lib';

const trends = calculateMonthlyTrends(transactions);

// For line/area charts
const chartData = trends.map(t => ({
  month: t.monthName,
  income: t.income,
  expenses: t.expenses,
  savings: t.savings,
}));
```

### Category Pie Chart
```typescript
import { calculateCategoryBreakdown } from '@/lib';

const breakdown = calculateCategoryBreakdown(transactions);

// For pie charts
const pieData = breakdown.map(b => ({
  name: b.category,
  value: b.amount,
  percentage: b.percentage,
}));
```

## Filter Examples

```typescript
// By category
const groceries = transactions.filter(t =>
  t.category === TransactionCategory.GROCERIES
);

// By type
const expenses = transactions.filter(t =>
  t.type === TransactionType.EXPENSE
);

// By date range
const thisMonth = transactions.filter(t => {
  const { start, end } = getCurrentMonthRange();
  return t.date >= start && t.date <= end;
});

// By amount
const highValue = transactions.filter(t => t.amount > 1000);

// Recurring only
const recurring = transactions.filter(t => t.recurring);
```

## CSV Format

```csv
date,description,merchant,category,amount,type,paymentMethod,account,status,tags,notes,location,receiptUrl,recurring,relatedTransactionId
2024-01-15,Grocery shopping,DMart,Groceries,2500,expense,UPI,HDFC Savings,completed,essential,,,,,
2024-01-20,Salary credit,Company,Salary,50000,income,Net Banking,HDFC Savings,completed,income,,,,,
```

## Common Calculations

```typescript
// Total by type
const totalIncome = transactions
  .filter(t => t.type === TransactionType.INCOME)
  .reduce((sum, t) => sum + t.amount, 0);

// Group by category
const byCategory = groupBy(transactions, 'category');

// Monthly average
const monthlyExpenses = calculateMonthlyTrends(transactions);
const avgMonthlyExpense = average(monthlyExpenses.map(m => m.expenses));

// Savings rate
const savingsRate = (netSavings / totalIncome) * 100;
```

## Error Handling

```typescript
try {
  const transactions = processCSVData(csvContent);
  const analytics = calculateAnalytics(transactions);
} catch (error) {
  console.error('Error processing data:', error);
}

// Validation
const { isValid, errors } = validateTransaction(transaction);
if (!isValid) {
  console.error('Validation errors:', errors);
}
```

## Performance Tips

1. **Clean data first**: Use `cleanTransactions()` before analytics
2. **Deduplicate**: Use `deduplicateTransactions()` to avoid duplicates
3. **Filter before analyze**: Filter transactions before calculating analytics
4. **Cache results**: Analytics are expensive, cache the results
5. **Use compact format**: Use `formatCompactCurrency()` for large numbers

## File Paths

```
lib/
├── types.ts              # All TypeScript interfaces
├── data-processor.ts     # CSV parsing and validation
├── analytics.ts          # Financial calculations
├── categorizer.ts        # Auto-categorization
├── utils.ts              # Formatting and helpers
├── sample-data.ts        # Test data generation
├── index.ts              # Main export point
├── examples.ts           # Usage examples
└── README.md             # Full documentation
```

## Key Functions Summary

| Function | Purpose | Returns |
|----------|---------|---------|
| `processCSVData()` | Parse CSV to transactions | `Transaction[]` |
| `calculateAnalytics()` | Complete analytics | `Analytics` |
| `categorizeTransaction()` | Auto-categorize | `TransactionCategory` |
| `formatCurrency()` | Format INR | `string` |
| `formatDate()` | Format date | `string` |
| `calculateMonthlyTrends()` | Monthly analysis | `MonthlyTrend[]` |
| `getTopExpenseCategories()` | Top categories | `CategorySummary[]` |
| `generateSampleTransactions()` | Test data | `Transaction[]` |

## Support

- Full documentation: `lib/README.md`
- Examples: `lib/examples.ts`
- Implementation details: `lib/IMPLEMENTATION_SUMMARY.md`
- This quick reference: `lib/QUICK_REFERENCE.md`
