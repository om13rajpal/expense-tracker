# MongoDB Integration Setup Guide

## Overview

Complete MongoDB integration with Mongoose models for the Finance Tracker application.

## Installation

Dependencies have been installed:
- `mongodb` - MongoDB Node.js driver
- `mongoose` - ODM for MongoDB
- `@types/mongoose` - TypeScript definitions

## Project Structure

```
lib/
├── mongodb.ts              # Connection manager
└── models/
    ├── index.ts           # Model exports
    ├── User.ts            # User authentication & profile
    ├── Transaction.ts     # Financial transactions
    ├── Budget.ts          # Budget tracking
    ├── Goal.ts            # Financial goals
    └── Investment.ts      # SIPs, Stocks, Mutual Funds
```

## Environment Configuration

MongoDB connection settings in `.env.local`:

```env
# Local Development
MONGODB_URI=mongodb://localhost:27017/finance_dev
MONGODB_DB_NAME=finance_db

# Production (MongoDB Atlas)
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
```

## Models Overview

### 1. User Model (`lib/models/User.ts`)

**Features:**
- Username & email authentication
- Profile information (name, avatar, currency, timezone)
- User settings (monthly budget, categories, notifications)
- Google Sheets integration config
- Timestamps

**Indexes:**
- `username` (unique)
- `email` (unique)
- `googleSheets.sheetId` (sparse)

**Key Methods:**
- Automatic password hash validation
- JSON transformation (removes sensitive fields)

### 2. Transaction Model (`lib/models/Transaction.ts`)

**Features:**
- Complete transaction details (date, amount, merchant, category)
- User reference (multi-user support)
- External ID for Google Sheets sync
- Source tracking (manual, sheets, import)
- Attachments (receipts, invoices)
- Tags and notes

**Indexes:**
- `userId + date` (descending) - Main query pattern
- `userId + category` - Category filtering
- `userId + type` - Type filtering
- `userId + merchant` - Merchant analysis
- `externalId` (unique, sparse) - Sheets sync
- `userId + recurring` - Recurring transactions

**Key Features:**
- Pre-save middleware for data normalization
- Static methods for common queries
- Support for balance tracking

### 3. Budget Model (`lib/models/Budget.ts`)

**Features:**
- Budget definitions by category
- Period tracking (weekly, monthly, yearly)
- Automatic spent/remaining calculations
- Alert thresholds
- Status tracking (on-track, warning, exceeded)
- Rollover support

**Indexes:**
- `userId + period`
- `userId + category`
- `userId + status`

**Key Methods:**
- `addExpense()` - Add expense to budget
- `resetPeriod()` - Start new period
- `isExpired()` - Check if period ended

**Auto-calculations:**
- Remaining amount
- Percentage used
- Status based on threshold

### 4. Goal Model (`lib/models/Goal.ts`)

**Features:**
- Financial goal definitions
- Progress tracking
- Contribution history
- Monthly target calculations
- Projected completion dates
- Priority levels

**Indexes:**
- `userId + status`
- `userId + targetDate`
- `userId + category`

**Key Methods:**
- `addContribution()` - Add contribution
- `removeContribution()` - Remove contribution
- `abandon()` - Mark goal as abandoned
- `isOverdue()` - Check if overdue

**Auto-calculations:**
- Percentage complete
- Monthly targets
- On-track status
- Projected completion date

### 5. Investment Models (`lib/models/Investment.ts`)

#### SIP (Systematic Investment Plan)
**Features:**
- SIP details (name, type, provider)
- Monthly investment tracking
- Performance metrics (returns, XIRR)
- Status tracking (active, paused, completed)
- Missed payments tracking

**Indexes:**
- `userId + type`
- `userId + status`

#### Stock
**Features:**
- Stock holdings
- Purchase/sale transactions
- Real-time price tracking
- Returns calculation
- Detailed transaction history

**Indexes:**
- `userId + symbol`
- `symbol` (for price updates)

#### Mutual Fund
**Features:**
- Mutual fund holdings
- NAV tracking
- Investment/redemption history
- Folio number tracking
- Returns calculation

**Indexes:**
- `userId + schemeCode`
- `schemeCode` (for NAV updates)

## Connection Management

### Features:
- Connection pooling (10 max, 2 min)
- Automatic reconnection
- Global caching for Next.js hot reloads
- Error handling
- Connection state tracking

### Usage:

```typescript
import connectDB, { isConnected, disconnectDB } from '@/lib/mongodb';

// Connect to database
await connectDB();

// Check connection status
if (isConnected()) {
  console.log('Connected to MongoDB');
}

// Close connection (for cleanup)
await disconnectDB();
```

## Using Models in API Routes

### Example: Create Transaction

```typescript
import connectDB from '@/lib/mongodb';
import { Transaction } from '@/lib/models';

export async function POST(req: Request) {
  try {
    await connectDB();

    const data = await req.json();
    const transaction = await Transaction.create({
      userId: data.userId,
      date: new Date(data.date),
      description: data.description,
      merchant: data.merchant,
      category: data.category,
      amount: data.amount,
      type: data.type,
      paymentMethod: data.paymentMethod,
      account: data.account,
      status: 'completed',
      recurring: false,
      tags: data.tags || [],
      source: 'manual',
    });

    return Response.json(transaction);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

### Example: Query Transactions

```typescript
import connectDB from '@/lib/mongodb';
import { Transaction } from '@/lib/models';

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Using static method
    const transactions = await Transaction.findByDateRange(
      userId,
      new Date(startDate),
      new Date(endDate)
    );

    return Response.json({ transactions });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

### Example: Update Budget

```typescript
import connectDB from '@/lib/mongodb';
import { Budget } from '@/lib/models';

export async function PATCH(req: Request) {
  try {
    await connectDB();

    const { budgetId, amount } = await req.json();

    const budget = await Budget.findById(budgetId);
    if (!budget) {
      return Response.json({ error: 'Budget not found' }, { status: 404 });
    }

    // Use instance method
    budget.addExpense(amount);
    await budget.save(); // Auto-calculates remaining, percentage, status

    return Response.json(budget);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

## Data Migration

### Sync Google Sheets to MongoDB

Create a sync service to migrate existing Google Sheets data:

```typescript
// lib/sync-service.ts
import connectDB from './mongodb';
import { Transaction } from './models';

export async function syncSheetsToMongoDB(userId: string, sheetTransactions: any[]) {
  await connectDB();

  const results = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  for (const txn of sheetTransactions) {
    try {
      // Check if transaction already exists
      const existing = await Transaction.findOne({
        userId,
        externalId: txn.id,
      });

      if (existing) {
        // Update if data changed
        const updated = await Transaction.findByIdAndUpdate(
          existing._id,
          { ...txn, source: 'sheets' },
          { new: true }
        );
        results.updated++;
      } else {
        // Create new transaction
        await Transaction.create({
          ...txn,
          userId,
          externalId: txn.id,
          source: 'sheets',
        });
        results.created++;
      }
    } catch (error) {
      results.errors.push({ transaction: txn.id, error: error.message });
    }
  }

  return results;
}
```

## Testing

### 1. Test Connection

```typescript
// test-connection.ts
import connectDB, { isConnected } from './lib/mongodb';

async function testConnection() {
  try {
    await connectDB();
    console.log('✅ MongoDB connected:', isConnected());
  } catch (error) {
    console.error('❌ Connection failed:', error);
  }
}

testConnection();
```

### 2. Test User Creation

```typescript
import connectDB from './lib/mongodb';
import { User } from './lib/models';

async function testUser() {
  await connectDB();

  const user = await User.create({
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: 'hashed_password_here',
    profile: {
      firstName: 'Test',
      lastName: 'User',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
    },
    settings: {
      monthlyBudget: 50000,
      categories: [],
      notifications: {
        email: true,
        weeklyReport: true,
        budgetAlerts: true,
      },
    },
  });

  console.log('User created:', user.toJSON());
}
```

### 3. Test Transaction Query

```typescript
import connectDB from './lib/mongodb';
import { Transaction } from './lib/models';

async function testTransactions() {
  await connectDB();

  // Find transactions for a user
  const transactions = await Transaction.findByUserId('user_id_here');

  console.log(`Found ${transactions.length} transactions`);

  // Find by date range
  const monthTransactions = await Transaction.findByDateRange(
    'user_id_here',
    new Date('2024-01-01'),
    new Date('2024-01-31')
  );

  console.log(`January transactions: ${monthTransactions.length}`);
}
```

## Performance Optimization

### Indexes Created:
All models have appropriate indexes for common query patterns:
- User lookups by username/email
- Transaction queries by user, date, category
- Budget filtering by period and status
- Goal queries by target date
- Investment lookups by symbol/scheme code

### Connection Pooling:
- Max pool size: 10 connections
- Min pool size: 2 connections
- Socket timeout: 45 seconds
- Server selection timeout: 5 seconds

### Best Practices:
1. Always use indexes for queries
2. Limit result sets with `.limit()`
3. Use `.select()` to fetch only needed fields
4. Use `.lean()` for read-only operations (faster)
5. Batch operations with `bulkWrite()`

## Production Deployment

### MongoDB Atlas Setup:

1. **Create Cluster**
   - Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Create a free M0 cluster or paid tier
   - Choose region closest to your app

2. **Configure Access**
   - Database Access: Create user with password
   - Network Access: Add IP whitelist (0.0.0.0/0 for all IPs)

3. **Get Connection String**
   - Click "Connect" → "Connect your application"
   - Copy connection string
   - Replace `<username>` and `<password>`

4. **Update Environment Variable**
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
   MONGODB_DB_NAME=finance_db
   ```

### Security Checklist:

- [ ] Strong database password
- [ ] IP whitelist configured
- [ ] Connection string in environment variables
- [ ] No credentials in code
- [ ] SSL/TLS enabled (default in Atlas)
- [ ] Mongoose validation enabled
- [ ] Input sanitization in API routes

## Common Issues & Solutions

### Issue: "MongooseServerSelectionError: connect ECONNREFUSED"
**Solution:** MongoDB server not running. Start MongoDB locally or check Atlas connection string.

### Issue: "ValidationError: User validation failed"
**Solution:** Check required fields match schema. Use `.validate()` before saving.

### Issue: "Duplicate key error"
**Solution:** Trying to create document with existing unique field (username, email, externalId).

### Issue: "Connection pool size exceeded"
**Solution:** Increase `maxPoolSize` in connection options or optimize queries.

## Next Steps

1. **API Routes**: Create API endpoints using models
2. **Data Migration**: Sync existing Google Sheets data
3. **Frontend Integration**: Update UI to use MongoDB API
4. **Authentication**: Implement user registration/login
5. **Testing**: Write integration tests for models

## Resources

- [MongoDB Documentation](https://docs.mongodb.com/)
- [Mongoose Documentation](https://mongoosejs.com/docs/)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [Next.js + MongoDB Tutorial](https://nextjs.org/learn/dashboard-app)

---

**Setup Complete!** ✅ MongoDB integration is ready for use.
