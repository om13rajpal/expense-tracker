# Finova API Documentation

## Overview
This API provides authentication and transaction management for the Finova application.

## Base URL
- Development: `http://localhost:3000/api`
- Production: Configure in `NEXT_PUBLIC_API_URL`

## Authentication

All endpoints except `/auth/login` require authentication via JWT token.

### Headers
```
Authorization: Bearer <your-jwt-token>
```

Or use cookies (automatically set after login):
```
Cookie: auth-token=<your-jwt-token>
```

## Endpoints

### 1. Authentication

#### POST `/api/auth/login`
Authenticate user and receive JWT token.

**Request Body:**
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
  "message": "Authentication successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Status Codes:**
- 200: Success
- 400: Missing credentials
- 401: Invalid credentials
- 500: Server error

---

#### POST `/api/auth/logout`
Clear authentication token.

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

#### GET `/api/auth/verify`
Verify if current token is valid.

**Response:**
```json
{
  "success": true,
  "authenticated": true,
  "username": "omrajpal"
}
```

---

### 2. Google Sheets Sync

#### GET `/api/sheets/sync`
Fetch transaction data from Google Sheets.

**Query Parameters:**
- `force` (boolean): Force refresh cache (default: false)

**Response:**
```json
{
  "success": true,
  "message": "Data synced successfully",
  "transactions": [...],
  "lastSync": "2024-01-26T12:00:00.000Z",
  "count": 150,
  "cached": false
}
```

**Status Codes:**
- 200: Success
- 401: Unauthorized
- 500: Sync failed

---

#### DELETE `/api/sheets/sync`
Clear cached transaction data.

**Response:**
```json
{
  "success": true,
  "message": "Cache cleared successfully"
}
```

---

### 3. Transactions

#### GET `/api/transactions`
Get filtered and sorted transaction data.

**Query Parameters:**
- `category` (string): Filter by category
- `paymentMethod` (string): Filter by payment method
- `startDate` (string): Filter by start date (ISO 8601)
- `endDate` (string): Filter by end date (ISO 8601)
- `minAmount` (number): Minimum transaction amount
- `maxAmount` (number): Maximum transaction amount
- `limit` (number): Limit results (pagination)
- `offset` (number): Offset for pagination (default: 0)
- `sort` (string): Sort field (date, amount, category, merchant)
- `order` (string): Sort order (asc, desc)

**Example Request:**
```
GET /api/transactions?category=Groceries&startDate=2024-01-01&endDate=2024-01-31&sort=amount&order=desc&limit=10
```

**Response:**
```json
{
  "success": true,
  "transactions": [
    {
      "id": "txn_1_123456",
      "date": "2024-01-15T00:00:00.000Z",
      "description": "Grocery shopping",
      "merchant": "Walmart",
      "category": "Groceries",
      "amount": 125.50,
      "type": "expense",
      "paymentMethod": "Credit Card",
      "account": "Main Checking",
      "status": "completed",
      "tags": ["groceries", "household"],
      "recurring": false
    }
  ],
  "count": 10,
  "total": 45,
  "filters": {
    "category": "Groceries",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  },
  "pagination": {
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}
```

**Status Codes:**
- 200: Success
- 401: Unauthorized
- 404: No data available
- 500: Server error

---

## Data Models

### Transaction
```typescript
interface Transaction {
  id: string;
  date: Date;
  description: string;
  merchant: string;
  category: TransactionCategory;
  amount: number;
  type: TransactionType;
  paymentMethod: PaymentMethod;
  account: string;
  status: TransactionStatus;
  tags: string[];
  notes?: string;
  location?: string;
  receiptUrl?: string;
  recurring: boolean;
  relatedTransactionId?: string;
}
```

### Enums

**TransactionType:**
- `income`
- `expense`
- `transfer`
- `investment`
- `refund`

**TransactionCategory:**
- Income: Salary, Freelance, Business, Investment Income, Other Income
- Essential: Rent, Utilities, Groceries, Healthcare, Insurance, Transport, Fuel
- Lifestyle: Dining, Entertainment, Shopping, Travel, Education, Fitness
- Financial: Savings, Investment, Loan Payment, Credit Card, Tax
- Other: Subscription, Gifts, Charity, Miscellaneous, Uncategorized

**PaymentMethod:**
- Cash
- Debit Card
- Credit Card
- UPI
- Net Banking
- Wallet
- Cheque
- Other

**TransactionStatus:**
- `completed`
- `pending`
- `failed`
- `cancelled`

---

## Error Handling

All errors follow this format:
```json
{
  "success": false,
  "message": "Error description"
}
```

Common error status codes:
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Internal Server Error

---

## Setup Instructions

1. Copy `.env.example` to `.env.local`
2. Configure environment variables:
   - `JWT_SECRET`: Generate with `openssl rand -base64 32`
   - `GOOGLE_API_KEY`: For public sheets
   - Or `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_PRIVATE_KEY` for private sheets

3. Install dependencies:
```bash
npm install
```

4. Run development server:
```bash
npm run dev
```

5. Test authentication:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"omrajpal","password":"13245678"}'
```

---

## Google Sheets Setup

### For Public Sheets:
1. Make your sheet public (Anyone with link can view)
2. Get an API key from Google Cloud Console
3. Add to `.env.local`: `GOOGLE_API_KEY=your-key`

### For Private Sheets:
1. Create a service account in Google Cloud Console
2. Enable Google Sheets API
3. Download JSON key file
4. Share your sheet with the service account email
5. Add credentials to `.env.local`:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`

---

## Rate Limiting

Current implementation uses in-memory caching to reduce API calls to Google Sheets.
- Cache duration: Until manually cleared or server restart
- Force refresh: Use `?force=true` parameter

---

## Security Notes

1. Never commit `.env.local` to version control
2. Use strong JWT secret in production
3. Enable HTTPS in production
4. Implement rate limiting for production
5. Rotate credentials regularly
6. Use service account with minimal permissions

---

## Future Enhancements

- [ ] Rate limiting middleware
- [ ] Request validation with Zod
- [ ] Webhook support for real-time sync
- [ ] Analytics aggregation endpoints
- [ ] Bulk transaction operations
- [ ] Export functionality (CSV, PDF)
- [ ] Database integration (PostgreSQL/MongoDB)
- [ ] Multi-user support
- [ ] Role-based access control
