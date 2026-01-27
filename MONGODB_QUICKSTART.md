# MongoDB Integration - Quick Start Guide

## Setup Complete ✅

MongoDB integration with Mongoose models has been successfully set up!

## What's Included

### 📁 Files Created

1. **Connection Manager** (`lib/mongodb.ts`)
   - Connection pooling and error handling
   - Reconnection logic
   - Global caching for Next.js

2. **Mongoose Models** (`lib/models/`)
   - `User.ts` - User authentication and profile
   - `Transaction.ts` - Financial transactions
   - `Budget.ts` - Budget tracking
   - `Goal.ts` - Financial goals
   - `Investment.ts` - SIPs, Stocks, Mutual Funds
   - `index.ts` - Model exports

3. **Configuration**
   - `.env.local` - MongoDB connection settings
   - `.env.local.example` - Example configuration

4. **Documentation**
   - `MONGODB_SETUP.md` - Complete setup guide
   - `MONGODB_QUICKSTART.md` - This file

5. **Testing**
   - `scripts/test-mongodb.ts` - Connection and model tests

### 📦 Dependencies Installed

- `mongodb` - MongoDB driver
- `mongoose` - ODM for MongoDB
- `@types/mongoose` - TypeScript definitions

## Quick Start

### 1. Set Up MongoDB

**Option A: Local MongoDB**
```bash
# Install MongoDB on your system
# Windows: Download from https://www.mongodb.com/try/download/community
# Mac: brew install mongodb-community
# Linux: Follow official docs

# Start MongoDB
mongod
```

**Option B: MongoDB Atlas (Cloud - Recommended)**
1. Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Get connection string
4. Update `.env.local` with your connection string

### 2. Configure Environment Variables

Your `.env.local` is already configured with:

```env
# For local MongoDB (default)
MONGODB_URI=mongodb://localhost:27017/finance_dev
MONGODB_DB_NAME=finance_db

# For MongoDB Atlas (production)
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
```

### 3. Test the Connection

```bash
npm run test:mongodb
```

This will:
- Connect to MongoDB
- Create test documents for all models
- Run queries
- Clean up test data
- Verify everything works

Expected output:
```
✅ MongoDB connected: true
✅ User created with ID: ...
✅ Transaction created with ID: ...
✅ Budget created with ID: ...
✅ Goal created with ID: ...
✅ SIP created with ID: ...
✅ Stock created with ID: ...
✅ Mutual Fund created with ID: ...
✅ All tests passed successfully!
```

## Using Models in Your Code

### Import Models

```typescript
import connectDB from '@/lib/mongodb';
import { User, Transaction, Budget, Goal, SIP, Stock, MutualFund } from '@/lib/models';
```

### Example: Create a Transaction

```typescript
import connectDB from '@/lib/mongodb';
import { Transaction } from '@/lib/models';

export async function POST(req: Request) {
  await connectDB();

  const transaction = await Transaction.create({
    userId: 'user_id_here',
    date: new Date(),
    description: 'Grocery shopping',
    merchant: 'Reliance Fresh',
    category: 'Groceries',
    amount: 2500,
    type: 'expense',
    paymentMethod: 'UPI',
    account: 'HDFC Bank',
    status: 'completed',
    recurring: false,
    tags: ['grocery', 'food'],
    source: 'manual',
  });

  return Response.json(transaction);
}
```

### Example: Query Transactions

```typescript
import connectDB from '@/lib/mongodb';
import { Transaction } from '@/lib/models';

export async function GET(req: Request) {
  await connectDB();

  // Get all transactions for a user
  const transactions = await Transaction.findByUserId('user_id_here');

  // Get transactions for a date range
  const monthTransactions = await Transaction.findByDateRange(
    'user_id_here',
    new Date('2024-01-01'),
    new Date('2024-01-31')
  );

  // Get transactions by category
  const categoryTransactions = await Transaction.findByCategory(
    'user_id_here',
    'Groceries'
  );

  return Response.json({ transactions });
}
```

### Example: Update a Budget

```typescript
import connectDB from '@/lib/mongodb';
import { Budget } from '@/lib/models';

export async function PATCH(req: Request) {
  await connectDB();

  const budget = await Budget.findById('budget_id_here');

  // Add expense (auto-calculates remaining, percentage, status)
  budget.addExpense(500);
  await budget.save();

  return Response.json(budget);
}
```

### Example: Track Goal Progress

```typescript
import connectDB from '@/lib/mongodb';
import { Goal } from '@/lib/models';

export async function POST(req: Request) {
  await connectDB();

  const goal = await Goal.findById('goal_id_here');

  // Add contribution (auto-updates progress)
  goal.addContribution(5000, 'salary');
  await goal.save();

  return Response.json(goal);
}
```

## Model Features

### 🎯 Auto-Calculations

All models have built-in auto-calculations:

**Budget:**
- Remaining amount
- Percentage used
- Status (on-track/warning/exceeded)

**Goal:**
- Percentage complete
- Monthly targets
- Projected completion date
- On-track status

**Investments:**
- Current value
- Returns (absolute and percentage)
- Performance metrics

### 🔍 Built-in Queries

Static methods for common queries:

```typescript
// Users
User.findByEmail(email)

// Transactions
Transaction.findByUserId(userId)
Transaction.findByDateRange(userId, startDate, endDate)
Transaction.findByCategory(userId, category)

// Budgets
Budget.findByUserId(userId)
Budget.findActiveByUserId(userId)
Budget.findExceeded(userId)

// Goals
Goal.findByUserId(userId)
Goal.findActiveByUserId(userId)
Goal.findOverdue(userId)
```

### 🛡️ Built-in Validation

All models have Mongoose validation:

```typescript
// Required fields
description: {
  type: String,
  required: [true, 'Description is required'],
}

// Min/Max values
amount: {
  type: Number,
  min: [0, 'Amount cannot be negative'],
}

// Enum values
status: {
  type: String,
  enum: ['completed', 'pending', 'failed'],
}

// Custom validation
targetDate: {
  validate: {
    validator: function(value) {
      return value > this.startDate;
    },
    message: 'Target date must be after start date',
  },
}
```

### 🔐 Data Security

- Passwords never returned in JSON
- Sensitive fields excluded from responses
- Indexes for performance
- Connection pooling

## Next Steps

### 1. Create API Routes

Create API endpoints in `app/api/`:

```
app/api/
├── transactions/
│   ├── route.ts          # GET (list), POST (create)
│   └── [id]/route.ts     # GET, PATCH, DELETE
├── budgets/
│   ├── route.ts
│   └── [id]/route.ts
├── goals/
│   ├── route.ts
│   └── [id]/route.ts
└── investments/
    ├── sips/route.ts
    ├── stocks/route.ts
    └── mutual-funds/route.ts
```

### 2. Migrate Google Sheets Data

Create a sync service to import existing data:

```typescript
// lib/sync-service.ts
import { Transaction } from '@/lib/models';

export async function syncSheetsToMongoDB(userId: string, sheetData: any[]) {
  const results = { created: 0, updated: 0, errors: [] };

  for (const row of sheetData) {
    try {
      const existing = await Transaction.findOne({
        userId,
        externalId: row.id,
      });

      if (!existing) {
        await Transaction.create({
          ...row,
          userId,
          externalId: row.id,
          source: 'sheets',
        });
        results.created++;
      }
    } catch (error) {
      results.errors.push(error.message);
    }
  }

  return results;
}
```

### 3. Update Frontend

Update your React components to use MongoDB API:

```typescript
// Before: Using Google Sheets
const { transactions } = await fetchTransactionsFromSheet();

// After: Using MongoDB API
const response = await fetch('/api/transactions?userId=' + userId);
const { transactions } = await response.json();
```

### 4. Implement Authentication

Use the User model for authentication:

```typescript
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '@/lib/models';

// Register
const passwordHash = await bcrypt.hash(password, 10);
const user = await User.create({ username, email, passwordHash, ... });

// Login
const user = await User.findOne({ email });
const valid = await bcrypt.compare(password, user.passwordHash);
if (valid) {
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
}
```

### 5. Deploy to Production

1. Set up MongoDB Atlas
2. Update environment variables on Vercel/Railway
3. Deploy your app
4. Test in production

## Common Patterns

### Pattern 1: CRUD API Route

```typescript
// app/api/transactions/route.ts
import connectDB from '@/lib/mongodb';
import { Transaction } from '@/lib/models';

// GET - List transactions
export async function GET(req: Request) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  const transactions = await Transaction.findByUserId(userId);
  return Response.json({ transactions });
}

// POST - Create transaction
export async function POST(req: Request) {
  await connectDB();
  const data = await req.json();

  const transaction = await Transaction.create(data);
  return Response.json(transaction);
}
```

### Pattern 2: Server Component

```typescript
// app/dashboard/page.tsx
import connectDB from '@/lib/mongodb';
import { Transaction } from '@/lib/models';

export default async function DashboardPage() {
  await connectDB();

  const transactions = await Transaction.findByUserId('user_id_here')
    .limit(10)
    .lean(); // Use .lean() for faster reads

  return (
    <div>
      {transactions.map(txn => (
        <div key={txn._id}>{txn.description}</div>
      ))}
    </div>
  );
}
```

### Pattern 3: Aggregation Pipeline

```typescript
// Get monthly spending by category
const spending = await Transaction.aggregate([
  { $match: { userId: userId, type: 'expense' } },
  {
    $group: {
      _id: '$category',
      total: { $sum: '$amount' },
      count: { $sum: 1 },
    },
  },
  { $sort: { total: -1 } },
  { $limit: 10 },
]);
```

## Resources

- 📖 [Complete Setup Guide](./MONGODB_SETUP.md)
- 📚 [Mongoose Documentation](https://mongoosejs.com/docs/)
- 🌐 [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- 🎓 [Next.js + MongoDB](https://nextjs.org/learn/dashboard-app)

## Need Help?

1. Check `MONGODB_SETUP.md` for detailed documentation
2. Run `npm run test:mongodb` to verify setup
3. Review model files in `lib/models/` for schema details
4. Check MongoDB connection logs in console

---

**🎉 You're all set! Start building with MongoDB!**
