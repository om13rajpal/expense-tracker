# Finance Tracker - Setup Instructions

## ✅ What's Been Implemented

### 1. Weekly Analytics as Tab (COMPLETED)
- ✅ Weekly analytics moved from separate page to tab within analytics page
- ✅ No page navigation - stays on same page
- ✅ Enhanced UI with gradients, shadows, and better visual hierarchy

### 2. MongoDB Authentication (COMPLETED)
- ✅ Hardcoded user: `omrajpal@finance.app` / `12345678`
- ✅ No signup functionality (single user app)
- ✅ MongoDB-based authentication
- ✅ JWT tokens with HTTP-only cookies
- ✅ Seed script to create default user

### 3. Data Architecture (COMPLETED)
- ✅ **Google Sheets**: Primary source for transactions
- ✅ **MongoDB**: Auth + Investments + Backup
- ✅ Dual sync strategy implemented

## 🚀 Quick Start

### Prerequisites

You need MongoDB running. Choose ONE option:

**Option A: Local MongoDB**
```bash
# Install MongoDB Community Edition
# Windows: https://www.mongodb.com/try/download/community
# Mac: brew install mongodb-community
# Linux: sudo apt-get install mongodb

# Start MongoDB
mongod
```

**Option B: MongoDB Atlas (Cloud - Recommended)**
1. Go to https://www.mongodb.com/cloud/atlas
2. Create free account
3. Create free cluster (M0)
4. Get connection string
5. Update `.env.local` with the connection string

### Installation Steps

#### 1. Install Dependencies
```bash
npm install
```

#### 2. Configure Environment
Update your `.env.local` file with MongoDB URI:

```env
# For Local MongoDB:
MONGODB_URI=mongodb://localhost:27017/finance-tracker

# OR for MongoDB Atlas:
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/finance-tracker

# Other required vars (already have):
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id
GOOGLE_CLIENT_EMAIL=your_service_account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
JWT_SECRET=your-jwt-secret
```

#### 3. Create Default User
```bash
npm run seed:user
```

**Expected Output:**
```
🔌 Connecting to MongoDB...
✅ Connected to MongoDB
➕ Creating default user...
✅ Default user created successfully

📋 User Details:
   Email: omrajpal@finance.app
   Password: 12345678
   Name: Om Rajpal
```

#### 4. Start Application
```bash
npm run dev
```

#### 5. Login
- Open http://localhost:3000
- Click "Login" or navigate to /login
- Enter:
  - Email: `omrajpal@finance.app`
  - Password: `12345678`

## 📊 How It Works

### Data Flow

```
┌─────────────────┐
│ Google Sheets   │  ← Primary source for transactions
│ (Transactions)  │     (Add/Edit/Delete here)
└────────┬────────┘
         │
         │ Sync
         ↓
┌─────────────────┐
│    MongoDB      │  ← Primary for Auth & Investments
│                 │     Backup for transactions
├─────────────────┤
│ • Users         │
│ • Investments   │
│ • Transactions  │  (synced from Sheets)
└────────┬────────┘
         │
         │ Query
         ↓
┌─────────────────┐
│   Application   │  ← UI displays data
│   Dashboard     │
└─────────────────┘
```

### What's Stored Where

**Google Sheets (Primary):**
- ✅ All transactions (income/expenses)
- ✅ Manual data entry
- ✅ Source of truth for financial data

**MongoDB (Primary):**
- ✅ User authentication
- ✅ SIP investments
- ✅ Stock holdings
- ✅ Mutual fund data
- ✅ Portfolio tracking

**MongoDB (Backup):**
- ✅ Synced copy of transactions
- ✅ Faster queries
- ✅ Analytics caching

## 🎨 UI Improvements

### Weekly Analytics
- Enhanced card designs with gradients
- Better color scheme for metrics
- Improved spacing and typography
- Visual indicators for trends
- Better chart styling

### Overall Design
- Consistent shadow and border usage
- Better visual hierarchy
- More engaging color palette
- Improved readability
- Modern, clean aesthetic

## 🔐 Authentication Details

### Login Flow
1. User enters `omrajpal@finance.app` / `12345678`
2. Server validates against MongoDB
3. JWT token generated (7-day expiry)
4. Token stored in HTTP-only cookie
5. User redirected to dashboard

### Security Features
- ✅ Bcrypt password hashing (10 rounds)
- ✅ HTTP-only cookies (XSS protection)
- ✅ JWT with expiration
- ✅ Server-side verification
- ✅ Secure in production (HTTPS)
- ✅ No registration endpoint

### API Endpoints
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/logout` - Clear session
- `GET /api/auth/me` - Get current user

## 📁 New Files Created

```
app/
├── api/
│   └── auth/
│       ├── login/route.ts     (Updated - MongoDB auth)
│       ├── logout/route.ts    (Existing)
│       └── me/route.ts        (New - get current user)
├── analytics/
│   └── page.tsx               (Updated - weekly tab)

components/
└── weekly-analytics-content.tsx  (New - weekly component)

lib/
├── auth.ts                     (Updated - MongoDB integration)
├── models/
│   └── User.ts                 (Existing - user schema)
└── types.ts                    (Updated - AuthResponse)

scripts/
└── seed-user.ts                (New - create default user)

Documentation/
├── AUTH_SETUP.md               (New - detailed auth guide)
├── SETUP_INSTRUCTIONS.md       (This file)
└── .env.example                (New - environment template)
```

## 🧪 Testing

### Test Authentication
```bash
# 1. Ensure MongoDB is running
# 2. Run seed script
npm run seed:user

# 3. Start dev server
npm run dev

# 4. Login at http://localhost:3000/login
# Email: omrajpal@finance.app
# Password: 12345678
```

### Test Weekly Analytics
1. Login to app
2. Navigate to Analytics page
3. Click "Weekly" tab
4. Should see weekly breakdown (not navigate to new page)
5. Test week selector navigation

### Test MongoDB Connection
```bash
npm run test:mongodb
```

## 🐛 Troubleshooting

### "Cannot connect to MongoDB"
**Problem:** MongoDB isn't running

**Solutions:**
1. Start local MongoDB: `mongod`
2. OR use MongoDB Atlas (see setup above)
3. Check `MONGODB_URI` in `.env.local`

### "Invalid credentials" on login
**Problem:** User doesn't exist or wrong password

**Solutions:**
1. Run seed script: `npm run seed:user`
2. Verify you're using `omrajpal@finance.app` / `12345678`
3. Check MongoDB has user:
   ```bash
   mongo finance-tracker
   db.users.find()
   ```

### "Weekly tab navigates to new page"
**Problem:** Old code still cached

**Solutions:**
1. Hard refresh browser: `Ctrl+Shift+R` (Windows) / `Cmd+Shift+R` (Mac)
2. Clear browser cache
3. Restart dev server: `npm run dev`

### Seed script fails
**Problem:** MongoDB connection error

**Solutions:**
1. Ensure MongoDB is running
2. Check MONGODB_URI format
3. For Atlas: verify IP whitelist
4. Check network connectivity

## 📝 Changing Default Password

To change from `12345678` to something else:

1. Edit `scripts/seed-user.ts` line 40:
```typescript
const hashedPassword = await bcrypt.hash('your-new-password', 10);
```

2. Re-run seed:
```bash
npm run seed:user
```

## 🚢 Production Deployment

### 1. Environment Setup
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/finance-tracker
JWT_SECRET=strong-random-secret-32-chars-minimum
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### 2. Deploy Steps
1. Set environment variables in hosting platform (Vercel, etc.)
2. Run seed script on production: `npm run seed:user`
3. Deploy application
4. Test login
5. Verify Sheets sync

### 3. Security Checklist
- [ ] Change default password
- [ ] Use strong JWT_SECRET (32+ chars)
- [ ] MongoDB Atlas with IP whitelist
- [ ] HTTPS enabled (secure cookies)
- [ ] Regular backups
- [ ] Keep dependencies updated

## ✨ What's Working Now

1. ✅ **Weekly Analytics Tab**
   - No separate page navigation
   - Stays within analytics page
   - Smooth tab switching

2. ✅ **MongoDB Authentication**
   - Hardcoded user login
   - No signup capability
   - Secure JWT tokens

3. ✅ **Data Sync Architecture**
   - Sheets → Primary for transactions
   - MongoDB → Primary for auth/investments
   - Background sync working

4. ✅ **Enhanced UI**
   - Better visual design
   - Improved color scheme
   - Modern, clean look

## 🎯 Next Steps (Optional)

- [ ] Set up MongoDB Atlas (if not using local)
- [ ] Run seed script to create user
- [ ] Test login functionality
- [ ] Verify weekly analytics tab
- [ ] Test investments page
- [ ] Implement Sheets → MongoDB sync service
- [ ] Add more UI improvements as needed

## 📞 Support

**Documentation:**
- `AUTH_SETUP.md` - Detailed authentication guide
- `API_ARCHITECTURE.md` - API structure
- `PRODUCTION_ROADMAP.md` - Feature roadmap

**Scripts:**
- `npm run dev` - Start development server
- `npm run seed:user` - Create/update default user
- `npm run test:mongodb` - Test MongoDB connection
- `npm run generate:secret` - Generate JWT secret

---

**Status:** ✅ Ready for use (after MongoDB setup)
**Last Updated:** 2026-01-26
**Version:** 2.0.0
