# Finance Tracker - Feature Implementation Plan v2

## Overview
Personal finance tracker feature expansion for single-user personal use.
**Stack:** Next.js 16.1.4, React 19, TypeScript, MongoDB Atlas, shadcn/ui, Recharts, Framer Motion, TanStack Query, OpenRouter AI (Claude Sonnet 4.5).

---

## PHASE 1: Core Transaction & Data Features

### 1.1 Delete Transaction
**Files:** `app/transactions/page.tsx`, `app/api/transactions/route.ts`

- Add `DELETE` method to `app/api/transactions/route.ts` accepting `?id=xxx` or `?ids=xxx,yyy` for bulk
- Delete from MongoDB `transactions` collection by `_id`
- In transaction table: add `IconTrash` button per row (visible on hover)
- AlertDialog confirmation: "Delete this transaction? This cannot be undone."
- Bulk delete: if checkboxes selected, show "Delete Selected" button in toolbar
- After delete, call `refresh()` to refetch; toast success/error

### 1.2 Recurring Transaction Detection
**New file:** `lib/recurring.ts`
**Modified:** `app/transactions/page.tsx`

- Group transactions by normalized merchant (use `cleanBankText()` from categorizer)
- For each group (2+ txns): check amount within 10% tolerance + interval consistency (monthly: 25-35 days, weekly: 5-9, quarterly: 80-100)
- Return: `{ merchant, avgAmount, frequency, lastDate, nextExpected, category, count }`
- Show "Recurring" badge on matching transactions in table
- Add "Recurring" filter toggle in toolbar
- New API: `GET /api/recurring` returns all detected recurring transactions

### 1.3 Subscription Tracker
**New files:** `app/subscriptions/page.tsx`, `app/api/subscriptions/route.ts`
**Modified:** `components/app-sidebar.tsx`

- Build on recurring detection (1.2) to identify subscriptions (monthly/yearly digital services)
- Page layout:
  - Stat tiles: Active count, Monthly total, Yearly projection
  - Active subscriptions list: name, amount, frequency, category, last charged, next expected
  - Manual add/remove support (some won't auto-detect)
  - "Cancelled" marking (hides from active list)
- MongoDB collection `subscriptions` for manual entries
- Add to sidebar: Planning > Subscriptions (IconRepeat)

### 1.4 Agent Conversation Persistence
**Modified:** `app/agent/page.tsx`, `app/api/agent/chat/route.ts`
**New file:** `app/api/agent/threads/route.ts`

- MongoDB collection `agent_threads`: `{ threadId, messages: [{ role, content, timestamp }], title, createdAt, updatedAt }`
- API endpoints:
  - `GET /api/agent/threads` - List threads (title, preview, date)
  - `GET /api/agent/threads/[id]` - Full thread
  - `DELETE /api/agent/threads/[id]` - Delete thread
- Update `POST /api/agent/chat` to persist messages
- Auto-title from first user message (truncated 50 chars)
- Agent page: sidebar/drawer with conversation history, "New Chat" button, load old threads, delete option
- Load last active thread on mount

### 1.5 Goal Auto-Contribution Linking
**New file:** `lib/goal-linking.ts`
**Modified:** `app/goals/page.tsx`, `app/api/savings-goals/route.ts`

- For each goal, define matching rules:
  - Emergency Fund/Savings goals: match "Savings"/"Investment" categories, or descriptions with "savings", "FD", "RD"
  - Education goals: match education-related savings
  - Custom: user sets keyword/category per goal
- Scan transactions within goal date range, sum as contributions
- Add `linkedCategories` and `linkedKeywords` fields to goal schema
- Goals page: show auto-linked + manual contributions, "Link Settings" per goal
- Progress rings reflect total (manual + auto-linked)

---

## PHASE 2: Analytics Upgrades

### 2.1 Month-over-Month Comparison
**Modified:** `app/analytics/page.tsx`

- New "Comparison" section/tab in Analytics
- Fetch current + previous month transactions
- Show: per-category grouped bar chart (this month vs last), total expense/income +/-% cards
- Highlight: "Shopping up 45%", "Food down 12%" top changes list

### 2.2 Category Trend Over Time
**Modified:** `app/analytics/page.tsx`

- "Trends" section with multi-line Recharts LineChart
- X-axis: months (6), each line = category
- Toggle categories on/off via checkbox legend
- Default: top 5 spending categories
- Color-matched to CATEGORY_COLORS

### 2.3 Predictive Cashflow
**Modified:** `app/dashboard/page.tsx`

- Calculate: `(totalExpensesSoFar / daysElapsed) * totalDaysInMonth`
- Show as card/inline below expenses tile: "Projected month-end: Rs.X"
- Color: green if < budget, amber if close, red if over
- Also: "Rs.X/day average", "Rs.Y remaining daily budget"

### 2.4 Spending Heatmap
**New file:** `components/spending-heatmap.tsx`
**Modified:** `app/analytics/page.tsx`

- CSS grid calendar: 7 rows x N weeks (last 3 months)
- Cell color intensity = daily spending amount (green-to-red scale)
- Tooltip: date, total spent, transaction count
- GitHub contribution graph style

---

## PHASE 3: Budget Improvements

### 3.1 Budget History
**New file:** `app/api/budgets/history/route.ts`
**Modified:** `app/budget/page.tsx`

- MongoDB collection `budget_history`: `{ month, year, categories: [{ name, budget, spent, percentage }], totals }`
- Auto-snapshot at month-end (or first access of new month)
- "History" tab in Budget page: table with month rows, expand for per-category breakdown
- Mini sparkline showing adherence trend over 6 months

### 3.2 In-App Budget Alerts
**New file:** `lib/budget-alerts.ts`
**Modified:** `app/dashboard/page.tsx`, `app/budget/page.tsx`

- Compare per-category spending vs budget
- Levels: Warning (80-99%), Critical (100-120%), Exceeded (>120%)
- On page load: show toast via Sonner (max 3 to avoid spam)
- Dismiss; don't re-show same session (sessionStorage)

### 3.3 Rollover Budgets
**Modified:** `app/budget/page.tsx`, `app/api/budgets/route.ts`

- `rollover: boolean` flag per category (default: false)
- If enabled: previous month's `(budget - spent)` carries forward (capped at 100% of base)
- Toggle switch per row: "Rollover unspent"
- Display: "Base: Rs.5,000 + Rollover: Rs.1,200 = Rs.6,200"

---

## PHASE 4: Wealth & Tax

### 4.1 Tax Estimation Page
**New files:** `app/tax/page.tsx`, `app/api/tax/route.ts`
**Modified:** `components/app-sidebar.tsx`

**Income Section:**
- Gross annual income (auto-calculate from transactions or manual input)
- Other income: FD interest, capital gains (STCG/LTCG), rental income

**Deductions (Old Regime):**
- 80C (Rs.1.5L limit): PPF, ELSS, LIC, EPF, tuition, home loan principal — auto-detect PPF/ELSS from transactions
- 80D: Health insurance (Rs.25K self, Rs.50K parents)
- 80TTA: Savings interest (Rs.10K)
- Section 24: Home loan interest (Rs.2L)
- 80E: Education loan interest
- HRA: basic salary, HRA received, rent paid, metro/non-metro
- 80CCD(1B): NPS additional Rs.50K

**Standard Deduction:** Rs.75K new / Rs.50K old (FY 2025-26)

**Tax Calculation:**
- Old regime slabs with deductions
- New regime FY 2025-26: 0-4L nil, 4-8L 5%, 8-12L 10%, 12-16L 15%, 16-20L 20%, 20-24L 25%, >24L 30%
- Side-by-side comparison with "which saves more" highlight
- Health & education cess 4%
- 80C utilization meter: "Used Rs.X of Rs.1.5L"

MongoDB: `tax_config` collection, persist inputs across sessions
Sidebar: Wealth > Tax Planner (IconReceipt2)

### 4.2 Consolidated Net Worth
**Modified:** `app/financial-health/page.tsx`

- Hero metric: Bank balance + Stocks + MFs + PPF + FDs + NPS - Debts
- Asset allocation pie chart across classes
- Net worth change: month vs last month (absolute + %)
- Enhance existing net worth timeline

### 4.3 Debt/EMI Tracker
**New file:** `app/api/debts/route.ts`
**Modified:** `app/financial-health/page.tsx`

- MongoDB `debts`: `{ name, type, principal, interestRate, emiAmount, tenure, startDate, paidEMIs, remainingBalance }`
- CRUD API
- "Debt Tracker" section: total outstanding, active debts list (name, remaining, EMI, next due, months left)
- Payoff timeline visualization
- Auto-detect EMI from recurring transaction detection
- Subtract from net worth

---

## PHASE 5: AI Enhancements

### 5.1 Anomaly Detection
**New file:** `lib/anomaly.ts`
**Modified:** `app/dashboard/page.tsx`, `app/transactions/page.tsx`

- Per-category: mean + stddev of amounts (last 3 months)
- Flag: > 2 stddev above mean, first-time large merchants
- Return: `{ transactionId, reason, severity, expectedRange }`
- Anomaly badge on transactions table
- Dashboard: "Unusual Activity" card

### 5.2 What-If Simulator
**Modified:** `app/planner/page.tsx`

- "What-If" section: adjust any category budget up/down
- Real-time recalculation: monthly savings change, goal timeline impact, FIRE date change, annual impact
- Reuse existing financial-health and goals calculations with modified inputs

### 5.3 Smart Daily Summary
**Modified:** `app/dashboard/page.tsx`

- Computed (no AI): today's spending, top category, budget remaining, days left, daily budget
- Format: "Spent Rs.2,400 today on Food. Rs.15,200 remaining (Rs.1,267/day for 12 days)."
- Subtle banner at top of dashboard
- No-spend day: "No spending today. Rs.X daily budget available."

---

## PHASE 6: UX Polish

### 6.1 Keyboard Shortcuts
**New file:** `hooks/use-keyboard-shortcuts.ts`
**Modified:** `app/layout.tsx`, `components/help-dialog.tsx`

- Two-key chord: `g` then within 500ms: `d`=Dashboard, `t`=Transactions, `a`=Analytics, `b`=Budget, `i`=Investments, `h`=Health, `g`=Goals, `p`=Planner
- `/` or `Ctrl+K` = Focus search
- `n` = New transaction dialog
- `?` = Show shortcuts help
- `Escape` = Close dialogs
- Skip when typing in input/textarea

### 6.2 Quick-Add Transaction
**New file:** `components/quick-add.tsx`
**Modified:** `app/layout.tsx`

- Minimal dialog: amount (required), description, category dropdown, date (today default), type toggle
- Triggered by: `Ctrl+N` from any page, floating "+" button (bottom-right)
- Auto-categorize from description
- POST to `/api/transactions`, toast result

### 6.3 Chart Theme Audit
**Modified:** All pages with Recharts

- Audit every chart: axis labels, grid lines, tooltips, legends
- Replace hardcoded colors with CSS variables
- Test both dark and light modes on every page

---

## Code Quality Standards
- TypeScript strict, minimal `any`
- All new API routes use `withAuth()` middleware
- TanStack Query for fetching (queries + mutations + cache invalidation)
- Follow existing patterns: `lib/` for logic, `hooks/` for React hooks, `app/api/` for routes
- Use shadcn/ui components, Framer Motion animations (`lib/motion.ts`), `formatINR()` from `lib/format.ts`
- Toast via Sonner for all user actions

## New MongoDB Collections
- `subscriptions`, `agent_threads`, `budget_history`, `tax_config`, `debts`

## Sidebar Additions
- Planning > Subscriptions (IconRepeat)
- Wealth > Tax Planner (IconReceipt2)
