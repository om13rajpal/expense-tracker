# Architecture

## System Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ Google       │────▶│ Next.js API  │────▶│ MongoDB     │
│ Sheets       │     │ Routes       │     │             │
└─────────────┘     └──────┬───────┘     └─────────────┘
                           │
                    ┌──────┴───────┐
                    │ Inngest      │
                    │ Workflows    │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ OpenRouter│ │ Yahoo    │ │ MFAPI    │
        │ (Claude)  │ │ Finance  │ │          │
        └──────────┘ └──────────┘ └──────────┘
```

## Data Flow

### Transaction Sync
1. Google Sheets holds raw bank transaction data (exported from bank statements)
2. Sync triggered via Inngest schedule or manual button
3. `lib/sheets.ts` fetches CSV data, parsing with column detection
4. Each transaction is categorized using `lib/categorizer.ts` rules
5. Deduplication by `txn_id` before MongoDB insert
6. User's manual category overrides preserved across syncs
7. Post-sync event triggers AI insight generation

### AI Insight Pipeline
1. Client requests insight via `/api/ai/insights?type=spending_analysis`
2. Server checks `ai_analyses` collection for cached result
3. If stale (>24 hours), triggers regeneration
4. `lib/ai-pipeline.ts` builds financial context from transactions, budgets, goals
5. Sends prompt to OpenRouter (Claude Sonnet 4.5) with structured output instructions
6. Response cached in MongoDB with metadata (tokens used, generation time)
7. Falls back to stale cache if generation fails

### Investment Tracking
1. Stock holdings stored in `stocks` collection with buy/sell history in `stock_transactions`
2. Mutual fund holdings in `mutual_funds` with transactions in `mutual_fund_transactions`
3. SIPs tracked in `sips` collection
4. Prices refreshed via Inngest (weekday mornings)
5. Stock quotes from Yahoo Finance API
6. Mutual fund NAVs from MFAPI (mfapi.in)
7. Returns calculated using XIRR (Newton-Raphson method in `lib/xirr.ts`)

## Authentication

Single-user JWT authentication:

```
Login → POST /api/auth/login { email, password }
        ↓
        Validate against AUTH_USERNAME/AUTH_PASSWORD env vars
        ↓
        Generate JWT (7-day expiry)
        ↓
        Set httpOnly cookie "auth-token"
        ↓
        All API routes verify cookie via requireAuth()
```

## Inngest Event Architecture

```
┌──────────────────┐
│ Scheduled Crons   │
├──────────────────┤
│ refreshPrices     │──▶ finance/prices.updated ──▶ postPricesInsights
│ scheduledInsights │──▶ finance/insights.generate ──▶ generateUserInsights
│ budgetBreachCheck │──▶ notifications
│ renewalAlert      │──▶ notifications
│ weeklyDigest      │──▶ notifications
└──────────────────┘

┌──────────────────┐
│ Event-Driven      │
├──────────────────┤
│ syncTransactions  │──▶ finance/sync.completed ──▶ postSyncInsights
└──────────────────┘
```

Concurrency: Max 3 global, 1 per user. Retries: 2 attempts on failure.

## Key Libraries

| Library | Role |
|---|---|
| `lib/ai-pipeline.ts` | AI insight generation pipeline (40KB, largest file) |
| `lib/categorizer.ts` | Transaction auto-categorization with 200+ merchant rules |
| `lib/sheets.ts` | Google Sheets fetch, parse, and sync |
| `lib/analytics.ts` | Spending analytics, trends, breakdowns |
| `lib/financial-health.ts` | Composite health score calculation |
| `lib/tax.ts` | Indian tax regime computation |
| `lib/recurring-detector.ts` | Recurring transaction pattern detection |
| `lib/xirr.ts` | XIRR and CAGR investment return calculations |
| `lib/projections.ts` | Financial projection modeling |
| `lib/notifications.ts` | Notification creation and management |
| `lib/db.ts` | MongoDB connection singleton |

## Frontend Architecture

- **App Router** - Next.js 16 file-based routing
- **Server Components** - Layout and metadata on server
- **Client Pages** - All pages are `"use client"` for interactivity
- **React Query** - Data fetching and caching via TanStack Query
- **Shadcn/ui** - Component primitives from Radix UI
- **Motion** - Page transitions and micro-interactions
- **next-themes** - Dark/light mode support
- **cmdk** - Command palette (Cmd+K)
- **sonner** - Toast notifications

## Database Design

All collections use MongoDB ObjectId as primary key. No cross-collection references (flat document model). Transaction deduplication relies on `txn_id` field.

Budget categories use a predefined list from `lib/constants.ts` with user-configurable amounts. AI insights cached with TTL pattern (staleness checked on read).
