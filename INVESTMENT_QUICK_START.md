# Investment Tracking - Quick Start Guide

## Accessing the System

Navigate to: `/investments`

The page is accessible from the sidebar menu (Investments icon).

## Adding Your First SIP

1. Click the **"Add SIP"** button in the SIPs tab
2. Fill in the form:
   ```
   Name: Axis Bluechip Fund
   Type: Mutual Fund
   Provider: Groww
   Monthly Amount: 5000
   Day of Month: 1
   Start Date: 2023-01-01
   Current Value: (optional) 72000
   Folio Number: (optional) 12345678
   Auto-debit: ✓ Checked
   ```
3. Click **"Add SIP"**
4. Your SIP will appear in the table with calculated returns

## Adding Your First Stock

1. Switch to the **"Stocks"** tab
2. Click **"Add Stock"** button
3. Fill in the form:
   ```
   Symbol: RELIANCE (auto-uppercased)
   Exchange: NSE
   Company Name: Reliance Industries Ltd
   Quantity: 10
   Average Purchase Price: 2500
   Current Price: (optional) 2750
   Purchase Date: 2024-01-15
   Charges: 50
   Broker: Zerodha
   ```
4. Click **"Add Stock"**
5. Returns are calculated automatically

## Understanding the Portfolio Summary

### Total Portfolio Value
Your complete investment worth across all SIPs, stocks, and mutual funds.

### Total Returns
- **Green**: You're making profit
- **Red**: Currently at a loss
- Shows both absolute (₹) and percentage (%)

### Best/Worst Performers
Automatically identifies which investments are doing well or poorly.

### Asset Allocation Chart
Visual breakdown showing how your money is distributed:
- Blue: SIPs
- Green: Stocks
- Orange: Mutual Funds

## Editing Investments

### Update SIP
1. Click the **Edit** icon (pencil) next to the SIP
2. Modify any field
3. Click **"Update SIP"**
4. Returns recalculate automatically

### Update Current Value
To track your SIP's current value:
1. Click Edit on the SIP
2. Enter the **Current Value** field
3. Save
4. Returns will update automatically

### Pause/Resume SIP
Click the **Pause** icon to temporarily stop a SIP (changes status to "paused").
Click the **Play** icon to resume it.

## Deleting Investments

Click the **Delete** icon (trash) and confirm.
**Warning**: This action cannot be undone.

## Understanding Returns

### For SIPs
```
Total Invested = Monthly Amount × Number of Months
Returns = Current Value - Total Invested
Returns % = (Returns / Total Invested) × 100
```

Example:
- Monthly: ₹5,000
- Started: Jan 2023 (12 months ago)
- Total Invested: ₹60,000
- Current Value: ₹72,000
- Returns: ₹12,000 (+20%)

### For Stocks
```
Total Invested = (Quantity × Avg Price) + Charges
Current Value = Quantity × Current Price
Returns = Current Value - Total Invested
```

Example:
- Bought: 10 shares @ ₹2,500
- Charges: ₹50
- Total Invested: ₹25,050
- Current Price: ₹2,750
- Current Value: ₹27,500
- Returns: ₹2,450 (+9.78%)

## Refreshing Data

Click the **Refresh** button at the top to reload:
- Portfolio summary
- All SIPs
- All stocks
- All mutual funds

## Color Codes

- **Green**: Positive returns (profit)
- **Red**: Negative returns (loss)
- **Blue**: Active status
- **Gray**: Paused/inactive status

## Tips

### 1. Update Current Values Regularly
For accurate returns, update the current value of SIPs weekly/monthly from your broker's app.

### 2. Track All Charges
Include brokerage, taxes, and fees in the "Charges" field for accurate returns calculation.

### 3. Use Notes
Add notes to remember why you bought a stock or any special conditions about a SIP.

### 4. Folio Numbers
Keep track of folio numbers for easy reference when contacting AMCs or checking statements.

### 5. Day of Month
Set SIP day to match your salary date for better cash flow management.

## Common Actions

### Check Total Portfolio Value
Look at the first card in the Portfolio Summary section.

### See Best Investment
Check the "Best Performer" card - shows which investment has the highest returns %.

### Find How Much You've Invested
Look at "Total Invested" under the Portfolio Value card.

### Calculate Monthly SIP Total
Sum of all active SIP monthly amounts = your monthly investment commitment.

### View Returns by Type
Check the Asset Allocation chart to see which category (SIPs/Stocks/MF) has more value.

## Example Workflow

### Monthly Routine
1. **Update SIP Values**:
   - Check your Groww/Zerodha app
   - Edit each SIP
   - Update current value
   - Save

2. **Update Stock Prices**:
   - Check NSE/BSE prices
   - Edit each stock
   - Update current price
   - Save

3. **Review Performance**:
   - Check portfolio summary
   - Note best/worst performers
   - Decide if rebalancing needed

4. **Add New Investments**:
   - If you started a new SIP, click "Add SIP"
   - If you bought stocks, click "Add Stock"

### Quarterly Review
1. Check total returns %
2. Compare against benchmark
3. Identify underperformers
4. Plan rebalancing if needed
5. Update investment strategy

## Keyboard Shortcuts
(Coming soon in future updates)

## Mobile Usage
The interface is fully responsive and works on:
- Desktop (recommended)
- Tablets
- Mobile phones

## Data Safety
Currently uses in-memory storage (resets on server restart).
**Production version** will use MongoDB for permanent storage.

## Need Help?

### Common Issues

**Q: My returns show 0% even though I have current value**
A: Make sure you've entered the current value in the edit dialog and saved it.

**Q: Total invested seems wrong for SIP**
A: It's auto-calculated based on start date. Check if start date is correct.

**Q: Can I track mutual funds separately?**
A: Yes, use the Mutual Funds tab. SIP tab is for systematic investments.

**Q: How often should I update current values?**
A: Weekly or monthly is recommended for accurate tracking.

**Q: Can I link SIP transactions to regular transactions?**
A: This feature is coming in a future update.

## What's Next?

Planned features:
- Real-time price updates from NSE/BSE
- Auto-import from broker statements
- XIRR calculations for irregular investments
- Historical performance charts
- Goal-based investment tracking
- Tax harvesting suggestions
- Dividend tracking
- Export to Excel/PDF

## API Usage (For Developers)

### Get Portfolio
```bash
GET /api/investments/portfolio
```

### List SIPs
```bash
GET /api/investments/sips
```

### Create SIP
```bash
POST /api/investments/sips
Content-Type: application/json

{
  "name": "Fund Name",
  "type": "Mutual Fund",
  "provider": "Groww",
  "monthlyAmount": 5000,
  "dayOfMonth": 1,
  "startDate": "2023-01-01",
  "autoDebit": true
}
```

See `INVESTMENT_TRACKING_GUIDE.md` for complete API documentation.

## Support

For issues or feature requests:
1. Check the documentation
2. Review the examples
3. Contact support

---

**Happy Investing!** 🚀📈
