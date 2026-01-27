# Architecture Diagram - Monthly Metrics System

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Google Sheets                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Date | Description | Amount | Type | ... | Balance      │   │
│  │ 1/1  | Transaction | 5029   | Exp  | ... | 65970.41    │   │
│  │ 1/24 | Transaction | 100    | Exp  | ... | 41816.55    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    [Google Sheets API Sync]
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend Application                          │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              useTransactions Hook                       │    │
│  │  - Fetches all transactions                            │    │
│  │  - Stores in React state                               │    │
│  │  - Provides to all pages                               │    │
│  └────────────────────────────────────────────────────────┘    │
│                              ↓                                   │
│         ┌────────────────────┴────────────────────┐             │
│         ↓                    ↓                    ↓             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │  Dashboard  │    │  Analytics  │    │   Budget    │        │
│  │    Page     │    │    Page     │    │    Page     │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow - Before Fix (WRONG)

```
All Transactions (Jan 1 - Jan 24)
          ↓
  calculateAnalytics()
          ↓
  ┌─────────────────────────┐
  │  SUM ALL transactions   │
  │  Income: ₹3.15L (ALL)   │
  │  Expense: ₹3.39L (ALL)  │
  └─────────────────────────┘
          ↓
    Dashboard Display
  ┌─────────────────────────┐
  │ Monthly Spend: ₹3.39L   │  ← WRONG (cumulative)
  │ Monthly Income: ₹3.15L  │  ← WRONG (cumulative)
  │ Balance: ₹41.98L        │  ← Doesn't match above
  └─────────────────────────┘

  ❌ Problem: Shows ALL TIME data, not current month
```

---

## Data Flow - After Fix (CORRECT)

```
All Transactions (Jan 1 - Jan 24)
          ↓
  ┌─────────────────────────┐
  │  getCurrentMonth()      │
  │  Returns: {             │
  │    year: 2026,          │
  │    month: 1,            │
  │    label: "Jan 2026"    │
  │  }                      │
  └─────────────────────────┘
          ↓
  ┌─────────────────────────┐
  │  getMonthTransactions() │
  │  Filter: year=2026      │
  │         month=1         │
  └─────────────────────────┘
          ↓
  Only January 2026 Transactions
          ↓
  ┌──────────────────────────────┐
  │  calculateMonthlyMetrics()   │
  │  ┌────────────────────────┐  │
  │  │ Opening Balance        │  │
  │  │ (from prev month)      │  │
  │  └────────────────────────┘  │
  │  ┌────────────────────────┐  │
  │  │ Sum Jan Income         │  │
  │  └────────────────────────┘  │
  │  ┌────────────────────────┐  │
  │  │ Sum Jan Expenses       │  │
  │  └────────────────────────┘  │
  │  ┌────────────────────────┐  │
  │  │ Closing Balance        │  │
  │  │ (from last Jan txn)    │  │
  │  └────────────────────────┘  │
  └──────────────────────────────┘
          ↓
    Dashboard Display
  ┌─────────────────────────────┐
  │ Balance: ₹41,816.55         │  ← CORRECT (actual)
  │ Monthly Spend: ₹X,XXX       │  ← CORRECT (Jan only)
  │ Monthly Income: ₹X,XXX      │  ← CORRECT (Jan only)
  │ Monthly Growth: X.XX%       │  ← CORRECT (calculated)
  └─────────────────────────────┘

  ✅ Shows ONLY current month data, metrics align
```

---

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         App Layout                               │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  AppSidebar (Navigation)                               │     │
│  │  - Dashboard                                           │     │
│  │  - Transactions                                        │     │
│  │  - Analytics                                           │     │
│  │  - Budget                                              │     │
│  │  [Settings/Help REMOVED]                               │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  SiteHeader                                            │     │
│  │  - Sidebar toggle                                      │     │
│  │  - Dynamic page title                                  │     │
│  │  [GitHub link REMOVED]                                 │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  Page Content                                          │     │
│  │                                                        │     │
│  │  Dashboard Page                                        │     │
│  │  ┌──────────────────────────────────────────────┐     │     │
│  │  │  MonthlySummaryCard (NEW)                    │     │     │
│  │  │  - Opening Balance: ₹XX,XXX                  │     │     │
│  │  │  - Closing Balance: ₹41,816.55               │     │     │
│  │  │  - Net Change: ±₹X,XXX                       │     │     │
│  │  │  - Growth Rate: X.XX%                        │     │     │
│  │  └──────────────────────────────────────────────┘     │     │
│  │  ┌──────────────────────────────────────────────┐     │     │
│  │  │  SectionCards                                │     │     │
│  │  │  - Balance | Spend | Income | Savings        │     │     │
│  │  │  (Now shows current month only)              │     │     │
│  │  └──────────────────────────────────────────────┘     │     │
│  │  ┌──────────────────────────────────────────────┐     │     │
│  │  │  ChartAreaInteractive                        │     │     │
│  │  └──────────────────────────────────────────────┘     │     │
│  │                                                        │     │
│  │  Analytics Page                                        │     │
│  │  ┌──────────────────────────────────────────────┐     │     │
│  │  │  Header + MonthSelector (NEW)                │     │     │
│  │  │  [< January 2026 >] [Dropdown ▾]             │     │     │
│  │  └──────────────────────────────────────────────┘     │     │
│  │  ┌──────────────────────────────────────────────┐     │     │
│  │  │  MonthlySummaryCard (NEW)                    │     │     │
│  │  │  (Shows selected month metrics)              │     │     │
│  │  └──────────────────────────────────────────────┘     │     │
│  │  ┌──────────────────────────────────────────────┐     │     │
│  │  │  Tabs: Trends | Categories | Savings | Comp │     │     │
│  │  │  (All charts filtered by selected month)     │     │     │
│  │  └──────────────────────────────────────────────┘     │     │
│  │                                                        │     │
│  │  Budget Page                                           │     │
│  │  ┌──────────────────────────────────────────────┐     │     │
│  │  │  Budget Period: January 2026                 │     │     │
│  │  │  (Now filters current month only)            │     │     │
│  │  └──────────────────────────────────────────────┘     │     │
│  │  ┌──────────────────────────────────────────────┐     │     │
│  │  │  Category Budget Cards                       │     │     │
│  │  │  (Shows current month spending vs budget)    │     │     │
│  │  └──────────────────────────────────────────────┘     │     │
│  └────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Library Architecture

```
lib/
├── types.ts (Existing - No changes)
│   └── Transaction, TransactionType, etc.
│
├── analytics.ts (Existing - Keep for compatibility)
│   ├── calculateAnalytics() - Uses ALL transactions
│   ├── calculateCategoryBreakdown()
│   ├── calculateMonthlyTrends()
│   └── [Other all-time functions]
│
├── balance-utils.ts (Existing - Keep)
│   ├── calculateAccountSummary()
│   ├── getBalanceAtDate()
│   └── calculateBalanceTrend()
│
└── monthly-utils.ts (NEW - Monthly-specific)
    ├── Types:
    │   ├── MonthIdentifier
    │   └── MonthlyMetrics
    │
    ├── Core Functions:
    │   ├── getMonthTransactions()
    │   ├── calculateMonthlyMetrics()
    │   ├── getMonthOpeningBalance()
    │   ├── getMonthClosingBalance()
    │   └── isPartialMonth()
    │
    ├── Helper Functions:
    │   ├── getAvailableMonths()
    │   ├── getCurrentMonth()
    │   ├── getPreviousMonth()
    │   ├── getNextMonth()
    │   └── isSameMonth()
    │
    ├── Analysis Functions:
    │   └── calculateMonthOverMonthGrowth()
    │
    └── Display Functions:
        ├── formatCurrency()
        └── formatCurrencyCompact()
```

---

## Calculation Flow

### Opening Balance Calculation

```
┌─────────────────────────────────────────────────────────┐
│  Calculate Opening Balance for Month M                  │
└─────────────────────────────────────────────────────────┘
                    ↓
         ┌──────────────────────┐
         │ Has previous month?  │
         └──────────────────────┘
          ↙ Yes          No ↘
    ┌──────────┐      ┌──────────────────┐
    │ Get last │      │ First month of   │
    │ balance  │      │ tracking?        │
    │ of prev  │      └──────────────────┘
    │ month    │           ↙ Yes
    └──────────┘      ┌──────────────────┐
         ↓            │ Calculate from   │
    Opening =         │ first txn:       │
    Previous          │ If income:       │
    Closing           │   balance - amt  │
                      │ If expense:      │
                      │   balance + amt  │
                      └──────────────────┘
                           ↓
                      Opening = Calculated
```

### Monthly Metrics Calculation

```
┌─────────────────────────────────────────────────────────┐
│  Calculate Metrics for Month M                          │
└─────────────────────────────────────────────────────────┘
                    ↓
    ┌───────────────────────────────┐
    │ 1. Get Opening Balance        │
    │    (from previous month end)  │
    └───────────────────────────────┘
                    ↓
    ┌───────────────────────────────┐
    │ 2. Filter Month Transactions  │
    │    (year=M, month=M)          │
    └───────────────────────────────┘
                    ↓
    ┌───────────────────────────────┐
    │ 3. Sum Income Transactions    │
    │    (type = 'income')          │
    └───────────────────────────────┘
                    ↓
    ┌───────────────────────────────┐
    │ 4. Sum Expense Transactions   │
    │    (type = 'expense')         │
    └───────────────────────────────┘
                    ↓
    ┌───────────────────────────────┐
    │ 5. Get Closing Balance        │
    │    (from last month txn)      │
    └───────────────────────────────┘
                    ↓
    ┌───────────────────────────────┐
    │ 6. Calculate Derived Metrics  │
    │    - Net Change               │
    │    - Net Savings              │
    │    - Growth Rate              │
    │    - Savings Rate             │
    └───────────────────────────────┘
                    ↓
    ┌───────────────────────────────┐
    │ 7. Return MonthlyMetrics      │
    └───────────────────────────────┘
```

---

## State Management Flow

```
┌─────────────────────────────────────────────────────────┐
│  Analytics Page State                                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  const transactions = useTransactions()                  │
│         ↓                                                │
│  const availableMonths = getAvailableMonths(txns)       │
│         ↓                                                │
│  const [selectedMonth, setSelectedMonth] = useState()   │
│         ↓                                                │
│  const monthTransactions = getMonthTransactions(         │
│         transactions, selectedMonth.year, month)         │
│         ↓                                                │
│  const monthlyMetrics = calculateMonthlyMetrics(         │
│         transactions, selectedMonth.year, month)         │
│         ↓                                                │
│  const analytics = calculateAnalytics(monthTransactions) │
│         ↓                                                │
│  Render UI with filtered data                           │
│                                                          │
└─────────────────────────────────────────────────────────┘

When user changes month:
  setSelectedMonth(newMonth)
       ↓
  monthTransactions recalculates (useMemo)
       ↓
  monthlyMetrics recalculates (useMemo)
       ↓
  analytics recalculates (useMemo)
       ↓
  UI re-renders with new data
```

---

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────┐
│  Monthly Calculation with Error Handling                 │
└─────────────────────────────────────────────────────────┘
                    ↓
         ┌──────────────────────┐
         │ No transactions?     │
         └──────────────────────┘
          ↙ Yes          No ↘
    ┌──────────┐      ┌──────────────────┐
    │ Return   │      │ Missing balance  │
    │ all 0    │      │ data?            │
    │ values   │      └──────────────────┘
    └──────────┘       ↙ Yes        No ↘
                 ┌──────────┐   ┌──────────┐
                 │ Log warn │   │ Division │
                 │ Fallback │   │ by zero? │
                 │ to calc  │   └──────────┘
                 └──────────┘    ↙ Yes  No ↘
                            ┌─────┐   ┌─────┐
                            │ Ret │   │ Cal │
                            │ 0   │   │ OK  │
                            └─────┘   └─────┘
                                         ↓
                                    ┌─────────┐
                                    │ Float   │
                                    │ error?  │
                                    └─────────┘
                                     ↙ Yes
                                ┌─────────┐
                                │ Round   │
                                │ to 2dp  │
                                └─────────┘
```

---

## Integration Points

```
┌─────────────────────────────────────────────────────────┐
│                  External Systems                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Google Sheets API                                       │
│       ↓                                                  │
│  /api/sheets/sync                                        │
│       ↓                                                  │
│  Store in localStorage                                   │
│       ↓                                                  │
│  useTransactions hook                                    │
│       ↓                                                  │
│  ┌─────────────┬─────────────┬─────────────┐           │
│  │ Dashboard   │ Analytics   │ Budget      │           │
│  │ Page        │ Page        │ Page        │           │
│  └─────────────┴─────────────┴─────────────┘           │
│                                                          │
│  All pages use monthly-utils for calculations           │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Performance Considerations

```
Optimization Strategy:

1. Memoization
   ┌─────────────────────────────────┐
   │ useMemo for expensive calcs:    │
   │ - availableMonths               │
   │ - monthTransactions             │
   │ - monthlyMetrics                │
   │ - analytics                     │
   └─────────────────────────────────┘

2. Caching
   ┌─────────────────────────────────┐
   │ Month selector:                 │
   │ Cache calculated months         │
   │ Only recalc when txns change    │
   └─────────────────────────────────┘

3. Lazy Loading
   ┌─────────────────────────────────┐
   │ Charts:                         │
   │ Only render visible tab         │
   │ Defer heavy visualizations      │
   └─────────────────────────────────┘

Expected Performance:
- Initial load: <2 seconds
- Month change: <100ms
- Tab switch: <50ms
```

---

## Security Considerations

```
┌─────────────────────────────────────────────────────────┐
│  Security Layers                                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. Authentication                                       │
│     useAuth() → Verify login → Access granted           │
│                                                          │
│  2. API Protection                                       │
│     /api/transactions → JWT validation → Return data    │
│                                                          │
│  3. Client-Side Validation                              │
│     Input sanitization → Type checking → Processing     │
│                                                          │
│  4. Data Privacy                                         │
│     No sensitive data in URLs → LocalStorage encrypted  │
│                                                          │
└─────────────────────────────────────────────────────────┘

No security changes needed - maintains existing security.
```

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Development Environment                                 │
│  - npm run dev                                           │
│  - Testing on localhost:3000                            │
└─────────────────────────────────────────────────────────┘
                    ↓
        git commit → git push
                    ↓
┌─────────────────────────────────────────────────────────┐
│  CI/CD Pipeline (e.g., Vercel)                          │
│  - npm run build                                         │
│  - npm run lint                                          │
│  - Type checking                                         │
│  - Deploy to preview                                     │
└─────────────────────────────────────────────────────────┘
                    ↓
        Manual validation on preview
                    ↓
┌─────────────────────────────────────────────────────────┐
│  Production Environment                                  │
│  - Deployed on Vercel/similar                           │
│  - Available at production URL                          │
│  - Monitored for errors                                 │
└─────────────────────────────────────────────────────────┘
```

---

## Rollback Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Rollback Strategy                                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  master branch                                           │
│       ↓                                                  │
│  Create backup-before-monthly-fix branch                │
│       ↓                                                  │
│  Implement changes on master                            │
│       ↓                                                  │
│  ┌──────────────────┐                                   │
│  │ Issue detected?  │                                   │
│  └──────────────────┘                                   │
│   ↙ Yes        No ↘                                     │
│  git revert    Success!                                 │
│  OR                                                      │
│  git reset --hard backup                                │
│       ↓                                                  │
│  Immediate rollback                                     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Future Enhancement Architecture

```
Current: Monthly View
    ↓
Future Enhancements:

1. Custom Date Ranges
   ┌─────────────────────────┐
   │ [Start Date] [End Date] │
   │ [Apply]                 │
   └─────────────────────────┘

2. Multi-Month Comparison
   ┌─────────────────────────────┐
   │ Compare:                    │
   │ [Month 1] vs [Month 2]      │
   │ Side-by-side view           │
   └─────────────────────────────┘

3. Year-to-Date View
   ┌─────────────────────────────┐
   │ YTD Summary                 │
   │ Jan-Dec 2026 aggregate      │
   └─────────────────────────────┘

4. Budget Forecasting
   ┌─────────────────────────────┐
   │ AI-powered predictions      │
   │ Based on historical trends  │
   └─────────────────────────────┘
```

---

## Summary

This architecture:
- ✅ Treats months as primary unit (not all-time cumulative)
- ✅ Uses actual balance from sheets (source of truth)
- ✅ Handles partial months correctly
- ✅ Provides easy month navigation
- ✅ Maintains backward compatibility
- ✅ Easy to test and validate
- ✅ Simple rollback if needed
- ✅ No new dependencies
- ✅ Performance optimized with memoization
- ✅ Extensible for future enhancements

**Key Innovation:** Monthly-first approach with balance-based calculations instead of cumulative totals.
