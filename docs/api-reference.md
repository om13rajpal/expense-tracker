# API Reference

All endpoints are under `/api/`. Authentication required unless noted.

## Authentication

### POST /api/auth/login
Authenticate with username and password.
- **Body:** `{ email: string, password: string }`
- **Response:** `{ success: true, token: string, user: { id, name, email } }`
- **Cookie:** Sets `auth-token` httpOnly cookie

### POST /api/auth/logout
Clear authentication cookie.
- **Response:** `{ success: true }`

### GET /api/auth/me
Get current authenticated user.
- **Response:** `{ id, name, email }`

### GET /api/auth/verify
Check if current token is valid.
- **Response:** `{ authenticated: boolean, user?: { id, name, email } }`

---

## Transactions

### GET /api/transactions
List transactions with optional filters.
- **Query:** `?month=YYYY-MM&category=Food&type=debit&search=swiggy&page=1&limit=50`
- **Response:** `{ transactions: Transaction[], total: number, page: number }`

### POST /api/transactions/recategorize
Reapply categorization rules to all transactions.
- **Response:** `{ success: true, updated: number }`

### GET /api/transactions/recurring
Detect recurring transactions from last 6 months.
- **Response:** `{ recurring: RecurringTransaction[] }`

---

## Budgets

### GET /api/budgets
Get all budget categories with current spending.
- **Response:** `{ categories: BudgetCategory[] }`

### POST /api/budgets
Bulk update all budget amounts.
- **Body:** `{ categories: { name: string, amount: number }[] }`

### PUT /api/budgets
Update single category budget.
- **Body:** `{ category: string, amount: number }`

### PATCH /api/budgets
Toggle rollover for a category.
- **Body:** `{ category: string, rollover: boolean }`

### GET /api/budgets/history
Get budget snapshots for past months.
- **Query:** `?months=6`
- **Response:** `{ history: MonthlyBudgetSnapshot[] }`

### GET /api/budgets/suggest
Get AI-powered budget suggestions based on spending patterns.
- **Response:** `{ suggestions: { category: string, suggested: number, reason: string }[] }`

---

## AI & Insights

### GET /api/ai/insights
Get cached AI insight or trigger generation.
- **Query:** `?type=spending_analysis|monthly_budget|weekly_budget|investment_insights|tax_optimization|planner_recommendation`
- **Response:** `{ content: string, metadata: { generatedAt, dataPoints } }`

### POST /api/ai/analyze
Generate fresh spending analysis.
- **Body:** `{ month?: string }`
- **Response:** `{ analysis: string, metadata: object }`

### POST /api/ai/recommendations
Get AI financial recommendations.
- **Response:** `{ recommendations: string }`

### GET /api/ai/sip-insights
Get SIP investment insights.
- **Response:** `{ insights: string }`

### POST /api/agent/chat
Stream AI financial advisor response.
- **Body:** `{ message: string, threadId?: string }`
- **Response:** Server-sent event stream with AI response chunks

### GET /api/agent/threads
List or fetch conversation threads.
- **Query:** `?id=threadId` (optional, fetches single thread)
- **Response:** `{ threads: Thread[] }` or `{ thread: Thread }`

### DELETE /api/agent/threads
Delete a conversation thread.
- **Query:** `?id=threadId`

---

## Investments

### Stocks

#### GET /api/stocks
List all stock holdings.
- **Response:** `{ stocks: StockHolding[] }`

#### POST /api/stocks
Add stock holding(s).
- **Body:** `{ symbol, exchange, shares, averageCost }` or array for bulk import

#### PUT /api/stocks
Update stock holding.
- **Query:** `?id=stockId`
- **Body:** `{ shares?, averageCost? }`

#### DELETE /api/stocks
Delete stock holding.
- **Query:** `?id=stockId`

#### GET /api/stocks/quotes
Fetch live stock prices.
- **Response:** `{ quotes: { symbol: string, price: number, change: number }[] }`

#### GET /api/stocks/transactions
List stock transaction history.

#### POST /api/stocks/transactions
Record stock buy/sell.
- **Body:** `{ stockId, type: "BUY"|"SELL", quantity, price, date }`

### Mutual Funds

#### GET /api/mutual-funds
List all mutual fund holdings.

#### POST /api/mutual-funds
Add mutual fund holding(s).

#### PUT /api/mutual-funds
Update mutual fund holding.
- **Query:** `?id=fundId`

#### DELETE /api/mutual-funds
Delete mutual fund holding.
- **Query:** `?id=fundId`

#### GET /api/mutual-funds/nav
Fetch latest NAV for holdings.

#### GET /api/mutual-funds/transactions
List fund transaction history.

#### POST /api/mutual-funds/transactions
Record fund purchase/sale.

### SIPs

#### GET /api/sips
List all SIPs.

#### POST /api/sips
Create new SIP.
- **Body:** `{ name, provider, monthlyAmount, startDate, status }`

#### PUT /api/sips
Update SIP.
- **Query:** `?id=sipId`

#### DELETE /api/sips
Delete SIP.
- **Query:** `?id=sipId`

---

## Goals

### GET /api/savings-goals
List savings goals with computed progress and auto-linked contributions.

### POST /api/savings-goals
Create savings goal.
- **Body:** `{ name, targetAmount, targetDate, currentAmount? }`

### PUT /api/savings-goals
Update goal or increment amount.
- **Body:** `{ id, name?, targetAmount?, currentAmount?, increment? }`

### DELETE /api/savings-goals
Delete goal.
- **Query:** `?id=goalId`

### GET /api/income-goals
List income goals.

### POST /api/income-goals
Create income goal.
- **Body:** `{ targetIncome, period }`

---

## Financial Health

### GET /api/financial-health
Comprehensive health score with metrics.
- **Response:** `{ score, metrics: { savingsRate, emergencyFundRatio, expenseVelocity, debtToIncome, netWorthTimeline } }`

### GET /api/projections
Financial projections.
- **Response:** `{ projections: ProjectionData }`

### GET /api/recurring
Detect recurring transactions.
- **Query:** `?tolerance=0.1&minCount=2`

---

## Subscriptions & Debts

### Subscriptions
- **GET /api/subscriptions** - List all
- **POST /api/subscriptions** - Create
- **PATCH /api/subscriptions** - Update
- **DELETE /api/subscriptions?id=x** - Delete

### Debts
- **GET /api/debts** - List all
- **POST /api/debts** - Create
- **PATCH /api/debts** - Update
- **DELETE /api/debts?id=x** - Delete

---

## Tax

### GET /api/tax
Get tax configuration and deductions.

### POST /api/tax
Save tax settings.
- **Body:** `{ regime, income, deductions: { section80C, section80D, ... } }`

---

## Learning

### POST /api/learn/generate
Generate AI lesson content (cached 7 days).
- **Body:** `{ topic: string }`
- **Response:** `{ content: string, quiz?: Quiz }`

### GET /api/learn/progress
Get learning progress.

### POST /api/learn/quiz
Grade quiz answers.
- **Body:** `{ lessonId, answers: number[] }`

---

## Data Management

### GET /api/sheets/sync
Trigger Google Sheets transaction sync.

### POST /api/sheets/sync
Manual sync trigger.

### GET /api/reports/export
Export transactions as CSV.
- **Query:** `?from=2024-01-01&to=2024-12-31&category=Food&type=debit`

### GET /api/notifications
Get notifications.
- **Query:** `?unread=true`

### PATCH /api/notifications
Mark notifications as read.
- **Body:** `{ ids: string[] }`

### DELETE /api/notifications
Delete notification.
- **Query:** `?id=notificationId`

---

## Configuration

### GET /api/budget-categories
List available budget categories.

### GET /api/categorization-rules
List auto-categorization rules.

### POST /api/categorization-rules
Create new categorization rule.
- **Body:** `{ pattern: string, category: string }`

### GET /api/nwi-config
Get Net Worth Index configuration.

---

## Cron (Legacy)

### GET /api/cron/sync
Trigger transaction sync (requires `x-cron-secret` header).

### GET /api/cron/prices
Trigger price refresh (requires `x-cron-secret` header).

### GET /api/cron/analyze
Trigger AI analysis (requires `x-cron-secret` header).

### GET /api/cron/status
Check cron job execution status.

### POST /api/inngest
Inngest webhook handler (managed by Inngest SDK).
