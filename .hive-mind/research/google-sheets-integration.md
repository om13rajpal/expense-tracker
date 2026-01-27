# Google Sheets API Integration Research

**Research Agent Report**
**Date:** 2026-01-26
**Target Sheet:** https://docs.google.com/spreadsheets/d/1yw-KSfgyit84gDoSUgaRsRFH4Mj2DnxXHYaF_yx3UTA/edit
**Environment:** Next.js 16.1.4, React 19.2.3

---

## Executive Summary

Two viable approaches exist for integrating Google Sheets data into the finance tracker:

1. **CSV Export URL (RECOMMENDED)** - Simpler, no authentication, faster implementation
2. **Google Sheets API v4** - More powerful, requires authentication, better for write operations

For this read-only use case with a public sheet, **CSV Export URL is the optimal choice**.

---

## Approach 1: CSV Export URL (RECOMMENDED)

### Overview
Google Sheets provides a direct CSV export URL for publicly shared sheets. This approach requires zero authentication and minimal setup.

### Pros
- No API keys or service accounts needed
- Zero authentication overhead
- Simple implementation (single fetch call)
- No rate limiting concerns (within reasonable use)
- Faster initial setup
- Lower maintenance
- Works perfectly for read-only operations

### Cons
- Read-only (cannot write back to sheet)
- Requires sheet to be public ("Anyone with the link")
- Limited to CSV format (no formatting, formulas, etc.)
- Must parse CSV data manually

### Implementation

#### 1. Extract Sheet Information

From your URL: `https://docs.google.com/spreadsheets/d/1yw-KSfgyit84gDoSUgaRsRFH4Mj2DnxXHYaF_yx3UTA/edit`

- **Spreadsheet ID:** `1yw-KSfgyit84gDoSUgaRsRFH4Mj2DnxXHYaF_yx3UTA`
- **GID (Sheet ID):** Found in URL after `#gid=` (e.g., `gid=0` for first sheet)

#### 2. CSV Export URL Format

```
https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/export?format=csv&gid={SHEET_ID}
```

For your sheet:
```
https://docs.google.com/spreadsheets/d/1yw-KSfgyit84gDoSUgaRsRFH4Mj2DnxXHYaF_yx3UTA/export?format=csv&gid=0
```

Optional range parameter:
```
https://docs.google.com/spreadsheets/d/1yw-KSfgyit84gDoSUgaRsRFH4Mj2DnxXHYaF_yx3UTA/export?format=csv&gid=0&range=A1:Z1000
```

#### 3. Next.js API Route Implementation

**File:** `app/api/transactions/route.ts`

```typescript
import { NextResponse } from 'next/server';

// Environment variables
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID || '1yw-KSfgyit84gDoSUgaRsRFH4Mj2DnxXHYaF_yx3UTA';
const SHEET_GID = process.env.GOOGLE_SHEETS_GID || '0';

interface Transaction {
  date: string;
  description: string;
  category: string;
  amount: number;
  paymentMethod: string;
  status: string;
}

// CSV parser helper
function parseCSV(csvText: string): string[][] {
  const lines = csvText.split('\n');
  return lines
    .filter(line => line.trim())
    .map(line => {
      // Handle quoted fields with commas
      const regex = /(?:,|^)(?:"([^"]*)"|([^",]*))/g;
      const fields: string[] = [];
      let match;

      while ((match = regex.exec(line)) !== null) {
        fields.push(match[1] || match[2] || '');
      }

      return fields;
    });
}

// Transform CSV rows to typed objects
function transformToTransactions(rows: string[][]): Transaction[] {
  if (rows.length === 0) return [];

  // First row is headers - skip it
  const dataRows = rows.slice(1);

  return dataRows.map(row => ({
    date: row[0] || '',
    description: row[1] || '',
    category: row[2] || '',
    amount: parseFloat(row[3]) || 0,
    paymentMethod: row[4] || '',
    status: row[5] || 'completed',
  }));
}

export async function GET() {
  try {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${SHEET_GID}`;

    const response = await fetch(csvUrl, {
      // Revalidate every 5 minutes
      next: { revalidate: 300 }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch sheet: ${response.status} ${response.statusText}`);
    }

    const csvText = await response.text();
    const rows = parseCSV(csvText);
    const transactions = transformToTransactions(rows);

    return NextResponse.json({
      success: true,
      data: transactions,
      lastFetched: new Date().toISOString(),
      count: transactions.length
    });

  } catch (error) {
    console.error('Error fetching Google Sheets data:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: []
      },
      { status: 500 }
    );
  }
}
```

#### 4. Environment Configuration

**File:** `.env.local`

```env
# Google Sheets Configuration
GOOGLE_SHEETS_ID=1yw-KSfgyit84gDoSUgaRsRFH4Mj2DnxXHYaF_yx3UTA
GOOGLE_SHEETS_GID=0
```

#### 5. Client-Side Usage (React Hook)

**File:** `hooks/use-transactions.ts`

```typescript
import { useState, useEffect } from 'react';

interface Transaction {
  date: string;
  description: string;
  category: string;
  amount: number;
  paymentMethod: string;
  status: string;
}

interface TransactionsResponse {
  success: boolean;
  data: Transaction[];
  lastFetched?: string;
  count?: number;
  error?: string;
}

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<string | null>(null);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/transactions');
      const result: TransactionsResponse = await response.json();

      if (result.success) {
        setTransactions(result.data);
        setLastFetched(result.lastFetched || null);
      } else {
        setError(result.error || 'Failed to fetch transactions');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  return {
    transactions,
    loading,
    error,
    lastFetched,
    refetch: fetchTransactions
  };
}
```

#### 6. Component Usage

```typescript
import { useTransactions } from '@/hooks/use-transactions';
import { DataTable } from '@/components/data-table';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const { transactions, loading, error, lastFetched, refetch } = useTransactions();

  if (loading) return <div>Loading transactions...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">
          Last updated: {lastFetched ? new Date(lastFetched).toLocaleString() : 'Never'}
        </p>
        <Button onClick={refetch} variant="outline">
          Refresh Data
        </Button>
      </div>

      <DataTable data={transactions} />
    </div>
  );
}
```

---

## Approach 2: Google Sheets API v4

### Overview
Official Google API with full read/write capabilities, requires authentication.

### Pros
- Full read/write access
- Can update cells programmatically
- Access to formatting, formulas, metadata
- More control over data structure
- Can work with private sheets
- Supports batch operations

### Cons
- Requires authentication setup (Service Account or API Key)
- More complex implementation
- Rate limits (100 requests per 100 seconds per user)
- Requires credentials management
- Higher maintenance overhead

### When to Use
- Need to write data back to sheets
- Working with private sheets
- Need access to formulas/formatting
- Building complex integrations

### Implementation

#### 1. Install Dependencies

```bash
npm install googleapis@105 --save
```

#### 2. Service Account Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google Sheets API
4. Create Service Account:
   - Go to "IAM & Admin" > "Service Accounts"
   - Click "Create Service Account"
   - Download JSON key file
5. Share your Google Sheet with service account email

#### 3. Environment Configuration

**File:** `.env.local`

```env
GOOGLE_SHEETS_ID=1yw-KSfgyit84gDoSUgaRsRFH4Mj2DnxXHYaF_yx3UTA
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project-id.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

#### 4. API Route Implementation

**File:** `app/api/transactions-api/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID!;
const SHEET_RANGE = 'Sheet1!A2:F'; // Adjust to your sheet structure

async function getAuthenticatedClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  return await auth.getClient();
}

export async function GET() {
  try {
    const authClient = await getAuthenticatedClient();
    const sheets = google.sheets({ version: 'v4', auth: authClient });

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: SHEET_RANGE,
    });

    const rows = result.data.values || [];

    const transactions = rows.map(row => ({
      date: row[0] || '',
      description: row[1] || '',
      category: row[2] || '',
      amount: parseFloat(row[3]) || 0,
      paymentMethod: row[4] || '',
      status: row[5] || 'completed',
    }));

    return NextResponse.json({
      success: true,
      data: transactions,
      lastFetched: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Google Sheets API Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
```

#### 5. TypeScript Types

**File:** `lib/types/sheets.ts`

```typescript
export interface SheetsCredentials {
  client_email: string;
  private_key: string;
}

export interface SheetsConfig {
  spreadsheetId: string;
  range: string;
  credentials: SheetsCredentials;
}

export interface SheetsAPIResponse<T> {
  success: boolean;
  data: T[];
  lastFetched?: string;
  error?: string;
}
```

---

## Caching Strategy

### Next.js Built-in Caching

**File:** `app/api/transactions/route.ts`

```typescript
export async function GET() {
  const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv`;

  const response = await fetch(csvUrl, {
    // Cache for 5 minutes
    next: { revalidate: 300 }
  });

  // ... rest of code
}
```

### Custom Cache Headers

```typescript
export async function GET() {
  // ... fetch data

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
```

### Redis Caching (Advanced)

For high-traffic applications, use Redis for caching:

```bash
npm install @upstash/redis
```

**File:** `lib/cache.ts`

```typescript
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const CACHE_TTL = 300; // 5 minutes

export async function getCachedTransactions() {
  return await redis.get('transactions');
}

export async function setCachedTransactions(data: any) {
  await redis.setex('transactions', CACHE_TTL, JSON.stringify(data));
}
```

---

## Rate Limiting

### Simple In-Memory Rate Limiter

**File:** `lib/rate-limit.ts`

```typescript
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

export function checkRateLimit(
  identifier: string,
  limit: number = 60,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}
```

**Usage in API Route:**

```typescript
import { checkRateLimit } from '@/lib/rate-limit';
import { headers } from 'next/headers';

export async function GET() {
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for') || 'anonymous';

  if (!checkRateLimit(ip, 30, 60000)) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }

  // ... rest of API logic
}
```

### Upstash Rate Limiting (Production)

```bash
npm install @upstash/ratelimit
```

**File:** `lib/rate-limit.ts`

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 m'),
  analytics: true,
});
```

---

## Error Handling Patterns

### Comprehensive Error Handler

**File:** `lib/api-error.ts`

```typescript
export class APIError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export function handleAPIError(error: unknown) {
  console.error('API Error:', error);

  if (error instanceof APIError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code,
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof Error) {
    // Network errors
    if (error.message.includes('fetch')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch data from Google Sheets',
          code: 'NETWORK_ERROR',
        },
        { status: 503 }
      );
    }

    // Parsing errors
    if (error.message.includes('parse')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to parse sheet data',
          code: 'PARSE_ERROR',
        },
        { status: 500 }
      );
    }
  }

  // Generic error
  return NextResponse.json(
    {
      success: false,
      error: 'Internal server error',
      code: 'UNKNOWN_ERROR',
    },
    { status: 500 }
  );
}
```

**Usage:**

```typescript
export async function GET() {
  try {
    // ... API logic
  } catch (error) {
    return handleAPIError(error);
  }
}
```

### Retry Logic

**File:** `lib/retry.ts`

```typescript
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      const delay = baseDelay * Math.pow(2, i);
      console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('Max retries exceeded');
}
```

**Usage:**

```typescript
const transactions = await retryWithBackoff(async () => {
  const response = await fetch(csvUrl);
  if (!response.ok) throw new Error('Fetch failed');
  return response.text();
});
```

---

## Performance Optimization

### 1. Data Transformation Optimization

```typescript
// Use streaming for large datasets
async function parseCSVStream(csvText: string): Promise<Transaction[]> {
  const rows = csvText.split('\n');
  const transactions: Transaction[] = [];

  // Skip header
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i].trim()) continue;

    const fields = rows[i].split(',');
    transactions.push({
      date: fields[0],
      description: fields[1],
      category: fields[2],
      amount: parseFloat(fields[3]),
      paymentMethod: fields[4],
      status: fields[5] || 'completed',
    });
  }

  return transactions;
}
```

### 2. Incremental Static Regeneration

**File:** `app/dashboard/page.tsx`

```typescript
// Regenerate page every 5 minutes
export const revalidate = 300;

export default async function DashboardPage() {
  const response = await fetch('http://localhost:3000/api/transactions', {
    next: { revalidate: 300 }
  });

  const data = await response.json();

  return <DataTable data={data.data} />;
}
```

### 3. Client-Side Caching with SWR

```bash
npm install swr
```

```typescript
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useTransactions() {
  const { data, error, mutate } = useSWR('/api/transactions', fetcher, {
    refreshInterval: 300000, // 5 minutes
    revalidateOnFocus: false,
  });

  return {
    transactions: data?.data || [],
    loading: !error && !data,
    error,
    refetch: mutate,
  };
}
```

---

## Security Considerations

### 1. Environment Variables

Never commit credentials to git:

```bash
# .gitignore
.env.local
.env*.local
credentials.json
```

### 2. CORS Configuration

If building separate frontend:

```typescript
export async function GET(request: Request) {
  const origin = request.headers.get('origin');
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (origin && allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return NextResponse.json(data, { headers });
}
```

### 3. Input Validation

```typescript
import { z } from 'zod';

const TransactionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().min(1).max(200),
  category: z.string(),
  amount: z.number().positive(),
  paymentMethod: z.string(),
  status: z.enum(['completed', 'pending', 'failed']),
});

// Validate parsed data
const validatedTransactions = rawData.map(item =>
  TransactionSchema.parse(item)
);
```

---

## Testing Strategy

### Unit Tests

**File:** `__tests__/api/transactions.test.ts`

```typescript
import { GET } from '@/app/api/transactions/route';

// Mock fetch
global.fetch = jest.fn();

describe('Transactions API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch and parse CSV data', async () => {
    const mockCSV = 'date,description,category,amount\n2024-01-01,Test,Food,25.00';

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: async () => mockCSV,
    });

    const response = await GET();
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(data.data[0].amount).toBe(25);
  });

  it('should handle fetch errors', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const response = await GET();
    const data = await response.json();

    expect(data.success).toBe(false);
    expect(response.status).toBe(500);
  });
});
```

---

## Monitoring and Logging

### Structured Logging

**File:** `lib/logger.ts`

```typescript
export const logger = {
  info: (message: string, meta?: Record<string, any>) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    }));
  },

  error: (message: string, error?: Error, meta?: Record<string, any>) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: error?.message,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      ...meta,
    }));
  },
};
```

**Usage:**

```typescript
logger.info('Fetching transactions', { spreadsheetId: SPREADSHEET_ID });
logger.error('Failed to fetch', error, { spreadsheetId: SPREADSHEET_ID });
```

---

## Migration Path

### Phase 1: CSV Implementation (Week 1)
1. Create API route with CSV export
2. Implement basic error handling
3. Add client-side hook
4. Update dashboard to use API

### Phase 2: Optimization (Week 2)
1. Add caching layer
2. Implement rate limiting
3. Add retry logic
4. Optimize parsing

### Phase 3: Enhancement (Week 3+)
1. Add WebSocket for real-time updates
2. Implement offline support
3. Add data validation
4. Performance monitoring

---

## Recommendation

**Use CSV Export URL Approach** for your finance tracker because:

1. Your sheet is public (based on URL sharing)
2. Read-only operation (just displaying data)
3. Faster implementation (no auth setup)
4. Lower maintenance overhead
5. Better performance (direct fetch, no API quota)
6. Simpler debugging

**Upgrade to API v4** only if you need:
- Write operations
- Private sheet access
- Advanced features (formulas, formatting)
- Complex queries

---

## References

- [Node.js quickstart - Google Sheets API](https://developers.google.com/workspace/sheets/api/quickstart/nodejs)
- [CSV Export from Public Google Sheets](https://yasha.solutions/posts/2025-10-24-how-to-download-google-spreadsheet-as-a-csv-from-a-public-url/)
- [Rate Limiting in Next.js](https://dev.to/ethanleetech/4-best-rate-limiting-solutions-for-nextjs-apps-2024-3ljj)
- [Next.js API Caching Best Practices](https://dev.to/melvinprince/mastering-nextjs-api-caching-improve-performance-with-middleware-and-headers-176p)
- [googleapis Documentation](https://googleapis.dev/nodejs/googleapis/latest/index)
- [Google Sheets CSV Export with GID](https://matrixify-excelify.medium.com/download-specific-google-sheets-tab-as-csv-file-e805ecef29fc)

---

## Next Steps

1. Verify Google Sheet is set to "Anyone with link can view"
2. Test CSV export URL in browser to confirm accessibility
3. Create `/api/transactions/route.ts` with CSV implementation
4. Create `hooks/use-transactions.ts` for data fetching
5. Update `app/dashboard/page.tsx` to use the hook
6. Add loading and error states
7. Implement refresh button
8. Add caching if needed
9. Monitor performance
10. Coordinate with UI team for data display

**Implementation Priority:** HIGH
**Estimated Time:** 2-4 hours for basic CSV implementation
**Dependencies:** None (can proceed immediately)
