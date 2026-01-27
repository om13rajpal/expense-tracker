# Analytics Page - Test Examples

## Sample Calculations with Real Data

### Test Scenario: Jan 1-24, 2026 (24 days of data)

---

## 1. Peak Spending Times Calculation

**Algorithm:**
```typescript
const dayFrequency: Record<number, number> = {}
transactions.forEach(t => {
  const day = new Date(t.date).getDate()
  dayFrequency[day] = (dayFrequency[day] || 0) + 1
})
```

**Sample Data:**
- Day 5: 45 transactions
- Day 10: 38 transactions
- Day 15: 22 transactions
- Day 20: 15 transactions

**Result:** Peak day is 5 → "Beginning of Month" (1-10 days)

**Display:**
```
Peak Spending Times
Beginning of Month
Most transactions occur in the first 10 days
```

---

## 2. Financial Health Calculation

**Algorithm:**
```typescript
const rate = analytics.savingsRate
if (rate > 20) return { status: 'Excellent', color: 'text-green-500' }
if (rate > 10) return { status: 'Good', color: 'text-blue-500' }
if (rate > 0) return { status: 'Fair', color: 'text-yellow-500' }
return { status: 'Poor', color: 'text-red-500' }
```

**Sample Calculations:**

| Income | Expenses | Savings | Savings Rate | Health Status |
|--------|----------|---------|--------------|---------------|
| ₹50,000 | ₹35,000 | ₹15,000 | 30% | **Excellent** 🟢 |
| ₹50,000 | ₹42,000 | ₹8,000 | 16% | **Good** 🔵 |
| ₹50,000 | ₹48,000 | ₹2,000 | 4% | **Fair** 🟡 |
| ₹50,000 | ₹52,000 | -₹2,000 | -4% | **Poor** 🔴 |

---

## 3. Month-over-Month Growth

**Algorithm:**
```typescript
const current = monthlyTrends[monthlyTrends.length - 1]
const previous = monthlyTrends[monthlyTrends.length - 2]

return ((current.income - previous.income) / previous.income) * 100
```

**Sample Data:**

| Month | Income | MoM Growth |
|-------|--------|------------|
| Nov 2025 | ₹45,000 | - |
| Dec 2025 | ₹48,000 | +6.7% |
| Jan 2026 | ₹52,000 | +8.3% |

**Display for Jan 2026:**
```
Growth Rate
+8.3%
Income growth vs last month
```

---

## 4. Expense Forecasting

**Algorithm:**
```typescript
const recentTrends = monthlyTrends.slice(-3)
const avgExpenses = recentTrends.reduce((sum, t) => sum + t.expenses, 0) / recentTrends.length

// Calculate growth trend
const growthRates = []
for (let i = 1; i < recentTrends.length; i++) {
  const rate = (recentTrends[i].expenses - recentTrends[i - 1].expenses) / recentTrends[i - 1].expenses
  growthRates.push(rate)
}

const avgGrowth = growthRates.reduce((sum, r) => sum + r, 0) / growthRates.length
return avgExpenses * (1 + avgGrowth)
```

**Sample Data:**

| Month | Expenses | Growth Rate |
|-------|----------|-------------|
| Nov 2025 | ₹35,000 | - |
| Dec 2025 | ₹37,000 | +5.7% |
| Jan 2026 | ₹38,500 | +4.1% |

**Calculation:**
- Average expenses: (35,000 + 37,000 + 38,500) / 3 = ₹36,833
- Average growth: (0.057 + 0.041) / 2 = 0.049 (4.9%)
- Forecast: 36,833 × 1.049 = **₹38,638**

**Display:**
```
Spending Forecast
₹38,638
Based on recent trends
```

---

## 5. Period Information

**Algorithm:**
```typescript
const dates = transactions.map(t => new Date(t.date))
const minDate = new Date(Math.min(...dates.map(d => d.getTime())))
const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))
const dayCount = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
```

**Sample Data:**
- First transaction: Jan 1, 2026
- Last transaction: Jan 24, 2026
- Days: 24

**Display:**
```
Period: Jan 1, 2026 - Jan 24, 2026 (24 days)
```

---

## 6. Category Breakdown

**Data Structure:**
```typescript
interface CategoryData {
  category: string
  amount: number
  percentage: number
}
```

**Sample Output:**
```typescript
[
  { category: "UNCATEGORIZED", amount: 45230, percentage: 68.5 },
  { category: "FOOD", amount: 8500, percentage: 12.9 },
  { category: "TRANSPORTATION", amount: 6200, percentage: 9.4 },
  { category: "ENTERTAINMENT", amount: 4100, percentage: 6.2 },
  { category: "UTILITIES", amount: 2000, percentage: 3.0 }
]
```

**Chart Display:**
- Pie chart with center total: ₹66,030
- Color-coded segments
- Legend with percentages

---

## 7. Payment Method Distribution

**Data Structure:**
```typescript
interface PaymentMethodData {
  method: string
  count: number
  amount: number
}
```

**Sample Output:**
```typescript
[
  { method: "UPI", count: 156, amount: 52340 },
  { method: "OTHER", count: 45, amount: 13690 },
  { method: "CREDIT_CARD", count: 12, amount: 8500 },
  { method: "DEBIT_CARD", count: 8, amount: 3200 }
]
```

**Chart Display:**
- Horizontal bar chart
- Toggle between "By Amount" and "By Count"
- Popular method highlighted

---

## Edge Cases Handled

### 1. Empty Data Set
```typescript
if (transactions.length === 0) return { period: 'N/A', description: 'No data available' }
```

### 2. Single Month Data
```typescript
if (monthlyTrends.length < 2) return 0  // Can't calculate MoM growth
```

### 3. No Previous Data for Comparison
```typescript
if (previous.income === 0) return 0  // Avoid division by zero
```

### 4. Negative Savings
```typescript
return { status: 'Poor', color: 'text-red-500' }
```

---

## Performance Optimizations

All calculations are memoized with `React.useMemo`:
- Only recalculate when `transactions` array changes
- Prevents unnecessary re-renders
- Improves page performance with large datasets

**Example:**
```typescript
const peakSpendingTime = React.useMemo(() => {
  // Expensive calculation
}, [transactions])  // Only recalculate when transactions change
```

---

## Comparison: Before vs After

### Before (Hardcoded)
```typescript
<p className="text-2xl font-bold">Beginning of Month</p>
<p className="text-3xl font-bold text-green-500">Healthy</p>
<p className="text-2xl font-bold text-green-500">+5.2%</p>
<p className="text-2xl font-bold">₹{((analytics?.totalExpenses || 0) * 1.05).toLocaleString()}</p>
```

### After (Dynamic)
```typescript
<p className="text-2xl font-bold">{peakSpendingTime.period}</p>
<p className={`text-3xl font-bold ${financialHealth.color}`}>{financialHealth.status}</p>
<p className={`text-2xl font-bold ${monthOverMonthGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
  {monthOverMonthGrowth >= 0 ? '+' : ''}{monthOverMonthGrowth.toFixed(1)}%
</p>
<p className="text-2xl font-bold">₹{forecastedExpenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
```

---

## Testing Checklist

✅ **Date Parsing**
- Test with MM/DD/YYYY format: `01/15/2026` → Jan 15, 2026
- Test with edge dates: `01/01/2026`, `12/31/2026`

✅ **Merchant Extraction**
- Test UPI format: `UPI/DR/123/AMAZON/HDFC/456` → `AMAZON`
- Test with spaces: `UPI/DR/123/GROCERY STORE/ICICI/789` → `GROCERY STORE`

✅ **Peak Spending Times**
- Test with early month data → "Beginning of Month"
- Test with mid-month data → "Mid-Month"
- Test with late month data → "End of Month"

✅ **Financial Health**
- Test with 30% savings → "Excellent"
- Test with 15% savings → "Good"
- Test with 5% savings → "Fair"
- Test with -5% savings → "Poor"

✅ **MoM Growth**
- Test with increasing income → Positive percentage, green color
- Test with decreasing income → Negative percentage, red color
- Test with single month → "Insufficient data for comparison"

✅ **Expense Forecast**
- Test with 3+ months → Trend-based forecast
- Test with <2 months → Current spending fallback

✅ **Period Display**
- Test with partial month → Shows actual date range
- Test with full month → Shows complete period

---

## Expected Output Example

For the given data (Jan 1-24, 2026, 24 days):

```
Financial Analytics
Deep insights into your spending patterns, savings, and financial health
Period: Jan 1, 2026 - Jan 24, 2026 (24 days)

[Trends Tab]
Peak Spending Times: Beginning of Month
Payment Method Distribution: UPI 79% | Other 21%

[Savings Tab]
Savings Rate: 18.5%
Monthly Surplus: ₹12,450
Financial Health: Good (Based on savings rate: 18.5%)

[Comparison Tab]
Growth Rate: +8.3% (Income growth vs last month)
Spending Forecast: ₹38,638 (Based on recent trends)
```

---

## Notes

1. All currency values formatted with Indian Rupee symbol (₹)
2. Percentages rounded to 1 decimal place
3. Colors applied based on thresholds (green=good, red=bad, yellow=warning)
4. Graceful fallbacks for insufficient data
5. Responsive to changes in transaction data
