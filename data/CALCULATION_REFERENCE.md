# Financial Calculations Reference Guide

**For Developers Implementing Dashboard Metrics**

---

## Table of Contents
1. [Core Formulas](#core-formulas)
2. [Handling Partial Months](#handling-partial-months)
3. [Opening Balance Logic](#opening-balance-logic)
4. [Common Pitfalls](#common-pitfalls)
5. [Code Examples](#code-examples)

---

## Core Formulas

### 1. Current Balance
```javascript
// The balance is ALWAYS taken from the latest transaction
currentBalance = transactions[transactions.length - 1].balance;

// NOT calculated as:
// currentBalance = income - expenses; // ❌ WRONG
```

**Why?** The current balance includes all historical money, not just current period's income minus expenses.

**Example:**
- Started with: ₹66,301
- Earned: ₹3,15,310
- Spent: ₹3,39,794
- Current: ₹41,817 (not -₹24,484!)

### 2. Total Income (for a period)
```javascript
totalIncome = transactions
  .filter(t => t.date >= startDate && t.date <= endDate)
  .reduce((sum, t) => sum + parseFloat(t.credit || 0), 0);
```

### 3. Total Expenses (for a period)
```javascript
totalExpenses = transactions
  .filter(t => t.date >= startDate && t.date <= endDate)
  .reduce((sum, t) => sum + parseFloat(t.debit || 0), 0);
```

### 4. Net Change (for a period)
```javascript
netChange = totalIncome - totalExpenses;

// This is NOT the current balance!
// This is the CHANGE during the period
```

### 5. Opening Balance (for a period)
```javascript
// Method 1: From previous period's closing
openingBalance = previousPeriod.closingBalance;

// Method 2: Calculate from first transaction
const firstTxn = transactions[0];
openingBalance = firstTxn.balance + firstTxn.debit - firstTxn.credit;

// Method 3: Work backwards from closing
openingBalance = closingBalance - totalIncome + totalExpenses;
```

### 6. Closing Balance (for a period)
```javascript
closingBalance = transactions[transactions.length - 1].balance;

// Or calculated from opening:
closingBalance = openingBalance + totalIncome - totalExpenses;
```

### 7. Savings Rate
```javascript
savingsRate = ((totalIncome - totalExpenses) / totalIncome) * 100;

// Negative = spending more than earning
// Positive = saving money
```

### 8. Average Daily Spending
```javascript
const daysInPeriod = getDaysBetween(startDate, endDate);
avgDailySpending = totalExpenses / daysInPeriod;
```

---

## Handling Partial Months

### Problem
If you have data for Jan 1-24 (24 days), showing it as "Monthly" is misleading.

### Solution 1: Show Actual Range
```javascript
function getDisplayLabel(startDate, endDate, monthName) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysCovered = getDaysBetween(startDate, endDate);

  if (daysCovered < daysInMonth) {
    return `${monthName} 1-${endDate.day} (${daysCovered} days)`;
  }
  return `${monthName} ${year}`;
}

// Example output: "Jan 1-24 (24 days)"
```

### Solution 2: Project to Full Month
```javascript
function getProjectedMonthly(actual, daysCovered, daysInMonth) {
  if (daysCovered === daysInMonth) {
    return actual;
  }

  const dailyAverage = actual / daysCovered;
  const projected = dailyAverage * daysInMonth;

  return {
    actual: actual,
    projected: projected,
    isPartial: true,
    label: `${actual.toFixed(2)} (projected: ${projected.toFixed(2)})`
  };
}

// Example:
// Input: ₹339,794 for 24 days in 31-day month
// Output: { actual: 339794, projected: 438815, isPartial: true }
```

### Solution 3: Display Both
```jsx
<Card>
  <h3>Monthly Expenses</h3>
  <p className="text-4xl">₹{formatNumber(actualExpenses)}</p>
  {isPartialMonth && (
    <p className="text-sm text-gray-500">
      {daysCovered} of {daysInMonth} days
      • Projected full month: ₹{formatNumber(projectedExpenses)}
    </p>
  )}
</Card>
```

---

## Opening Balance Logic

### The Critical Rule
**Opening Balance = Closing Balance of Previous Period**

```javascript
// ✅ CORRECT
function getMonthlyMetrics(year, month) {
  const previousMonth = month === 1 ? 12 : month - 1;
  const previousYear = month === 1 ? year - 1 : year;

  const prevMetrics = getMonthlyMetrics(previousYear, previousMonth);
  const openingBalance = prevMetrics.closingBalance;

  // ... calculate current month
}
```

### For the First Period (No Previous Data)
```javascript
// Calculate from first transaction
const firstTransaction = getFirstTransaction(year, month);

if (!firstTransaction) {
  return { error: "No transactions in period" };
}

const openingBalance =
  firstTransaction.balance
  + parseFloat(firstTransaction.debit || 0)
  - parseFloat(firstTransaction.credit || 0);
```

### Example Calculation
```
First transaction on Jan 1, 2026:
- Balance after: ₹65,970.41
- Debit: ₹330.15
- Credit: ₹0

Opening balance = ₹65,970.41 + ₹330.15 - ₹0 = ₹66,300.56
```

### Verification Formula
```javascript
function verifyBalanceFlow(opening, income, expenses, closing) {
  const calculated = opening + income - expenses;
  const diff = Math.abs(calculated - closing);

  if (diff > 0.02) { // Allow for rounding errors
    console.error(`Balance mismatch: ${diff}`);
    return false;
  }
  return true;
}

// Should always return true if data is correct
```

---

## Common Pitfalls

### ❌ Pitfall 1: Confusing Balance with Net Change
```javascript
// WRONG
const currentBalance = totalIncome - totalExpenses;

// CORRECT
const netChange = totalIncome - totalExpenses;
const currentBalance = openingBalance + netChange;
```

### ❌ Pitfall 2: Starting from Zero
```javascript
// WRONG - Assumes user started with ₹0
const balance = income - expenses;

// CORRECT - Account for historical balance
const balance = openingBalance + income - expenses;
```

### ❌ Pitfall 3: Showing Partial as Full Month
```javascript
// WRONG
<h3>Monthly Expenses</h3>
<p>₹339,794</p> // Only 24 days!

// CORRECT
<h3>Monthly Expenses (Jan 1-24)</h3>
<p>₹339,794 <span>(24 days)</span></p>
<p>Projected full month: ₹438,815</p>
```

### ❌ Pitfall 4: Ignoring Transaction Order
```javascript
// WRONG - Assumes sorted
const firstTxn = transactions[0];
const lastTxn = transactions[transactions.length - 1];

// CORRECT - Ensure sorted by date
const sorted = transactions.sort((a, b) =>
  new Date(a.value_date) - new Date(b.value_date)
);
const firstTxn = sorted[0];
const lastTxn = sorted[sorted.length - 1];
```

### ❌ Pitfall 5: Float Precision Errors
```javascript
// WRONG - JavaScript float arithmetic
const total = 100.1 + 200.2; // 300.30000000000004

// CORRECT - Use proper decimal library
import Decimal from 'decimal.js';
const total = new Decimal(100.1).plus(200.2).toNumber(); // 300.3
```

---

## Code Examples

### Complete Monthly Metrics Function

```typescript
interface MonthlyMetrics {
  year: number;
  month: number;
  openingBalance: number;
  closingBalance: number;
  totalIncome: number;
  totalExpenses: number;
  netChange: number;
  savingsRate: number;
  transactionCount: number;
  daysCovered: number;
  daysInMonth: number;
  isPartialMonth: boolean;
  projectedIncome?: number;
  projectedExpenses?: number;
}

function getMonthlyMetrics(
  transactions: Transaction[],
  year: number,
  month: number
): MonthlyMetrics {
  // Filter transactions for this month
  const monthTransactions = transactions.filter(t => {
    const date = new Date(t.value_date);
    return date.getFullYear() === year && date.getMonth() + 1 === month;
  });

  if (monthTransactions.length === 0) {
    throw new Error("No transactions in period");
  }

  // Sort by date
  const sorted = monthTransactions.sort((a, b) =>
    new Date(a.value_date).getTime() - new Date(b.value_date).getTime()
  );

  // Calculate opening balance from first transaction
  const firstTxn = sorted[0];
  const openingBalance =
    parseFloat(firstTxn.balance)
    + parseFloat(firstTxn.debit || '0')
    - parseFloat(firstTxn.credit || '0');

  // Closing balance from last transaction
  const closingBalance = parseFloat(sorted[sorted.length - 1].balance);

  // Calculate totals
  const totalIncome = sorted.reduce((sum, t) =>
    sum + parseFloat(t.credit || '0'), 0
  );

  const totalExpenses = sorted.reduce((sum, t) =>
    sum + parseFloat(t.debit || '0'), 0
  );

  const netChange = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0
    ? (netChange / totalIncome) * 100
    : 0;

  // Days calculation
  const firstDate = new Date(sorted[0].value_date);
  const lastDate = new Date(sorted[sorted.length - 1].value_date);
  const daysCovered = Math.floor(
    (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;

  const daysInMonth = new Date(year, month, 0).getDate();
  const isPartialMonth = daysCovered < daysInMonth;

  // Projections if partial
  let projectedIncome, projectedExpenses;
  if (isPartialMonth) {
    const dailyIncomeAvg = totalIncome / daysCovered;
    const dailyExpenseAvg = totalExpenses / daysCovered;
    projectedIncome = dailyIncomeAvg * daysInMonth;
    projectedExpenses = dailyExpenseAvg * daysInMonth;
  }

  return {
    year,
    month,
    openingBalance,
    closingBalance,
    totalIncome,
    totalExpenses,
    netChange,
    savingsRate,
    transactionCount: sorted.length,
    daysCovered,
    daysInMonth,
    isPartialMonth,
    projectedIncome,
    projectedExpenses
  };
}
```

### Category-wise Breakdown

```typescript
interface CategoryExpense {
  category: string;
  total: number;
  count: number;
  percentage: number;
}

function getCategoryBreakdown(
  transactions: Transaction[]
): CategoryExpense[] {
  const categories = new Map<string, number>();
  const counts = new Map<string, number>();

  let totalExpenses = 0;

  transactions.forEach(txn => {
    const debit = parseFloat(txn.debit || '0');
    if (debit === 0) return;

    const category = categorizeTransaction(txn);

    categories.set(category, (categories.get(category) || 0) + debit);
    counts.set(category, (counts.get(category) || 0) + 1);
    totalExpenses += debit;
  });

  return Array.from(categories.entries())
    .map(([category, total]) => ({
      category,
      total,
      count: counts.get(category) || 0,
      percentage: (total / totalExpenses) * 100
    }))
    .sort((a, b) => b.total - a.total);
}

function categorizeTransaction(txn: Transaction): string {
  const desc = txn.description.toUpperCase();

  if (desc.includes('THAPAR')) return 'Education';
  if (desc.includes('GROWW')) return 'Investment';
  if (desc.includes('ZEPTO')) return 'Groceries';
  if (desc.includes('SWIGGY') || desc.includes('DOMINOS') ||
      desc.includes('MCDONALD') || desc.includes('WRAP')) return 'Food & Dining';
  if (desc.includes('NETFLIX') || desc.includes('APPLE')) return 'Subscriptions';
  if (desc.includes('GOIBIBO')) return 'Travel';
  if (desc.includes('ZUDIO') || desc.includes('AMAZON')) return 'Shopping';
  if (desc.includes('AIRTEL')) return 'Utilities';

  return 'Other';
}
```

### Balance Progression Chart Data

```typescript
interface BalancePoint {
  date: string;
  balance: number;
  income: number;
  expense: number;
}

function getBalanceProgression(
  transactions: Transaction[]
): BalancePoint[] {
  const sorted = transactions.sort((a, b) =>
    new Date(a.value_date).getTime() - new Date(b.value_date).getTime()
  );

  return sorted.map(txn => ({
    date: txn.value_date,
    balance: parseFloat(txn.balance),
    income: parseFloat(txn.credit || '0'),
    expense: parseFloat(txn.debit || '0')
  }));
}
```

### Dashboard Card Component

```tsx
interface MetricCardProps {
  title: string;
  value: number;
  prefix?: string;
  isPartialMonth?: boolean;
  daysCovered?: number;
  daysInMonth?: number;
  projected?: number;
}

function MetricCard({
  title,
  value,
  prefix = '₹',
  isPartialMonth,
  daysCovered,
  daysInMonth,
  projected
}: MetricCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-gray-600">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-4xl font-bold">
          {prefix}{formatNumber(value)}
        </p>
        {isPartialMonth && daysCovered && daysInMonth && (
          <div className="mt-2 text-sm text-gray-500">
            <p>{daysCovered} of {daysInMonth} days</p>
            {projected && (
              <p>Projected: {prefix}{formatNumber(projected)}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Usage
<MetricCard
  title="Monthly Expenses"
  value={339794}
  isPartialMonth={true}
  daysCovered={24}
  daysInMonth={31}
  projected={438815}
/>
```

---

## Testing & Validation

### Test Cases

```typescript
describe('Monthly Metrics Calculation', () => {
  it('should calculate correct opening balance', () => {
    const metrics = getMonthlyMetrics(sampleData, 2026, 1);
    expect(metrics.openingBalance).toBe(66300.56);
  });

  it('should verify balance flow', () => {
    const metrics = getMonthlyMetrics(sampleData, 2026, 1);
    const calculated =
      metrics.openingBalance
      + metrics.totalIncome
      - metrics.totalExpenses;

    expect(calculated).toBeCloseTo(metrics.closingBalance, 2);
  });

  it('should handle partial month correctly', () => {
    const metrics = getMonthlyMetrics(sampleData, 2026, 1);
    expect(metrics.isPartialMonth).toBe(true);
    expect(metrics.daysCovered).toBe(24);
    expect(metrics.projectedExpenses).toBeGreaterThan(metrics.totalExpenses);
  });

  it('should calculate negative savings rate', () => {
    const metrics = getMonthlyMetrics(sampleData, 2026, 1);
    expect(metrics.savingsRate).toBeLessThan(0);
    expect(metrics.savingsRate).toBeCloseTo(-7.76, 2);
  });
});
```

---

## Quick Reference Cheat Sheet

```
Current Balance = Latest Transaction Balance
Opening Balance = Previous Closing OR (First.balance + First.debit - First.credit)
Closing Balance = Last Transaction Balance
Total Income = SUM(credits in period)
Total Expenses = SUM(debits in period)
Net Change = Income - Expenses
Savings Rate = (Income - Expenses) / Income × 100

Verification:
Opening + Income - Expenses = Closing ✓

Partial Month:
Actual ≠ Monthly
Show: "Jan 1-24 (24 days)" OR project to full month
```

---

**End of Reference**
*Use this guide when implementing dashboard calculations*
*Always verify with balance flow formula*
