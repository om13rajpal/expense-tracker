# Features

## Dashboard
The main dashboard displays a financial overview with:
- Monthly income vs expenses with savings rate
- Partial month indicator (shows coverage days for current month)
- Top expense categories with percentage breakdown
- Recent transactions list
- Quick-add transaction button
- AI-generated insight cards

## Transaction Management
- **Auto-Sync**: Transactions pulled from Google Sheets with smart categorization
- **200+ Merchant Rules**: Built-in categorization for Indian merchants (Swiggy, Zomato, Amazon, Flipkart, etc.)
- **Manual Overrides**: Override auto-categorization; preserved across syncs
- **Recategorize**: Bulk re-apply rules to all transactions
- **Filters**: By month, category, type (debit/credit), search text
- **Pagination**: Server-side with configurable page size
- **Recurring Detection**: Automatically identifies EMIs, subscriptions, regular transfers

## Budget Tracking
- **Per-Category Budgets**: Set monthly limits for each spending category
- **Rollover**: Unspent budget can roll over to next month
- **AI Suggestions**: Get budget recommendations based on 3-month spending average
- **Budget History**: View past months' budget vs actual spending
- **Breach Notifications**: Automatic alerts when spending hits 80% or 100% of budget

## Analytics
- **Monthly Trends**: Income, expenses, and savings rate over time
- **Category Breakdown**: Pie chart with percentage and absolute amounts
- **Weekly View**: Day-by-day spending with category drilldown
- **Spending Comparison**: Month-over-month comparison by category
- **Top Merchants**: Most frequent and highest-spending merchants
- **One-Time Purchase Detection**: Flags unusually large expenses
- **Outlier Detection**: Identifies transactions exceeding 3x daily average

## Investment Portfolio
- **Stocks**: Holdings with average cost, live quotes, P&L, returns
- **Mutual Funds**: NAV tracking, invested vs current value, XIRR returns
- **SIPs**: Track systematic investment plans with monthly amounts
- **Groww Integration**: Identify Groww-related bank transactions
- **XIRR Calculator**: Annualized returns via Newton-Raphson method
- **CAGR Fallback**: Simple compounded annual growth rate when XIRR fails

## Financial Health Score
Composite 0-100 score calculated from:
- **Savings Rate**: Percentage of income saved monthly
- **Emergency Fund Ratio**: Months of expenses covered by savings
- **Expense Velocity**: Rate of spending acceleration/deceleration
- **Debt-to-Income Ratio**: Monthly debt payments vs income
- **Net Worth Timeline**: Historical net worth progression

## AI-Powered Insights
Six types of AI analysis, each cached for 24 hours:
1. **Spending Analysis**: Pattern detection, anomaly flagging, actionable suggestions
2. **Monthly Budget**: Month-over-month budget performance and trends
3. **Weekly Budget**: Current week spending breakdown and projections
4. **Investment Insights**: Portfolio analysis with market context from web search
5. **Tax Optimization**: Tax-saving strategies under Indian tax regime
6. **Planner Recommendation**: Goal-based financial planning advice

## AI Chat Agent
- Full-context conversational financial advisor
- Streaming responses for real-time interaction
- Persistent conversation threads
- Access to complete financial data (transactions, investments, goals, budgets)
- Powered by Claude Sonnet 4.5 via OpenRouter

## Tax Calculator
- Support for Indian Old and New tax regimes
- Section 80C deductions (PPF, ELSS, LIC, etc.)
- Section 80D (health insurance)
- HRA exemption calculation
- Standard deduction
- AI-powered tax optimization tips

## Learning Center
- AI-generated financial education lessons personalized to user's data
- Topics: budgeting, investing, tax planning, insurance, retirement
- Interactive quizzes with scoring
- Progress tracking across lessons
- Content cached for 7 days

## Subscriptions
- Track recurring subscriptions (Netflix, Spotify, gym, etc.)
- Monthly and annual billing cycle support
- Cost tracking with category tagging
- Renewal alerts 3 days before due date

## Debt Management
- Track loans (home, car, personal, education)
- EMI amounts and remaining tenure
- Interest rate tracking
- Integration with financial health score

## Savings Goals
- Create goals with target amounts and dates
- Auto-linked contributions from transactions
- Progress visualization with percentage completion
- Multiple concurrent goals

## Notifications
- **Budget Breach**: Warning at 80%, critical at 100% of budget
- **Renewal Alerts**: 3-day advance notice for subscriptions
- **Weekly Digest**: Sunday summary of spending, savings, portfolio
- **In-app**: Notification center with read/unread management

## Command Palette
- Cmd+K (or Ctrl+K) for quick access
- Navigate to any page
- Search transactions
- Quick actions (sync, add transaction)

## Reports
- CSV export of transactions
- Date range filtering
- Category and type filters
- Downloadable via browser
