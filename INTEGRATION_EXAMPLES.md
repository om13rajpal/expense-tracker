# API Integration Examples

This document shows how to integrate the Finance Tracker API into your React components.

## 1. Login Page Integration

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, isAuthenticated } = useAuth();
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
  });

  // Redirect if already authenticated
  if (isAuthenticated) {
    router.push('/dashboard');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = await login(credentials);

    if (result.success) {
      router.push('/dashboard');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
        <h1 className="text-2xl font-bold">Login</h1>

        {error && (
          <div className="rounded bg-red-50 p-3 text-red-800">
            {error}
          </div>
        )}

        <div>
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            type="text"
            value={credentials.username}
            onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
            required
          />
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={credentials.password}
            onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
            required
          />
        </div>

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? 'Logging in...' : 'Login'}
        </Button>
      </form>
    </div>
  );
}
```

## 2. Protected Dashboard with Auto-Sync

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useTransactions } from '@/hooks/use-transactions';

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const {
    transactions,
    isLoading,
    error,
    syncFromSheets,
    isSyncing,
    lastSync,
  } = useTransactions();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Auto-sync on mount if no recent sync
  useEffect(() => {
    if (isAuthenticated && !lastSync) {
      syncFromSheets(false); // Use cache if available
    }
  }, [isAuthenticated, lastSync, syncFromSheets]);

  const handleManualSync = async () => {
    await syncFromSheets(true); // Force refresh
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (authLoading || !isAuthenticated) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex gap-2">
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="rounded bg-blue-500 px-4 py-2 text-white disabled:bg-gray-300"
          >
            {isSyncing ? 'Syncing...' : 'Sync Data'}
          </button>
          <button
            onClick={handleLogout}
            className="rounded bg-gray-500 px-4 py-2 text-white"
          >
            Logout
          </button>
        </div>
      </div>

      {lastSync && (
        <p className="text-sm text-gray-600 mb-4">
          Last synced: {new Date(lastSync).toLocaleString()}
        </p>
      )}

      {error && (
        <div className="mb-4 rounded bg-red-50 p-4 text-red-800">
          Error: {error}
        </div>
      )}

      {isLoading ? (
        <div>Loading transactions...</div>
      ) : (
        <div>
          <h2 className="text-xl font-semibold mb-4">
            Recent Transactions ({transactions.length})
          </h2>
          <div className="space-y-2">
            {transactions.slice(0, 10).map((txn) => (
              <div
                key={txn.id}
                className="flex justify-between rounded border p-3"
              >
                <div>
                  <p className="font-medium">{txn.description}</p>
                  <p className="text-sm text-gray-600">{txn.category}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">${txn.amount.toFixed(2)}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(txn.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

## 3. Filtered Transactions List

```tsx
'use client';

import { useState } from 'react';
import { useTransactions } from '@/hooks/use-transactions';
import { TransactionCategory, PaymentMethod } from '@/lib/types';

export default function TransactionsPage() {
  const [filters, setFilters] = useState({
    category: '',
    paymentMethod: '',
    startDate: '',
    endDate: '',
  });

  const { transactions, isLoading, fetchTransactions } = useTransactions(filters);

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    fetchTransactions(newFilters);
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Transactions</h1>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Category</label>
          <select
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            className="w-full rounded border p-2"
          >
            <option value="">All Categories</option>
            <option value={TransactionCategory.GROCERIES}>Groceries</option>
            <option value={TransactionCategory.DINING}>Dining</option>
            <option value={TransactionCategory.TRANSPORT}>Transport</option>
            <option value={TransactionCategory.ENTERTAINMENT}>Entertainment</option>
            {/* Add more categories */}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Payment Method</label>
          <select
            value={filters.paymentMethod}
            onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}
            className="w-full rounded border p-2"
          >
            <option value="">All Methods</option>
            <option value={PaymentMethod.CASH}>Cash</option>
            <option value={PaymentMethod.CREDIT_CARD}>Credit Card</option>
            <option value={PaymentMethod.DEBIT_CARD}>Debit Card</option>
            <option value={PaymentMethod.UPI}>UPI</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Start Date</label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
            className="w-full rounded border p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">End Date</label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
            className="w-full rounded border p-2"
          />
        </div>
      </div>

      {/* Transactions Table */}
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Description</th>
              <th className="p-3 text-left">Category</th>
              <th className="p-3 text-left">Payment Method</th>
              <th className="p-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((txn) => (
              <tr key={txn.id} className="border-b hover:bg-gray-50">
                <td className="p-3">
                  {new Date(txn.date).toLocaleDateString()}
                </td>
                <td className="p-3">{txn.description}</td>
                <td className="p-3">{txn.category}</td>
                <td className="p-3">{txn.paymentMethod}</td>
                <td className="p-3 text-right">
                  ${txn.amount.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

## 4. Sync Button Component

```tsx
'use client';

import { useState } from 'react';
import { useSheetSync } from '@/hooks/use-transactions';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export function SyncButton() {
  const { sync, isSyncing, lastSync, error } = useSheetSync();
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSync = async () => {
    const result = await sync(true); // Force refresh

    if (result.success) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={handleSync}
        disabled={isSyncing}
        variant="outline"
        size="sm"
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
        {isSyncing ? 'Syncing...' : 'Sync'}
      </Button>

      {showSuccess && (
        <span className="text-sm text-green-600">Synced successfully!</span>
      )}

      {error && (
        <span className="text-sm text-red-600">{error}</span>
      )}

      {lastSync && !error && (
        <span className="text-sm text-gray-600">
          Last: {new Date(lastSync).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}
```

## 5. Direct API Calls (Without Hooks)

If you need more control, you can make direct API calls:

```tsx
'use client';

import { useState } from 'react';

export function ManualDataFetch() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);

    try {
      // Get transactions for current month
      const startDate = new Date();
      startDate.setDate(1);
      const endDate = new Date();

      const params = new URLSearchParams({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        sort: 'date',
        order: 'desc',
        limit: '50',
      });

      const response = await fetch(`/api/transactions?${params}`, {
        credentials: 'include',
      });

      const result = await response.json();

      if (result.success) {
        setData(result.transactions);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={fetchData} disabled={loading}>
        {loading ? 'Loading...' : 'Fetch Data'}
      </button>
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
}
```

## 6. Protected Route Middleware (Next.js 15)

Create `middleware.ts` in the root directory:

```tsx
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;

  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Redirect to dashboard if already logged in and trying to access login
  if (request.nextUrl.pathname === '/login') {
    if (token) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
```

## 7. Analytics Integration

Calculate analytics from transactions:

```tsx
'use client';

import { useMemo } from 'react';
import { useTransactions } from '@/hooks/use-transactions';
import { TransactionType } from '@/lib/types';

export function AnalyticsDashboard() {
  const { transactions } = useTransactions();

  const analytics = useMemo(() => {
    const income = transactions
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = transactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + t.amount, 0);

    const savings = income - expenses;
    const savingsRate = income > 0 ? (savings / income) * 100 : 0;

    return { income, expenses, savings, savingsRate };
  }, [transactions]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="rounded border p-4">
        <p className="text-sm text-gray-600">Total Income</p>
        <p className="text-2xl font-bold">${analytics.income.toFixed(2)}</p>
      </div>

      <div className="rounded border p-4">
        <p className="text-sm text-gray-600">Total Expenses</p>
        <p className="text-2xl font-bold">${analytics.expenses.toFixed(2)}</p>
      </div>

      <div className="rounded border p-4">
        <p className="text-sm text-gray-600">Net Savings</p>
        <p className="text-2xl font-bold">${analytics.savings.toFixed(2)}</p>
      </div>

      <div className="rounded border p-4">
        <p className="text-sm text-gray-600">Savings Rate</p>
        <p className="text-2xl font-bold">{analytics.savingsRate.toFixed(1)}%</p>
      </div>
    </div>
  );
}
```

## Testing Tips

1. **Use the Test Script**:
   ```bash
   npm run test:api
   ```

2. **Browser DevTools**:
   - Open Network tab to see API requests
   - Check Application > Cookies to see auth token
   - Use Console to test fetch calls

3. **Manual Testing with curl**:
   ```bash
   # Login and save token
   TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"omrajpal","password":"13245678"}' \
     | jq -r '.token')

   # Use token for authenticated requests
   curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:3000/api/transactions
   ```

## Common Patterns

### 1. Optimistic Updates
Update UI immediately, sync with server in background.

### 2. Polling for Updates
Periodically sync data:
```tsx
useEffect(() => {
  const interval = setInterval(() => {
    syncFromSheets(false);
  }, 5 * 60 * 1000); // Every 5 minutes

  return () => clearInterval(interval);
}, [syncFromSheets]);
```

### 3. Error Boundaries
Wrap components with error boundaries for graceful error handling.

### 4. Loading States
Always show loading indicators for better UX.
