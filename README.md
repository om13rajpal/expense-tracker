# Finance Tracker

A full-stack personal finance management app built with Next.js 16, React 19, and MongoDB. Features AI-powered spending insights, Google Sheets transaction sync, investment portfolio tracking, and event-driven background workflows.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.1.4 (App Router, Turbopack) |
| Frontend | React 19, TypeScript 5, Tailwind CSS 4 |
| UI Components | Radix UI, Shadcn/ui, Lucide + Tabler icons |
| Database | MongoDB 7 |
| Authentication | JWT with httpOnly cookies |
| AI/LLM | OpenRouter (Claude Sonnet 4.5) |
| Data Source | Google Sheets (CSV export / Sheets API) |
| Background Jobs | Inngest (event-driven workflows) |
| Charts | Recharts |
| Animations | Motion (Framer Motion) |
| Deployment | Vercel |

## Features

### Core Finance
- **Transaction Management** - Auto-synced from Google Sheets with smart categorization
- **Budget Tracking** - Per-category budgets with rollover support and AI-powered suggestions
- **Recurring Detection** - Automatic identification of recurring expenses (rent, subscriptions, EMIs)
- **Financial Health Score** - Composite metric from savings rate, emergency fund, expense velocity, and debt-to-income

### Investments
- **Stock Portfolio** - Holdings, buy/sell transactions, live price quotes (Yahoo Finance)
- **Mutual Funds** - NAV tracking via MFAPI, folio management
- **SIPs** - Systematic Investment Plan tracking and deduction matching
- **XIRR Calculator** - Annualized returns using Newton-Raphson method

### AI-Powered Insights
- **Spending Analysis** - Pattern detection, anomaly flagging, category breakdowns
- **Budget Recommendations** - Monthly and weekly budget performance analysis
- **Investment Insights** - Portfolio analysis with market context (Tavily search)
- **Tax Optimization** - Deduction suggestions under Indian tax regime
- **Financial Planner** - Goal-based planning recommendations
- **AI Chat Agent** - Conversational financial advisor with full context streaming

### Additional
- **Tax Calculator** - Indian tax regime computation with Section 80C/80D deductions
- **Learning Center** - AI-generated personalized financial education with quizzes
- **Subscriptions Tracker** - Renewal alerts, cost tracking
- **Debt Management** - EMI tracking, payoff projections
- **Notifications** - Budget breach warnings, renewal reminders, weekly digest
- **Reports** - CSV export with date/category/type filters
- **Command Palette** - Quick navigation and actions (Cmd+K)

## Directory Structure

```
.
├── app/                    # Next.js pages and API routes
│   ├── api/                # 46 REST API endpoints
│   │   ├── auth/           # Login, logout, verify, me
│   │   ├── transactions/   # CRUD, recategorize, recurring
│   │   ├── budgets/        # Budget management + history + suggestions
│   │   ├── ai/             # AI insights, recommendations, SIP analysis
│   │   ├── agent/          # AI chat agent with streaming
│   │   ├── stocks/         # Stock holdings, transactions, quotes
│   │   ├── mutual-funds/   # MF holdings, transactions, NAV
│   │   ├── sips/           # Systematic Investment Plans
│   │   ├── savings-goals/  # Goal tracking with auto-linked contributions
│   │   ├── income-goals/   # Income target tracking
│   │   ├── financial-health/ # Health score computation
│   │   ├── projections/    # Financial projections
│   │   ├── tax/            # Tax config and calculations
│   │   ├── learn/          # AI-generated lessons and quizzes
│   │   ├── subscriptions/  # Subscription management
│   │   ├── debts/          # Debt tracking
│   │   ├── notifications/  # Notification system
│   │   ├── sheets/         # Google Sheets sync
│   │   ├── cron/           # Legacy cron job endpoints
│   │   ├── inngest/        # Inngest webhook handler
│   │   ├── reports/        # CSV export
│   │   └── nwi-config/     # Net Worth Index config
│   ├── dashboard/          # Main dashboard
│   ├── transactions/       # Transaction list with filters
│   ├── budget/             # Budget overview and management
│   ├── analytics/          # Spending analytics + weekly view
│   ├── investments/        # Portfolio overview
│   ├── goals/              # Savings goals
│   ├── financial-health/   # Health score dashboard
│   ├── subscriptions/      # Subscription management
│   ├── tax/                # Tax calculator
│   ├── learn/              # Learning center
│   ├── ai-insights/        # AI insights dashboard
│   ├── planner/            # Financial planner
│   ├── agent/              # AI chat interface
│   └── login/              # Authentication page
├── components/             # React components
│   ├── ui/                 # Shadcn/ui primitives
│   ├── planning/           # Budget planning components
│   ├── wealth/             # Investment/wealth components
│   └── providers/          # Context providers (React Query, Theme)
├── hooks/                  # Custom React hooks
├── inngest/                # Event-driven workflow definitions
├── lib/                    # Business logic and utilities
├── public/                 # Static assets
├── scripts/                # Maintenance and migration scripts
└── docs/                   # Project documentation
```

## Setup

### Prerequisites
- Node.js 20+
- MongoDB instance (local or Atlas)
- Google Sheets with transaction data (optional)
- OpenRouter API key (for AI features)

### Environment Variables

Create a `.env.local` file:

```env
# Required
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net
MONGODB_DB=finance
AUTH_USERNAME=your_username
AUTH_PASSWORD=your_password
JWT_SECRET=your_jwt_secret

# AI Features
OPENROUTER_API_KEY=sk-or-...

# Google Sheets Sync
GOOGLE_SHEETS_ID=your_sheet_id
GOOGLE_API_KEY=your_google_api_key
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_sa@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# Investment Data
FINNHUB_API_KEY=your_finnhub_key

# Background Jobs
CRON_SECRET=your_cron_secret

# Optional
TAVILY_API_KEY=your_tavily_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Installation

```bash
npm install
npm run dev
```

The app runs at `http://localhost:3000`.

### Google Sheets Format

The app expects a Google Sheet with these columns:

| Column | Description |
|---|---|
| txn_id | Unique transaction identifier |
| value_date | Transaction date |
| post_date | Posting date |
| description | Transaction description |
| reference_no | Bank reference number |
| debit | Debit amount (expenses) |
| credit | Credit amount (income) |
| balance | Running balance |

## MongoDB Collections

| Collection | Purpose |
|---|---|
| `transactions` | Synced transactions from Google Sheets |
| `stocks` | Stock holdings |
| `stock_transactions` | Stock buy/sell history |
| `mutual_funds` | Mutual fund holdings |
| `mutual_fund_transactions` | MF purchase/sale history |
| `sips` | Systematic Investment Plans |
| `budget_categories` | Per-category budget amounts |
| `categorization_rules` | Auto-categorization rules |
| `subscriptions` | Recurring subscriptions |
| `debts` | Debt entries |
| `agent_threads` | AI chat conversation history |
| `savings_goals` | Savings goal tracking |
| `notifications` | User notifications |
| `ai_analyses` | Cached AI insights (24h TTL) |
| `cron_runs` | Background job execution logs |
| `learn_content` | Cached lesson content (7-day TTL) |

## Background Workflows (Inngest)

| Workflow | Schedule | Description |
|---|---|---|
| Sync Transactions | Event-driven | Fetches transactions from Google Sheets |
| Refresh Prices | Weekdays 10:00 AM UTC | Updates stock prices and mutual fund NAVs |
| Scheduled Insights | Monday 9:00 AM UTC | Generates AI insights for all insight types |
| Budget Breach Check | Daily 8:00 PM UTC | Warns when spending exceeds budget thresholds |
| Renewal Alerts | Daily 9:00 AM UTC | Notifies about subscriptions renewing within 3 days |
| Weekly Digest | Sunday 9:00 AM UTC | Summarizes weekly spending and portfolio changes |
| Post-Sync Insights | After sync | Auto-generates spending/budget insights |
| Post-Prices Insights | After price update | Auto-generates investment insights |

## Deployment

Deployed on Vercel with:
- Inngest integration for background jobs
- MongoDB Atlas for database
- Environment variables configured in Vercel dashboard

```bash
npm run build
```

## Scripts

| Script | Purpose |
|---|---|
| `scripts/audit-categories.js` | Audit transaction categories for accuracy |
| `scripts/fix-income-categories.js` | Fix misclassified income transactions |
| `scripts/migrate-categories.js` | Migrate categories to new schema |
| `scripts/migrate-overrides.js` | Migrate manual category overrides |
| `scripts/import-groww.js` | Import investment data from Groww |
| `scripts/comprehensive_verification.js` | Verify data integrity |
| `scripts/generate-secret.js` | Generate JWT secret |
| `scripts/test-api.js` | Test API endpoints locally |

## License

Private project.
