# Finance Tracker API - Setup Checklist

Follow this checklist to get your Finance Tracker API up and running.

## ✅ Pre-Installation Checklist

- [ ] Node.js 18+ installed
- [ ] npm or yarn package manager
- [ ] Git (optional)
- [ ] Google Cloud account (for Sheets API)
- [ ] Google Sheet with transaction data

## 📦 Installation Steps

### 1. Install Dependencies
```bash
npm install
```
- [ ] All dependencies installed successfully
- [ ] No error messages in console

### 2. Generate JWT Secret
```bash
npm run generate:secret
```
- [ ] Secret key generated
- [ ] Secret key copied for next step

### 3. Configure Environment Variables
```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in:

**Required:**
- [ ] `JWT_SECRET` - Use the generated secret from step 2
- [ ] `NODE_ENV` - Set to "development"

**Choose ONE Google Sheets option:**

**Option A: Public Sheet (Simpler)**
- [ ] `GOOGLE_API_KEY` - Get from Google Cloud Console
- [ ] Sheet is publicly accessible
- [ ] Google Sheets API is enabled in your project

**Option B: Private Sheet (Recommended)**
- [ ] `GOOGLE_SERVICE_ACCOUNT_EMAIL` - From service account JSON
- [ ] `GOOGLE_PRIVATE_KEY` - From service account JSON
- [ ] Service account created in Google Cloud Console
- [ ] Google Sheets API enabled
- [ ] Sheet shared with service account email

**Optional:**
- [ ] `GOOGLE_SHEET_ID` - Already set, or update if needed
- [ ] `NEXT_PUBLIC_API_URL` - Update if not using localhost:3000

### 4. Google Cloud Console Setup

If you haven't already:

**For API Key (Public Sheets):**
- [ ] Go to https://console.cloud.google.com/
- [ ] Create or select a project
- [ ] Enable "Google Sheets API"
- [ ] Create API Key (Credentials > Create Credentials > API Key)
- [ ] Copy API key to `.env.local`
- [ ] Make your Google Sheet public (Anyone with link can view)

**For Service Account (Private Sheets):**
- [ ] Go to https://console.cloud.google.com/
- [ ] Create or select a project
- [ ] Enable "Google Sheets API"
- [ ] Go to "IAM & Admin" > "Service Accounts"
- [ ] Click "Create Service Account"
- [ ] Name it (e.g., "finance-tracker-api")
- [ ] Click "Create and Continue"
- [ ] Skip role assignment (click "Continue")
- [ ] Click "Done"
- [ ] Click on the new service account
- [ ] Go to "Keys" tab
- [ ] Click "Add Key" > "Create new key"
- [ ] Choose "JSON" format
- [ ] Download the JSON file
- [ ] Copy `client_email` to `GOOGLE_SERVICE_ACCOUNT_EMAIL` in `.env.local`
- [ ] Copy `private_key` to `GOOGLE_PRIVATE_KEY` in `.env.local` (keep the \n characters)
- [ ] Open your Google Sheet
- [ ] Click "Share"
- [ ] Add the service account email as Editor or Viewer

### 5. Google Sheet Setup

Verify your Google Sheet structure:

- [ ] Sheet has correct column headers (see below)
- [ ] Data starts from row 2 (row 1 is headers)
- [ ] Date column is in YYYY-MM-DD format
- [ ] Amount column contains numbers only
- [ ] Sheet ID in URL matches `.env.local`

**Required Columns (in order):**
1. Date
2. Description
3. Merchant
4. Category
5. Amount
6. Type
7. Payment Method
8. Account
9. Status
10. Tags
11. Notes
12. Location
13. Receipt URL
14. Recurring
15. Related Transaction ID

### 6. Start Development Server
```bash
npm run dev
```
- [ ] Server starts without errors
- [ ] Listening on http://localhost:3000
- [ ] No compilation errors in terminal

### 7. Test the API

**Option A: Automated Tests**
```bash
npm run test:api
```
- [ ] All tests pass
- [ ] Login test successful
- [ ] Sheets sync test successful
- [ ] Transactions fetch test successful

**Option B: Manual Test**

**Test Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"omrajpal","password":"13245678"}'
```
- [ ] Returns success: true
- [ ] Returns a token
- [ ] No error messages

**Test Sync (replace TOKEN with your token from login):**
```bash
curl -X GET "http://localhost:3000/api/sheets/sync?force=true" \
  -H "Authorization: Bearer TOKEN"
```
- [ ] Returns success: true
- [ ] Returns transactions array
- [ ] Count > 0

**Test Transactions:**
```bash
curl -X GET "http://localhost:3000/api/transactions?limit=5" \
  -H "Authorization: Bearer TOKEN"
```
- [ ] Returns success: true
- [ ] Returns transactions array
- [ ] Transactions are properly formatted

### 8. Integration with React

**Test Authentication Hook:**
- [ ] `useAuth` hook imported successfully
- [ ] Login function works
- [ ] Logout function works
- [ ] isAuthenticated state updates correctly

**Test Transactions Hook:**
- [ ] `useTransactions` hook imported successfully
- [ ] Transactions load on mount
- [ ] Sync function works
- [ ] Filters apply correctly

### 9. Production Readiness (Optional)

For deployment to production:

- [ ] Generate new production JWT secret
- [ ] Update `.env` in production environment
- [ ] Use HTTPS (set `secure: true` in cookies)
- [ ] Enable rate limiting
- [ ] Set up monitoring
- [ ] Configure CORS for production domain
- [ ] Backup Google Sheets regularly
- [ ] Set up error logging (Sentry, etc.)
- [ ] Add database for persistent storage
- [ ] Implement request validation

## 🐛 Troubleshooting Checklist

If something doesn't work, check:

**General:**
- [ ] All dependencies installed (`node_modules` folder exists)
- [ ] `.env.local` file exists and is filled out
- [ ] No typos in environment variable names
- [ ] Server is running (`npm run dev`)

**Authentication Issues:**
- [ ] JWT_SECRET is set in `.env.local`
- [ ] Using correct credentials: `omrajpal` / `13245678`
- [ ] Cookies are enabled in browser
- [ ] Not using incognito/private mode (or allow cookies)

**Google Sheets Issues:**
- [ ] Google Sheets API is enabled
- [ ] API key or service account credentials are correct
- [ ] Sheet ID is correct (check the URL)
- [ ] Sheet is shared with service account email (for private sheets)
- [ ] Sheet has the correct column structure
- [ ] Data is in the correct format

**TypeScript Errors:**
- [ ] Run `npm install` again
- [ ] Check for type errors: `npx tsc --noEmit --skipLibCheck`
- [ ] Restart dev server

**API Not Responding:**
- [ ] Check terminal for errors
- [ ] Verify port 3000 is not in use
- [ ] Check Network tab in browser DevTools
- [ ] Verify API endpoint URL is correct

## 📚 Next Steps

After successful setup:

1. Read [INTEGRATION_EXAMPLES.md](INTEGRATION_EXAMPLES.md) for usage examples
2. Review [app/api/README.md](app/api/README.md) for API reference
3. Customize authentication credentials
4. Add more transaction data to Google Sheet
5. Build your dashboard UI
6. Implement analytics features

## ✅ Setup Complete!

If all items are checked, your Finance Tracker API is ready to use!

**Test it out:**
- Login at: http://localhost:3000/login
- View dashboard at: http://localhost:3000/dashboard
- API docs at: [app/api/README.md](app/api/README.md)

---

**Need Help?**
- Check [API_SETUP_GUIDE.md](API_SETUP_GUIDE.md) for detailed instructions
- Review [API_DELIVERABLES_SUMMARY.md](API_DELIVERABLES_SUMMARY.md) for technical details
- Run `npm run test:api` to diagnose issues
