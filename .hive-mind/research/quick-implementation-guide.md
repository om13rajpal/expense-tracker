# Quick Implementation Guide - Google Sheets Integration

## Fastest Path to Implementation (CSV Approach)

### Step 1: Verify Sheet Access (1 min)

Test this URL in your browser:
```
https://docs.google.com/spreadsheets/d/1yw-KSfgyit84gDoSUgaRsRFH4Mj2DnxXHYaF_yx3UTA/export?format=csv&gid=0
```

If it downloads a CSV file, you're good to go!

### Step 2: Create Environment Variables (1 min)

Create `.env.local`:
```env
GOOGLE_SHEETS_ID=1yw-KSfgyit84gDoSUgaRsRFH4Mj2DnxXHYaF_yx3UTA
GOOGLE_SHEETS_GID=0
```

### Step 3: Create API Route (5 min)

Create `app/api/transactions/route.ts`:

```typescript
import { NextResponse } from 'next/server';

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID!;
const SHEET_GID = process.env.GOOGLE_SHEETS_GID || '0';

export async function GET() {
  try {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${SHEET_GID}`;

    const response = await fetch(csvUrl, {
      next: { revalidate: 300 } // Cache 5 minutes
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const csvText = await response.text();
    const rows = csvText.split('\n').filter(line => line.trim());

    // Skip header row
    const transactions = rows.slice(1).map(row => {
      const fields = row.split(',');
      return {
        date: fields[0] || '',
        description: fields[1] || '',
        category: fields[2] || '',
        amount: parseFloat(fields[3]) || 0,
        paymentMethod: fields[4] || '',
        status: fields[5] || 'completed',
      };
    });

    return NextResponse.json({
      success: true,
      data: transactions,
      count: transactions.length
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

### Step 4: Create React Hook (5 min)

Create `hooks/use-transactions.ts`:

```typescript
import { useState, useEffect } from 'react';

export function useTransactions() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/transactions');
      const result = await res.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { data, loading, error, refetch: fetchData };
}
```

### Step 5: Update Dashboard (3 min)

Update `app/dashboard/page.tsx`:

```typescript
'use client';

import { useTransactions } from '@/hooks/use-transactions';
import { DataTable } from '@/components/data-table';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const { data, loading, error, refetch } = useTransactions();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <Button onClick={refetch}>Refresh</Button>
      <DataTable data={data} />
    </div>
  );
}
```

### Step 6: Test (2 min)

```bash
npm run dev
```

Navigate to `http://localhost:3000/dashboard` and verify data loads!

---

## Expected Data Format

Your Google Sheet should have columns in this order:

| Date | Description | Category | Amount | Payment Method | Status |
|------|-------------|----------|--------|----------------|--------|
| 2024-01-01 | Grocery Store | Food | 45.50 | Credit Card | completed |
| 2024-01-02 | Gas Station | Transport | 60.00 | Debit Card | completed |

---

## Troubleshooting

### Sheet Not Accessible
- Check "Share" settings
- Set to "Anyone with the link can view"

### Wrong GID
- Open your sheet
- Look at URL for `#gid=123456789`
- Update `GOOGLE_SHEETS_GID` in `.env.local`

### CSV Format Issues
- Check for commas in data (use quotes)
- Verify column order matches expected format
- Check for empty rows

### CORS Errors
- API routes in Next.js don't have CORS issues
- Make sure you're using `/api/transactions` route, not direct fetch

---

## Performance Tips

1. **Caching:** Already set to 5 minutes (`revalidate: 300`)
2. **Rate Limiting:** Not needed for personal use
3. **Error Handling:** Already included basic handling
4. **Loading States:** Handled in hook

---

## Future Enhancements

1. Add better CSV parsing (handle quoted fields)
2. Add retry logic for failed fetches
3. Add data validation with Zod
4. Add real-time updates with polling
5. Add offline support with localStorage
6. Add sync status indicator

---

## Total Time: ~15 minutes

You should have a working integration pulling live data from Google Sheets!
