# Authentication Setup Guide

## Overview

This application uses MongoDB-based authentication with a **hardcoded single user** for personal use only.

**Default User:**
- Email: `omrajpal@finance.app`
- Password: `12345678`
- Name: `Om Rajpal`

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

Required packages:
- `mongoose` - MongoDB ODM
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT authentication
- `mongodb` - MongoDB driver

### 2. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/finance-tracker

# OR for MongoDB Atlas
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/finance-tracker

# JWT Secret (generate with: npm run generate:secret)
JWT_SECRET=your-generated-secret-key-here

# Google Sheets (for transaction sync)
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id
GOOGLE_CLIENT_EMAIL=your_service_account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 3. Start MongoDB

**Local MongoDB:**
```bash
# Install MongoDB (if not already installed)
# On Windows: Download from https://www.mongodb.com/try/download/community
# On Mac: brew install mongodb-community
# On Linux: sudo apt-get install mongodb

# Start MongoDB service
mongod
```

**OR use MongoDB Atlas:**
1. Create account at https://www.mongodb.com/cloud/atlas
2. Create a cluster
3. Get connection string
4. Add to `.env.local` as `MONGODB_URI`

### 4. Seed the Default User

Run the seed script to create the hardcoded user:

```bash
npm run seed:user
```

**Output:**
```
🔌 Connecting to MongoDB...
✅ Connected to MongoDB
➕ Creating default user...
✅ Default user created successfully

📋 User Details:
   Email: omrajpal@finance.app
   Password: 12345678
   Name: Om Rajpal

✅ Disconnected from MongoDB
```

If the user already exists, it will update the password.

### 5. Start the Application

```bash
npm run dev
```

Open http://localhost:3000 and login with:
- Email: `omrajpal@finance.app`
- Password: `12345678`

## Architecture

### Data Storage

**MongoDB** (Primary for Auth & Investments):
- User authentication
- Investment data (SIPs, Stocks, Mutual Funds)
- Portfolio tracking
- Login sessions

**Google Sheets** (Primary for Transactions):
- Transaction data (income/expenses)
- Source of truth for financial transactions
- Synced to MongoDB as backup

### Authentication Flow

1. **Login Request** → `/api/auth/login`
   - User enters email and password
   - Server validates against MongoDB User collection
   - If valid, JWT token is generated
   - Token stored in HTTP-only cookie

2. **Protected Routes**
   - Token verified via middleware
   - User data extracted from JWT
   - Access granted/denied

3. **Logout** → `/api/auth/logout`
   - Cookie cleared
   - User redirected to login

### Security Features

- ✅ Password hashing with bcrypt (10 rounds)
- ✅ HTTP-only cookies (prevent XSS)
- ✅ JWT with 7-day expiration
- ✅ Server-side token verification
- ✅ Secure cookie in production
- ✅ Single user system (no registration endpoint)

## API Endpoints

### POST /api/auth/login

**Request:**
```json
{
  "email": "omrajpal@finance.app",
  "password": "12345678"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Authentication successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Om Rajpal",
    "email": "omrajpal@finance.app"
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

### POST /api/auth/logout

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### GET /api/auth/me

**Response (Authenticated):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Om Rajpal",
      "email": "omrajpal@finance.app",
      "createdAt": "2026-01-26T10:00:00.000Z"
    }
  }
}
```

**Response (Not Authenticated):**
```json
{
  "error": "Not authenticated"
}
```

## Database Schema

### User Collection

```typescript
{
  _id: ObjectId,
  name: String (required),
  email: String (required, unique, lowercase),
  password: String (required, hashed),
  createdAt: Date (default: now),
  lastLogin: Date
}
```

**Indexes:**
- `email` (unique)

## Changing the Password

To change the default password:

1. Update the password in `scripts/seed-user.ts` (line 40):
```typescript
const hashedPassword = await bcrypt.hash('your-new-password', 10);
```

2. Re-run the seed script:
```bash
npm run seed:user
```

The script will update the existing user with the new password.

## Troubleshooting

### "Cannot connect to MongoDB"

**Solution:**
1. Check MongoDB is running: `mongod`
2. Verify `MONGODB_URI` in `.env.local`
3. Check network connectivity (for Atlas)

### "Invalid credentials" on login

**Solution:**
1. Run seed script again: `npm run seed:user`
2. Check you're using correct email/password
3. Verify MongoDB has the user: `mongo finance-tracker` → `db.users.find()`

### "JWT_SECRET is required"

**Solution:**
1. Generate secret: `npm run generate:secret`
2. Add to `.env.local`: `JWT_SECRET=generated-secret`

### "User already exists" error during seed

**Not an error!** The script detects existing user and updates the password instead.

## Production Deployment

### Environment Variables (Production)

```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/finance-tracker
JWT_SECRET=use-strong-random-secret-here
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Security Checklist

- [ ] Use strong JWT_SECRET (32+ random characters)
- [ ] Use MongoDB Atlas with IP whitelist
- [ ] Enable HTTPS (secure cookies)
- [ ] Change default password from `12345678`
- [ ] Backup MongoDB regularly
- [ ] Monitor login attempts
- [ ] Keep dependencies updated

### Deployment Steps

1. Set environment variables in hosting platform
2. Run seed script on production database:
   ```bash
   npm run seed:user
   ```
3. Deploy application
4. Test login functionality
5. Verify data sync works

## Data Sync Strategy

### Transaction Flow

```
Google Sheets (Source of Truth)
        ↓
   Sync API Call
        ↓
MongoDB (Backup + Query)
        ↓
   UI Display
```

**When to use MongoDB:**
- Authentication
- Investments (SIPs, Stocks, MF)
- Analytics caching
- Backup storage

**When to use Sheets:**
- Add/Edit/Delete transactions
- Primary transaction storage
- Manual data entry

## Support

For issues or questions:
1. Check MongoDB connection: `npm run test:mongodb`
2. Verify environment variables
3. Review server logs
4. Re-run seed script

---

**Last Updated:** 2026-01-26
**Version:** 1.0.0
**Author:** Om Rajpal
