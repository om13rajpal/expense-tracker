# Investment Tracking System

Complete investment portfolio management system for tracking SIPs, stocks, and mutual funds.

## Features

### 1. Portfolio Summary Dashboard
- **Total Portfolio Value**: Combined value of all investments
- **Total Returns**: Absolute and percentage returns
- **Asset Allocation**: Visual breakdown by investment type (SIPs, Stocks, Mutual Funds)
- **Performance Tracking**: Best and worst performing investments
- **Daily Changes**: Real-time market movements

### 2. SIP Management
Track systematic investment plans with:
- Monthly investment amount
- Auto-debit status
- Investment provider (Groww, Zerodha, etc.)
- Current value and returns
- Start date and investment day
- Folio numbers

**Supported SIP Types:**
- Mutual Funds
- NPS (National Pension System)
- PPF (Public Provident Fund)
- Stock SIPs
- Other recurring investments

### 3. Stock Portfolio
Manage equity holdings with:
- Symbol and exchange (NSE/BSE)
- Quantity and average purchase price
- Current market price
- Total returns (absolute and percentage)
- Day change tracking
- Broker information
- Purchase date and charges

### 4. Mutual Fund Tracking
Monitor mutual fund investments:
- Fund name and code
- Units and NAV (Net Asset Value)
- Returns calculation
- Link to SIP investments
- Folio numbers

## File Structure

```
app/
├── investments/
│   └── page.tsx                    # Main investments page
├── api/
│   └── investments/
│       ├── portfolio/
│       │   └── route.ts           # Portfolio summary API
│       ├── sips/
│       │   ├── route.ts           # SIP list and create
│       │   └── [id]/route.ts      # SIP update and delete
│       └── stocks/
│           ├── route.ts           # Stock list and create
│           └── [id]/route.ts      # Stock update and delete

components/
├── portfolio-summary.tsx           # Portfolio summary cards
├── sip-list.tsx                   # SIP table and actions
├── add-sip-dialog.tsx             # SIP creation/edit form
├── stocks-list.tsx                # Stock holdings table
└── add-stock-dialog.tsx           # Stock creation/edit form

lib/
├── types.ts                       # Investment type definitions
├── investment-utils.ts            # Calculation utilities
└── investment-storage.ts          # In-memory storage
```

## API Endpoints

### Portfolio
```typescript
GET /api/investments/portfolio
// Returns complete portfolio summary
{
  totalValue: number
  totalInvested: number
  totalReturns: number
  returnsPercentage: number
  assetAllocation: { sips, stocks, mutualFunds }
  bestPerformer: { name, type, returns, returnsPercentage }
  worstPerformer: { name, type, returns, returnsPercentage }
  dayChange: number
  dayChangePercentage: number
}
```

### SIPs
```typescript
// List all SIPs
GET /api/investments/sips
Returns: { success: boolean, data: SIP[], count: number }

// Create SIP
POST /api/investments/sips
Body: {
  name: string
  type: InvestmentType
  provider: SIPProvider
  monthlyAmount: number
  startDate: Date
  dayOfMonth: number (1-31)
  autoDebit: boolean
  currentValue?: number
  folioNumber?: string
  notes?: string
}

// Update SIP
PUT /api/investments/sips/[id]
Body: Partial<SIP>

// Delete SIP
DELETE /api/investments/sips/[id]
```

### Stocks
```typescript
// List all stocks
GET /api/investments/stocks
Returns: { success: boolean, data: Stock[], count: number }

// Add stock
POST /api/investments/stocks
Body: {
  symbol: string
  exchange: Exchange (NSE/BSE)
  companyName: string
  quantity: number
  averagePrice: number
  currentPrice?: number
  purchaseDate: Date
  charges: number
  broker?: string
  notes?: string
}

// Update stock
PUT /api/investments/stocks/[id]
Body: Partial<Stock>

// Delete stock
DELETE /api/investments/stocks/[id]
```

## Key Calculations

### 1. SIP Total Invested
```typescript
// Calculates total invested based on start date
totalInvested = monthlyAmount × numberOfMonths
numberOfMonths = months from startDate to today
```

### 2. Returns Calculation
```typescript
returns = currentValue - totalInvested
returnsPercentage = (returns / totalInvested) × 100
```

### 3. Stock Valuation
```typescript
totalInvested = (quantity × averagePrice) + charges
currentValue = quantity × currentPrice
returns = currentValue - totalInvested
```

### 4. XIRR (Extended Internal Rate of Return)
```typescript
// For SIPs with irregular investments
// Uses Newton-Raphson method
xirr = calculateXIRR(cashFlows, currentValue)
```

### 5. Portfolio Summary
```typescript
totalValue = sum of all investment current values
totalInvested = sum of all amounts invested
totalReturns = totalValue - totalInvested
returnsPercentage = (totalReturns / totalInvested) × 100
```

## Component Usage

### Portfolio Summary
```tsx
import { PortfolioSummaryCard } from '@/components/portfolio-summary';

<PortfolioSummaryCard summary={portfolioData} />
```

### SIP Management
```tsx
import { SIPList } from '@/components/sip-list';

<SIPList sips={sipsData} onRefresh={fetchData} />
```

### Stock Management
```tsx
import { StocksList } from '@/components/stocks-list';

<StocksList stocks={stocksData} onRefresh={fetchData} />
```

## Utility Functions

### Format Currency
```typescript
import { formatCurrency } from '@/lib/investment-utils';
formatCurrency(25000) // "₹25,000"
```

### Format Percentage
```typescript
import { formatPercentage } from '@/lib/investment-utils';
formatPercentage(15.5) // "+15.50%"
formatPercentage(-5.2) // "-5.20%"
```

### Calculate XIRR
```typescript
import { calculateXIRR } from '@/lib/investment-utils';

const cashFlows = [
  { date: new Date('2023-01-01'), amount: -5000 },
  { date: new Date('2023-02-01'), amount: -5000 },
  { date: new Date('2023-03-01'), amount: -5000 },
];
const currentValue = 16000;
const xirr = calculateXIRR(cashFlows, currentValue);
// Returns annualized return percentage
```

### Validate Investment Data
```typescript
import { validateSIPData, validateStockData } from '@/lib/investment-utils';

const validation = validateSIPData(formData);
if (!validation.valid) {
  console.log(validation.errors);
}
```

### Auto-detect SIPs from Transactions
```typescript
import { detectSIPsFromTransactions } from '@/lib/investment-utils';

const suggestions = detectSIPsFromTransactions(transactions);
// Returns potential SIP patterns found in transactions
```

## Future Enhancements

### 1. Real-time Price Updates
- Integrate with stock market APIs (NSE, BSE)
- Auto-update current prices
- Show live portfolio value

### 2. Advanced Analytics
- Historical performance charts
- Sector-wise allocation
- Risk analysis
- Tax harvesting suggestions

### 3. Transaction History
- Buy/sell tracking
- Dividend receipts
- Capital gains calculation
- Transaction ledger

### 4. Goal-based Investing
- Link investments to financial goals
- Track goal progress
- Rebalancing suggestions

### 5. Reports & Exports
- PDF portfolio statements
- Excel exports
- Tax reports
- Capital gains statements

### 6. Alerts & Notifications
- Price alerts
- SIP due reminders
- Performance alerts
- Goal milestone notifications

### 7. Integration Features
- Import from broker statements
- Sync with Demat accounts
- Auto-detect from bank statements
- API integrations (Groww, Zerodha)

## Production Deployment

### Database Migration
Replace in-memory storage with MongoDB:

```typescript
// lib/db/investment-models.ts
import mongoose from 'mongoose';

const SIPSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  name: String,
  type: String,
  provider: String,
  monthlyAmount: Number,
  startDate: Date,
  dayOfMonth: Number,
  autoDebit: Boolean,
  currentValue: Number,
  totalInvested: Number,
  status: String,
  // ... other fields
});

export const SIPModel = mongoose.model('SIP', SIPSchema);
```

### Authentication
Add user-specific investment tracking:

```typescript
// Get userId from session
const session = await getServerSession(authOptions);
const userId = session.user.id;

// Filter by user
const userSips = await SIPModel.find({ userId });
```

### Caching
Implement caching for portfolio calculations:

```typescript
import { unstable_cache } from 'next/cache';

const getPortfolio = unstable_cache(
  async (userId) => {
    // Calculate portfolio
  },
  ['portfolio'],
  { revalidate: 300 } // 5 minutes
);
```

## Testing

### Unit Tests
```typescript
import { calculateReturns, calculateXIRR } from '@/lib/investment-utils';

describe('Investment Calculations', () => {
  it('should calculate returns correctly', () => {
    const result = calculateReturns(10000, 12000);
    expect(result.returns).toBe(2000);
    expect(result.percentage).toBe(20);
  });
});
```

### API Tests
```typescript
import { POST } from '@/app/api/investments/sips/route';

describe('SIP API', () => {
  it('should create SIP', async () => {
    const request = new Request('http://localhost/api/investments/sips', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test SIP',
        monthlyAmount: 5000,
        // ... other fields
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
  });
});
```

## Security Considerations

1. **User Isolation**: Always filter investments by userId
2. **Input Validation**: Validate all user inputs
3. **Rate Limiting**: Prevent API abuse
4. **Data Encryption**: Encrypt sensitive financial data
5. **Audit Logging**: Track all investment modifications

## Performance Optimization

1. **Lazy Loading**: Load investments on demand
2. **Pagination**: For large portfolios
3. **Memoization**: Cache expensive calculations
4. **Index Optimization**: Database indexes on userId, date
5. **Batch Operations**: Update multiple investments efficiently

## Support

For issues or feature requests, please refer to the main project documentation.
