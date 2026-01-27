# Finance Tracker API - Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Client Layer                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   React Components                                              │
│   ├── Login Page (app/login/page.tsx)                          │
│   ├── Dashboard (app/dashboard/page.tsx)                       │
│   └── Transactions View                                        │
│                                                                 │
│   React Hooks                                                   │
│   ├── useAuth() ────────────────┐                              │
│   └── useTransactions() ────────┤                              │
│                                  │                              │
└──────────────────────────────────┼──────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API Layer (Next.js)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Authentication Routes                                         │
│   ├── POST   /api/auth/login     (Public)                      │
│   ├── POST   /api/auth/logout    (Protected)                   │
│   └── GET    /api/auth/verify    (Protected)                   │
│                                                                 │
│   Data Management Routes                                        │
│   ├── GET    /api/sheets/sync    (Protected)                   │
│   ├── DELETE /api/sheets/sync    (Protected)                   │
│   └── GET    /api/transactions   (Protected)                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Business Logic Layer                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Middleware (lib/middleware.ts)                                │
│   ├── withAuth() - JWT verification                            │
│   ├── extractToken() - Token extraction                        │
│   └── corsHeaders() - CORS configuration                       │
│                                                                 │
│   Authentication (lib/auth.ts)                                  │
│   ├── authenticateUser() - Verify credentials                  │
│   ├── generateToken() - Create JWT                             │
│   ├── verifyToken() - Validate JWT                             │
│   └── hashPassword() - Password hashing                        │
│                                                                 │
│   Google Sheets Integration (lib/sheets.ts)                    │
│   ├── fetchTransactionsFromSheet() - Fetch from API            │
│   ├── getCachedTransactions() - Cache access                   │
│   ├── filterTransactions() - Apply filters                     │
│   └── parseTransaction() - Data transformation                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Data Layer                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   In-Memory Cache                                               │
│   ├── Transaction[]                                             │
│   ├── lastSyncTime                                              │
│   └── Cache management                                          │
│                                                                 │
│   External Services                                             │
│   └── Google Sheets API                                         │
│       └── Sheet ID: 1yw-KSfgyit84gDoSUgaRsRFH4Mj2DnxXHYaF_yx3UTA│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Authentication Flow

```
┌──────────┐     ┌────────────┐     ┌─────────┐     ┌──────────┐
│  Client  │────▶│ POST /login│────▶│  Auth   │────▶│   JWT    │
│          │     │            │     │  Logic  │     │ Generator│
└──────────┘     └────────────┘     └─────────┘     └──────────┘
     │                                                     │
     │                                                     ▼
     │                  ┌────────────────────────────────────┐
     │                  │  JWT Token (7-day expiration)      │
     │◀─────────────────│  + HTTP-only Cookie                │
     │                  └────────────────────────────────────┘
     │
     ▼
┌──────────┐     ┌────────────┐     ┌──────────┐
│Protected │────▶│ Auth Check │────▶│  Verify  │
│ Requests │     │ Middleware │     │   Token  │
└──────────┘     └────────────┘     └──────────┘
                        │
                        ├─ Valid ──────▶ Allow Request
                        │
                        └─ Invalid ────▶ 401 Unauthorized
```

## Data Sync Flow

```
┌──────────┐     ┌──────────────┐     ┌────────────┐
│  Client  │────▶│ GET /sheets/ │────▶│   Check    │
│          │     │     sync     │     │   Cache    │
└──────────┘     └──────────────┘     └────────────┘
                                             │
                        ┌────────────────────┴────────────────┐
                        │                                     │
                        ▼                                     ▼
                 ┌──────────┐                         ┌──────────┐
                 │  Cache   │                         │  Fetch   │
                 │   Hit    │                         │  from    │
                 │          │                         │  Sheets  │
                 └──────────┘                         └──────────┘
                        │                                     │
                        │                                     ▼
                        │                             ┌──────────┐
                        │                             │  Parse   │
                        │                             │   Data   │
                        │                             └──────────┘
                        │                                     │
                        │                                     ▼
                        │                             ┌──────────┐
                        │                             │  Update  │
                        │                             │  Cache   │
                        │                             └──────────┘
                        │                                     │
                        └─────────────┬───────────────────────┘
                                      ▼
                              ┌──────────────┐
                              │   Return     │
                              │ Transactions │
                              └──────────────┘
```

## Transaction Query Flow

```
┌──────────┐     ┌──────────────────┐     ┌────────────┐
│  Client  │────▶│ GET /transactions│────▶│   Auth     │
│          │     │  ?filters=...    │     │  Verify    │
└──────────┘     └──────────────────┘     └────────────┘
                                                 │
                                                 ▼
                                          ┌────────────┐
                                          │Get Cached  │
                                          │Transactions│
                                          └────────────┘
                                                 │
                                                 ▼
                                          ┌────────────┐
                                          │   Apply    │
                                          │  Filters   │
                                          │  - category │
                                          │  - dates    │
                                          │  - amounts  │
                                          └────────────┘
                                                 │
                                                 ▼
                                          ┌────────────┐
                                          │    Sort    │
                                          │  Results   │
                                          └────────────┘
                                                 │
                                                 ▼
                                          ┌────────────┐
                                          │  Paginate  │
                                          │  (optional)│
                                          └────────────┘
                                                 │
                                                 ▼
                                          ┌────────────┐
                                          │   Return   │
                                          │  Filtered  │
                                          │   Results  │
                                          └────────────┘
```

## Component Structure

```
finance/
│
├── app/                          # Next.js App Directory
│   ├── api/                      # API Routes
│   │   ├── auth/                 # Authentication endpoints
│   │   │   ├── login/
│   │   │   │   └── route.ts      # POST /api/auth/login
│   │   │   ├── logout/
│   │   │   │   └── route.ts      # POST /api/auth/logout
│   │   │   └── verify/
│   │   │       └── route.ts      # GET /api/auth/verify
│   │   ├── sheets/               # Google Sheets integration
│   │   │   └── sync/
│   │   │       └── route.ts      # GET/DELETE /api/sheets/sync
│   │   └── transactions/         # Transaction management
│   │       └── route.ts          # GET /api/transactions
│   │
│   ├── dashboard/                # Dashboard page
│   └── login/                    # Login page
│
├── lib/                          # Business Logic
│   ├── auth.ts                   # Authentication utilities
│   ├── middleware.ts             # API middleware
│   ├── sheets.ts                 # Google Sheets integration
│   └── types.ts                  # TypeScript definitions
│
├── hooks/                        # React Hooks
│   ├── use-auth.ts               # Authentication hook
│   └── use-transactions.ts       # Transactions hook
│
└── scripts/                      # Utility Scripts
    ├── test-api.js               # API test suite
    └── generate-secret.js        # JWT secret generator
```

## Technology Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                          Frontend                               │
├─────────────────────────────────────────────────────────────────┤
│  React 19                                                       │
│  Next.js 15                                                     │
│  TypeScript 5                                                   │
│  Tailwind CSS 4                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                          Backend                                │
├─────────────────────────────────────────────────────────────────┤
│  Next.js API Routes                                             │
│  JWT (jsonwebtoken)                                             │
│  bcryptjs (password hashing)                                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                       External Services                         │
├─────────────────────────────────────────────────────────────────┤
│  Google Sheets API                                              │
│  Google Cloud Platform                                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                          Storage                                │
├─────────────────────────────────────────────────────────────────┤
│  In-Memory Cache (Transaction data)                             │
│  HTTP-only Cookies (JWT tokens)                                 │
│  localStorage (Token backup)                                    │
└─────────────────────────────────────────────────────────────────┘
```

## Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Security Layers                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Authentication                                              │
│     ├── JWT tokens with 7-day expiration                       │
│     ├── HTTP-only cookies (XSS protection)                     │
│     └── Secure password storage (bcrypt)                       │
│                                                                 │
│  2. Authorization                                               │
│     ├── Middleware protection on sensitive routes              │
│     ├── Token verification on each request                     │
│     └── User context in protected handlers                     │
│                                                                 │
│  3. Data Security                                               │
│     ├── HTTPS in production (recommended)                      │
│     ├── CORS configuration                                      │
│     ├── Input validation                                        │
│     └── Error message sanitization                             │
│                                                                 │
│  4. API Security                                                │
│     ├── Protected endpoints require authentication             │
│     ├── Public endpoint: /api/auth/login only                  │
│     └── Rate limiting ready (future enhancement)               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Data Models

### Transaction Model
```typescript
interface Transaction {
  id: string;                    // Unique identifier
  date: Date;                    // Transaction date
  description: string;           // Description
  merchant: string;              // Merchant name
  category: TransactionCategory; // Enum: Groceries, Dining, etc.
  amount: number;                // Transaction amount
  type: TransactionType;         // Enum: income, expense, transfer
  paymentMethod: PaymentMethod;  // Enum: Cash, Card, UPI, etc.
  account: string;               // Account name
  status: TransactionStatus;     // Enum: completed, pending, failed
  tags: string[];                // Custom tags
  notes?: string;                // Optional notes
  location?: string;             // Optional location
  receiptUrl?: string;           // Optional receipt URL
  recurring: boolean;            // Is recurring?
  relatedTransactionId?: string; // Related transaction ID
}
```

### User Model
```typescript
interface User {
  username: string;  // User's username
  password: string;  // Hashed password
}
```

## API Response Formats

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description"
}
```

### Transaction List Response
```json
{
  "success": true,
  "transactions": [...],
  "count": 50,
  "total": 250,
  "filters": { ... },
  "pagination": {
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

## Performance Considerations

```
┌─────────────────────────────────────────────────────────────────┐
│                    Performance Optimizations                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Caching Strategy                                            │
│     ├── In-memory cache for transactions                       │
│     ├── Cache invalidation on demand                           │
│     └── Force refresh option available                         │
│                                                                 │
│  2. API Optimization                                            │
│     ├── Pagination to limit response size                      │
│     ├── Filtering at data layer                                │
│     └── Efficient sorting algorithms                           │
│                                                                 │
│  3. Client-Side Optimization                                    │
│     ├── React hooks for state management                       │
│     ├── useMemo for computed values                            │
│     └── Lazy loading of components                             │
│                                                                 │
│  4. Future Enhancements                                         │
│     ├── Redis for distributed caching                          │
│     ├── Database indexing                                       │
│     ├── CDN for static assets                                   │
│     └── API response compression                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Error Handling

```
┌─────────────────────────────────────────────────────────────────┐
│                      Error Flow                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  API Route Error                                                │
│       │                                                         │
│       ├──▶ Try/Catch Block                                     │
│       │                                                         │
│       ├──▶ Log Error (console.error)                           │
│       │                                                         │
│       ├──▶ Format Error Response                               │
│       │    {                                                    │
│       │      success: false,                                   │
│       │      message: "User-friendly message"                  │
│       │    }                                                    │
│       │                                                         │
│       └──▶ Return with appropriate HTTP status                 │
│            - 400: Bad Request                                   │
│            - 401: Unauthorized                                  │
│            - 404: Not Found                                     │
│            - 500: Internal Server Error                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Scalability Path

```
Current Architecture (v1.0)
├── In-memory cache
├── Single server instance
└── Google Sheets as data source

Future Architecture (v2.0+)
├── Database layer (PostgreSQL/MongoDB)
├── Redis for caching
├── Load balancer
├── Multiple server instances
├── CDN for static assets
└── Background job processing
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Deployment Options                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Option 1: Vercel (Recommended)                                 │
│  ├── Zero-config deployment                                     │
│  ├── Automatic HTTPS                                            │
│  ├── Environment variables management                          │
│  └── Edge functions support                                    │
│                                                                 │
│  Option 2: Railway / Render                                     │
│  ├── Easy deployment from Git                                  │
│  ├── Built-in database options                                 │
│  └── Auto-scaling                                               │
│                                                                 │
│  Option 3: Self-Hosted                                          │
│  ├── Docker container                                           │
│  ├── PM2 for process management                                │
│  └── Nginx reverse proxy                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

**Architecture Version**: 1.0.0
**Last Updated**: 2024-01-26
**Status**: Production Ready
