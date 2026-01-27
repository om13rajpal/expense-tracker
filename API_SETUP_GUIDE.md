# Finance Tracker API Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file:
```bash
cp .env.example .env.local
```

Edit `.env.local` and configure:

#### Required:
```env
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
JWT_SECRET=your-generated-secret-here
```

#### For Google Sheets Access:

**Option A: Public Sheet with API Key**
1. Make your Google Sheet publicly accessible (Anyone with link can view)
2. Get an API key from [Google Cloud Console](https://console.cloud.google.com/)
3. Enable Google Sheets API for your project
4. Add to `.env.local`:
```env
GOOGLE_API_KEY=your-api-key-here
```

**Option B: Private Sheet with Service Account** (Recommended)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google Sheets API
4. Create a Service Account:
   - Go to "IAM & Admin" > "Service Accounts"
   - Click "Create Service Account"
   - Give it a name (e.g., "finance-tracker-api")
   - Click "Create and Continue"
   - Skip role assignment
   - Click "Done"
5. Create a key for the service account:
   - Click on the service account
   - Go to "Keys" tab
   - Click "Add Key" > "Create new key"
   - Choose JSON format
   - Download the key file
6. Share your Google Sheet with the service account email (found in the JSON file)
7. Add to `.env.local`:
```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Important**: Replace `\n` in the private key with actual newlines or keep as `\n` (the code handles both).

### 3. Verify Google Sheet Structure

Your Google Sheet should have these columns (in order):
1. Date (YYYY-MM-DD format)
2. Description
3. Merchant
4. Category
5. Amount (numeric)
6. Type (income/expense/transfer/investment/refund)
7. Payment Method
8. Account
9. Status (completed/pending/failed/cancelled)
10. Tags (comma-separated)
11. Notes
12. Location
13. Receipt URL
14. Recurring (Yes/No)
15. Related Transaction ID

Example row:
```
2024-01-15 | Grocery shopping | Walmart | Groceries | 125.50 | expense | Credit Card | Main Checking | completed | groceries,household | Weekly shopping | New York | | No |
```

### 4. Run Development Server
```bash
npm run dev
```

The API will be available at `http://localhost:3000/api`

### 5. Test the API

Run the automated test suite:
```bash
npm run test:api
```

Or test manually with curl:

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"omrajpal","password":"13245678"}'
```

**Verify Token:**
```bash
curl -X GET http://localhost:3000/api/auth/verify \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Sync Google Sheets:**
```bash
curl -X GET http://localhost:3000/api/sheets/sync \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Get Transactions:**
```bash
curl -X GET "http://localhost:3000/api/transactions?limit=10&sort=date&order=desc" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## API Endpoints

### Authentication

#### POST `/api/auth/login`
Login with username and password.

**Request:**
```json
{
  "username": "omrajpal",
  "password": "13245678"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGc...",
  "message": "Authentication successful"
}
```

#### GET `/api/auth/verify`
Verify current authentication token.

#### POST `/api/auth/logout`
Logout and clear session.

### Data Sync

#### GET `/api/sheets/sync?force=true`
Sync data from Google Sheets.

**Query Parameters:**
- `force`: Force refresh cache (default: false)

#### DELETE `/api/sheets/sync`
Clear cached data.

### Transactions

#### GET `/api/transactions`
Get filtered transaction data.

**Query Parameters:**
- `category`: Filter by category
- `paymentMethod`: Filter by payment method
- `startDate`: Start date (YYYY-MM-DD)
- `endDate`: End date (YYYY-MM-DD)
- `minAmount`: Minimum amount
- `maxAmount`: Maximum amount
- `limit`: Results per page
- `offset`: Pagination offset
- `sort`: Sort field (date, amount, category, merchant)
- `order`: Sort order (asc, desc)

**Example:**
```bash
GET /api/transactions?category=Groceries&startDate=2024-01-01&endDate=2024-01-31&sort=amount&order=desc&limit=10
```

## Using in React Components

### Authentication Hook

```tsx
import { useAuth } from '@/hooks/use-auth';

function LoginPage() {
  const { login, isLoading, error, isAuthenticated } = useAuth();

  const handleLogin = async () => {
    const result = await login({
      username: 'omrajpal',
      password: '13245678'
    });

    if (result.success) {
      // Redirect to dashboard
    }
  };

  return (
    // Your login UI
  );
}
```

### Transactions Hook

```tsx
import { useTransactions } from '@/hooks/use-transactions';

function TransactionsList() {
  const {
    transactions,
    isLoading,
    error,
    syncFromSheets,
    isSyncing,
  } = useTransactions({
    startDate: '2024-01-01',
    limit: 50,
  });

  const handleSync = async () => {
    await syncFromSheets(true); // force refresh
  };

  return (
    <div>
      <button onClick={handleSync} disabled={isSyncing}>
        {isSyncing ? 'Syncing...' : 'Sync from Sheets'}
      </button>

      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <ul>
          {transactions.map(txn => (
            <li key={txn.id}>{txn.description} - ${txn.amount}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

## Troubleshooting

### Error: "Failed to fetch transactions"

**Cause**: Google Sheets API not configured or inaccessible.

**Solutions**:
1. Verify `GOOGLE_API_KEY` or service account credentials in `.env.local`
2. Check that Google Sheets API is enabled in Google Cloud Console
3. Ensure the sheet ID is correct
4. For service account: Verify the sheet is shared with the service account email

### Error: "Authentication required"

**Cause**: Missing or invalid JWT token.

**Solutions**:
1. Login first to get a token
2. Include token in Authorization header: `Bearer YOUR_TOKEN`
3. Or ensure cookies are enabled (token stored in cookie)

### Error: "Invalid credentials"

**Cause**: Wrong username or password.

**Solution**: Use credentials: `username: omrajpal`, `password: 13245678`

### Error: "CORS policy blocked"

**Cause**: Cross-origin request blocked.

**Solutions**:
1. Ensure `credentials: 'include'` in fetch requests
2. API includes CORS headers by default
3. For production, configure allowed origins

### Data Not Syncing

**Solutions**:
1. Force refresh: `GET /api/sheets/sync?force=true`
2. Clear cache: `DELETE /api/sheets/sync`
3. Check Google Sheet permissions
4. Verify sheet structure matches expected format

## Security Best Practices

### Production Deployment

1. **Generate Strong JWT Secret**:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

2. **Use Environment Variables**:
   - Never commit `.env.local` to version control
   - Use platform-specific env var management (Vercel, Railway, etc.)

3. **Enable HTTPS**:
   - Always use HTTPS in production
   - Update cookie settings: `secure: true`

4. **Rate Limiting**:
   - Implement rate limiting for API endpoints
   - Use services like Upstash or Redis

5. **Service Account Security**:
   - Grant minimal permissions
   - Rotate credentials regularly
   - Use separate accounts for dev/prod

6. **Input Validation**:
   - Validate all query parameters
   - Sanitize user inputs
   - Use Zod for schema validation

## File Structure

```
finance/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts
│   │   │   ├── logout/route.ts
│   │   │   └── verify/route.ts
│   │   ├── sheets/
│   │   │   └── sync/route.ts
│   │   ├── transactions/
│   │   │   └── route.ts
│   │   └── README.md
├── lib/
│   ├── auth.ts              # Authentication utilities
│   ├── middleware.ts        # API middleware
│   ├── sheets.ts            # Google Sheets integration
│   └── types.ts             # TypeScript definitions
├── hooks/
│   ├── use-auth.ts          # Authentication hook
│   └── use-transactions.ts  # Transactions hook
├── scripts/
│   └── test-api.js          # API test suite
├── .env.local               # Environment variables (not in git)
├── .env.example             # Example environment file
└── API_SETUP_GUIDE.md       # This file
```

## Next Steps

1. Implement additional analytics endpoints
2. Add caching layer (Redis)
3. Implement rate limiting
4. Add request validation with Zod
5. Create webhook support for real-time sync
6. Add database integration (PostgreSQL/MongoDB)
7. Implement multi-user support
8. Add export functionality (CSV, PDF)

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review API documentation in `app/api/README.md`
3. Check Google Sheets API documentation
4. Verify environment variables are set correctly

## License

Private - Internal Use Only
