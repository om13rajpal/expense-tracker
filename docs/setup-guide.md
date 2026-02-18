# Setup Guide

## Prerequisites

- **Node.js** 20 or later
- **MongoDB** instance (MongoDB Atlas recommended for production)
- **Google Cloud** service account (for Sheets integration)
- **OpenRouter** account (for AI features)

## Step 1: Clone and Install

```bash
git clone <repo-url>
cd expense-tracker
npm install
```

## Step 2: MongoDB Setup

### Local MongoDB
```bash
mongod --dbpath /path/to/data
```

### MongoDB Atlas
1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a database user
3. Whitelist your IP (or use `0.0.0.0/0` for development)
4. Copy the connection string

Set in `.env.local`:
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net
MONGODB_DB=finance
```

No schema migration needed. Collections are created automatically on first write.

## Step 3: Authentication

The app uses single-user JWT authentication. Set your credentials:

```env
AUTH_USERNAME=your_email@example.com
AUTH_PASSWORD=your_secure_password
JWT_SECRET=generate_a_random_32_char_string
```

Generate a JWT secret:
```bash
node scripts/generate-secret.js
```

## Step 4: Google Sheets Integration

### Option A: Public Sheet (Simplest)
1. Create a Google Sheet with transaction data
2. Set sharing to "Anyone with the link can view"
3. Copy the Sheet ID from the URL: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/`

```env
GOOGLE_SHEETS_ID=your_sheet_id
```

### Option B: Service Account (Private Sheets)
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project and enable the Google Sheets API
3. Create a service account under IAM & Admin > Service Accounts
4. Download the JSON key file
5. Share your Google Sheet with the service account email

```env
GOOGLE_SHEETS_ID=your_sheet_id
GOOGLE_SERVICE_ACCOUNT_EMAIL=sa@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

### Sheet Format

Your Google Sheet must have these columns (row 1 = headers):

| Column | Required | Description |
|---|---|---|
| txn_id | Yes | Unique transaction ID |
| value_date | Yes | Transaction date (DD/MM/YYYY or YYYY-MM-DD) |
| post_date | No | Bank posting date |
| description | Yes | Transaction description |
| reference_no | No | Bank reference number |
| debit | Yes | Expense amount (empty if credit) |
| credit | Yes | Income amount (empty if debit) |
| balance | No | Running balance |

## Step 5: AI Features (OpenRouter)

1. Sign up at [openrouter.ai](https://openrouter.ai)
2. Add credits and create an API key
3. The app uses `anthropic/claude-sonnet-4.5` by default

```env
OPENROUTER_API_KEY=sk-or-v1-...
```

### Optional: Market Search Context
For investment insights with real-time market context:
1. Sign up at [tavily.com](https://tavily.com)
2. Get an API key

```env
TAVILY_API_KEY=tvly-...
```

## Step 6: Investment Data

For live stock quotes:
1. Sign up at [finnhub.io](https://finnhub.io)
2. Get a free API key

```env
FINNHUB_API_KEY=your_key
```

Mutual fund NAVs are fetched from [mfapi.in](https://www.mfapi.in) (no API key required).

## Step 7: Background Jobs (Inngest)

### Local Development
```bash
npx inngest-cli@latest dev
```

This starts the Inngest dev server at `http://localhost:8288`, which discovers your functions at `/api/inngest`.

### Production (Vercel)
1. Install the [Inngest Vercel Integration](https://vercel.com/integrations/inngest)
2. Inngest automatically discovers functions from the `/api/inngest` endpoint

### Legacy Cron (Optional)
For manual triggering without Inngest, set:
```env
CRON_SECRET=your_secret
```

Then call endpoints with `x-cron-secret` header:
```bash
curl -H "x-cron-secret: your_secret" https://your-app.vercel.app/api/cron/sync
```

## Step 8: Run

```bash
# Development
npm run dev

# Production build
npm run build
npm start
```

## Step 9: Deploy to Vercel

```bash
npx vercel
```

Or connect your GitHub repo in the Vercel dashboard. Set all environment variables in the Vercel project settings.

## Troubleshooting

### Build fails with "AUTH_USERNAME must be set"
Set all required env vars in your `.env.local` file. The auth module validates env vars at import time.

### Google Sheets sync returns empty
- Verify the Sheet ID is correct
- Check that the sheet is shared publicly or with the service account
- Verify column headers match the expected format

### AI insights return error
- Check that `OPENROUTER_API_KEY` is valid and has credits
- The app falls back to cached insights if generation fails

### Stock quotes not updating
- Verify `FINNHUB_API_KEY` is valid
- Finnhub free tier has rate limits (60 calls/minute)
