# Finance Tracker API

A complete Next.js 15+ API implementation for managing financial transactions with Google Sheets integration and JWT authentication.

## 🎯 Quick Overview

This API provides:
- **Authentication**: Secure JWT-based login system
- **Google Sheets Sync**: Automatic transaction data fetching
- **Transaction Management**: Advanced filtering, sorting, and pagination
- **React Hooks**: Easy client-side integration

## 🚀 Getting Started (3 Steps)

### Step 1: Install
```bash
npm install
```

### Step 2: Configure
```bash
cp .env.example .env.local
# Edit .env.local and add your JWT_SECRET and Google credentials
```

### Step 3: Run
```bash
npm run dev
```

The API is now available at `http://localhost:3000/api`

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [API_SETUP_GUIDE.md](API_SETUP_GUIDE.md) | Complete setup instructions and troubleshooting |
| [API_DELIVERABLES_SUMMARY.md](API_DELIVERABLES_SUMMARY.md) | Technical specifications and deliverables |
| [INTEGRATION_EXAMPLES.md](INTEGRATION_EXAMPLES.md) | React code examples and patterns |
| [app/api/README.md](app/api/README.md) | API endpoint reference |

## 🔑 Default Credentials

```
Username: omrajpal
Password: 13245678
```

## 📊 API Endpoints

### Authentication
```bash
POST   /api/auth/login    # Login and get JWT token
POST   /api/auth/logout   # Logout and clear session
GET    /api/auth/verify   # Verify token validity
```

### Data Management
```bash
GET    /api/sheets/sync       # Sync from Google Sheets
DELETE /api/sheets/sync       # Clear cache
GET    /api/transactions      # Get filtered transactions
```

## 💡 Quick Test

```bash
# Test the API
npm run test:api

# Manual test with curl
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"omrajpal","password":"13245678"}'
```

## 🔧 Environment Variables

```env
JWT_SECRET=your-secret-key              # Required
GOOGLE_API_KEY=your-api-key             # For public sheets
# OR
GOOGLE_SERVICE_ACCOUNT_EMAIL=email      # For private sheets
GOOGLE_PRIVATE_KEY=key                  # For private sheets
```

## 📦 React Integration

### Using Authentication
```tsx
import { useAuth } from '@/hooks/use-auth';

function LoginPage() {
  const { login, isLoading } = useAuth();

  const handleLogin = async () => {
    await login({ username: 'omrajpal', password: '13245678' });
  };

  return <button onClick={handleLogin}>Login</button>;
}
```

### Using Transactions
```tsx
import { useTransactions } from '@/hooks/use-transactions';

function Dashboard() {
  const { transactions, syncFromSheets, isSyncing } = useTransactions();

  return (
    <div>
      <button onClick={() => syncFromSheets(true)}>
        {isSyncing ? 'Syncing...' : 'Sync Data'}
      </button>
      {transactions.map(txn => (
        <div key={txn.id}>{txn.description} - ${txn.amount}</div>
      ))}
    </div>
  );
}
```

## 🗂️ File Structure

```
app/api/
├── auth/
│   ├── login/route.ts        # Authentication endpoint
│   ├── logout/route.ts       # Logout endpoint
│   └── verify/route.ts       # Verification endpoint
├── sheets/
│   └── sync/route.ts         # Google Sheets sync
└── transactions/
    └── route.ts              # Transaction queries

lib/
├── auth.ts                   # Auth utilities
├── middleware.ts             # Protected routes
├── sheets.ts                 # Google Sheets integration
└── types.ts                  # TypeScript types

hooks/
├── use-auth.ts               # Auth hook
└── use-transactions.ts       # Transactions hook
```

## ✨ Features

- ✅ JWT Authentication with HTTP-only cookies
- ✅ Google Sheets integration (public & private)
- ✅ Transaction filtering and sorting
- ✅ Pagination support
- ✅ In-memory caching
- ✅ TypeScript support
- ✅ React hooks for easy integration
- ✅ Comprehensive error handling
- ✅ CORS configuration
- ✅ Automated testing

## 🧪 Testing

Run the automated test suite:
```bash
npm run test:api
```

Tests include:
- Authentication (login, logout, verify)
- Google Sheets sync
- Transaction fetching
- Filtering and pagination
- Error handling

## 📖 Example Usage

### Login and Fetch Transactions
```javascript
// 1. Login
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'omrajpal', password: '13245678' }),
  credentials: 'include'
});
const { token } = await loginResponse.json();

// 2. Sync data
await fetch('/api/sheets/sync?force=true', {
  credentials: 'include'
});

// 3. Get transactions
const txnResponse = await fetch('/api/transactions?limit=10&sort=date&order=desc', {
  credentials: 'include'
});
const { transactions } = await txnResponse.json();
```

## 🔒 Security

- JWT tokens expire after 7 days
- HTTP-only cookies prevent XSS
- Protected routes require authentication
- CORS configured for production
- Input validation on all endpoints

## 🐛 Troubleshooting

**Issue**: "Failed to fetch transactions"
- Check Google Sheets credentials in `.env.local`
- Verify sheet is shared with service account
- Run sync first: `GET /api/sheets/sync`

**Issue**: "Authentication required"
- Login first to get token
- Ensure cookies are enabled
- Check token expiration

**Issue**: "Invalid credentials"
- Use: `username: omrajpal, password: 13245678`

See [API_SETUP_GUIDE.md](API_SETUP_GUIDE.md) for more troubleshooting.

## 📝 Google Sheets Setup

Your Google Sheet should have these columns:
1. Date, 2. Description, 3. Merchant, 4. Category, 5. Amount, 6. Type, 7. Payment Method, 8. Account, 9. Status, 10. Tags, 11. Notes, 12. Location, 13. Receipt URL, 14. Recurring, 15. Related Transaction ID

**Sheet ID**: `1yw-KSfgyit84gDoSUgaRsRFH4Mj2DnxXHYaF_yx3UTA`

## 🚧 Future Enhancements

- [ ] Database integration (PostgreSQL/MongoDB)
- [ ] Rate limiting middleware
- [ ] Analytics endpoints
- [ ] Export to CSV/PDF
- [ ] Webhook support
- [ ] Multi-user support
- [ ] Request validation with Zod

## 📄 License

Private - Internal Use Only

---

**Built with**: Next.js 15, TypeScript, JWT, Google Sheets API, React Hooks

**Status**: ✅ Production Ready
