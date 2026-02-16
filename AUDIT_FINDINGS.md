# Finance Tracker - Page-by-Page Audit Findings

## Audit Date: 2026-02-15
## Data Source: 204 transactions from Google Sheets (Jan 1 - Feb 14, 2026)
## Raw data saved: raw-sheets-data.csv

---

## 1. Dashboard (/dashboard)

### Working Features
- [x] Current Balance: Rs 69,881 (CORRECT - fixed via sequence sort)
- [x] Monthly Flow: Opening Rs 1,53,497 + Income Rs 35,442 - Expenses Rs 1,19,057 = Rs 69,882 (rounds correctly)
- [x] Balance Runway chart renders
- [x] Daily Spending chart renders
- [x] Monthly Cashflow bar chart renders
- [x] Category pie chart renders
- [x] Payment method breakdown (UPI dominant, 67 total txns)
- [x] AI Insights widget present ("Click Generate")

### Issues Found
- [ ] **DATE OFF BY 1 DAY**: Feb 14 transactions display as "13 Feb" (UTC/IST timezone conversion)
- [ ] **93% Uncategorized**: Most expenses lack proper categories
- [ ] **N/W/I Split skewed**: 98% Wants because uncategorized defaults to Wants
- [ ] **Emergency Fund 0.0 months**: Should be ~0.6 months (Rs 69,881 / Rs 1,19,057)
- [ ] **Overspend Rate**: Display capped at 100% when actual is ~236%

---

## 2. Transactions (/transactions)

### Working Features
- [x] Summary cards: Income Rs 4,76,739 / Expenses Rs 4,73,158 / Net Rs 3,581 - math correct
- [x] Daily Net Movement chart: renders, updates with filters, last 14 days shown
- [x] Search: works (tested "swiggy" - filtered correctly, totals updated to Rs 4,670)
- [x] Filter buttons: All/Income/Expense all work, totals and chart update dynamically
- [x] Inline category edit: click badge -> dropdown with all categories + save/cancel buttons
- [x] NWI badge: displays N/W/I classification, clickable to cycle override
- [x] Bulk selection: checkboxes on each row + select-all header checkbox
- [x] Pagination: "204 total", "Page 1 of 11" with 20 rows/page, row count selector (10/20/30/50)
- [x] Rules dialog: opens correctly, shows Add Rule form (pattern, match field, category, case sensitive)
- [x] Rules CRUD: create/delete/toggle-enable all wired up to /api/categorization-rules
- [x] Category list: 29 categories available for assignment
- [x] Merchant extraction: shows extracted merchant under description (e.g., "Swiggy | Ltd")

### Issues Found
- [ ] **SUMMARY SHOWS ALL-TIME, NOT MONTHLY**: Income/Expenses/Net cards show totals across ALL transactions (Jan-Feb), not current month. User specifically requested monthly focus.
- [ ] **DATE OFF BY 1 DAY**: Same as dashboard. Feb 14 -> "13 Feb 2026", Feb 13 -> "12 Feb 2026" etc.
- [ ] **CHART X-AXIS OFF BY 1 DAY**: Daily Net Movement ends at "Feb 13" instead of "Feb 14"
- [ ] **"Add Transaction" BUTTON NON-FUNCTIONAL**: The "+ Add Transaction" button has no onClick handler - it does nothing when clicked.
- [ ] **NWI BADGE ON INCOME TRANSACTIONS**: Income transactions show "W" (Wants) badge which is semantically wrong - NWI classification is for expenses only.
- [ ] **93% Uncategorized**: Most transactions still lack proper categories (same root cause as dashboard)

---

## 3. Analytics (/analytics)

### Working Features
- [x] Top metrics: Account Balance Rs 69,881, Monthly Income Rs 35,442, Monthly Expenses Rs 1,19,057 - all correct
- [x] Month selector: "February 2026" with < > navigation
- [x] Large expense detection: "1 transaction above Rs 50,000 totalling Rs 84,910 (71.3% of all expenses)"
- [x] "Show recurring only" button present
- [x] **Snapshot tab**: Monthly Summary with Opening/Closing/Net Change/Growth Rate, Balance Trend chart, Payment Methods bar chart
- [x] **Daily tab**: Daily Cashflow area chart (income green, expenses red overlay)
- [x] **Weekly tab**: Week Reference (Opening/Inflow/Outflow/Closing), Week 7 math: 78,729 + 921 - 9,769 = 69,881 correct
- [x] **Monthly tab**: Monthly Trends multi-month comparison + Expenses by Category pie chart
- [x] **Yearly tab**: present (not tested in detail)
- [x] **Data Audit tab**: Data Coverage (204 txns, Jan 1 - Feb 14), Amount Statistics (Income 40 rows / Expenses 164 rows), Balance Statistics, Top Merchants by Count/Spend/Income
- [x] Snapshot values: Opening Rs 1,53,496.56, Closing Rs 69,881.34, Net Change -Rs 83,615.22, Growth -54.47% - all math verified
- [x] "Partial Month" indicator shown for current month

### Issues Found
- [ ] **OVERSPEND RATE CAPPED AT 100%**: Shows "Overspent by 100.0%" everywhere, but actual is ~236% (119,057/35,442)
- [ ] **BALANCE TREND DUPLICATE X-AXIS LABELS**: Chart shows "Feb 7" twice, missing some dates (date off-by-1 causing label collisions)
- [ ] **DATE OFF BY 1 DAY**: Same timezone issue affects Daily Cashflow chart x-axis (ends Feb 13 not Feb 14)

---

## 4. Budget (/budget)

### Working Features
- [x] Header: "Budget Studio" with "February 2026 (15 of 28 days)" - correct date context
- [x] Metric tiles: Total Spent Rs 1,16,707 (+215.7%), Budget Remaining Rs 0, Projected Spend Rs 2,17,853 (+215.7%), Categories Over 1/10
- [x] NWI Split sliders: Needs 50% (8 categories), Wants 30% (8 categories), Investments 20% (4 categories), Total 100%
- [x] "Save Split" button for NWI config persistence
- [x] Overall Usage progress bar: 316% (Rs 1,16,707 of Rs 36,964 pro-rated) - correctly shows overspend
- [x] Budget vs Spending bar chart: all 10 categories rendered, "Others" shows massive red bar
- [x] Attention Needed panel: Others 4146%, Food & Dining 56%, Shopping 14%, Bills & Utilities 9%, Travel 0%
- [x] Category Breakdown table with columns: Category, Monthly Budget, Pro-rated, Spent, Projected, Remaining, Usage
- [x] Pro-rated math correct: Rs 69,000 x 15/28 = Rs 36,964
- [x] Category edit (pencil icon): opens inline number input with save/cancel - works
- [x] Category rename (pencil-text icon): present on each row
- [x] Category delete (trash icon): present on each row
- [x] "+ Add Category" button present
- [x] Total row: Monthly Budget Rs 69,000, Pro-rated Rs 36,964, Spent Rs 1,16,707, Projected Rs 2,17,853, Usage 316%
- [x] 10 default categories: Food & Dining, Transport, Shopping, Bills & Utilities, Entertainment, Healthcare, Education, Fitness, Travel, Others

### Category Breakdown Data (Feb 2026)
| Category | Monthly Budget | Pro-rated | Spent | Projected | Usage |
|---|---|---|---|---|---|
| Food & Dining | Rs 15,000 | Rs 8,036 | Rs 4,489 | Rs 8,380 | 56% |
| Transport | Rs 5,000 | Rs 2,679 | Rs 0 | Rs 0 | 0% |
| Shopping | Rs 10,000 | Rs 5,357 | Rs 760 | Rs 1,419 | 14% |
| Bills & Utilities | Rs 8,000 | Rs 4,286 | Rs 399 | Rs 745 | 9% |
| Entertainment | Rs 5,000 | Rs 2,679 | Rs 0 | Rs 0 | 0% |
| Healthcare | Rs 3,000 | Rs 1,607 | Rs 0 | Rs 0 | 0% |
| Education | Rs 5,000 | Rs 2,679 | Rs 0 | Rs 0 | 0% |
| Fitness | Rs 3,000 | Rs 1,607 | Rs 0 | Rs 0 | 0% |
| Travel | Rs 10,000 | Rs 5,357 | Rs 10 | Rs 19 | 0% |
| Others | Rs 5,000 | Rs 2,679 | Rs 1,11,049 | Rs 2,07,292 | 4146% |

### Issues Found
- [ ] **"OTHERS" AT 4146%**: Rs 1,11,049 of Rs 1,16,707 total spend falls into "Others" because 93% of transactions are uncategorized. Root cause: no categorization rules set up yet.
- [ ] **MOST CATEGORIES SHOW Rs 0 SPENT**: Transport, Entertainment, Healthcare, Education, Fitness all show Rs 0 - these likely have real spending hidden in "Others" due to uncategorized transactions.
- [ ] **BUDGET REMAINING ALWAYS Rs 0**: The "Budget Remaining" metric tile shows Rs 0 instead of a negative value when overspent. Should show -Rs 79,743 (Rs 36,964 - Rs 1,16,707) or similar.
- [ ] **NWI CATEGORY COUNTS SEEM HIGH**: "Needs 8 categories, Wants 8 categories, Investments 4 categories" - with only 10 budget categories, these counts sum to 20, meaning categories appear in multiple NWI groups (expected? or double-counting bug)

---

## 5. Investments (/investments)

### Working Features
- [x] Header: "Investments - Portfolio tracker with live quotes"
- [x] Metric tiles: Total Portfolio Rs 0 (+0.00%), Stocks Rs 0, Mutual Funds Rs 0, Monthly SIP Rs 0 (0 active of 0), Realized P&L +Rs 0
- [x] Sub-metrics: Invested Rs 0, Day Change +Rs 0, XIRR N/A
- [x] **Stocks tab**: "+ Add Stock" form (Symbol, Exchange NSE dropdown, Shares, Avg Cost, Exp. Return %), "Import Holdings CSV", "Replace existing on import" checkbox, "Refresh" button
- [x] Add Stock form: pre-fills "RELIANCE" as symbol, NSE exchange - form renders correctly
- [x] **Stock Orders tab**: "Import Order History CSV" button, "Replace existing on import" checkbox, empty state message
- [x] **Mutual Funds tab**: "Import Holdings CSV", "Import Order History" buttons, two replace checkboxes (holdings + transactions), summary tiles (Invested, Current Value, Returns), empty state
- [x] **SIPs tab**: "+ Add SIP", "Import from MF Order History", "Replace existing on import" checkbox, auto-detection explanation text, summary tiles (Monthly Outflow, Yearly Outflow, Active SIPs), empty state
- [x] All 4 tabs render correctly with appropriate empty states
- [x] Groww CSV import integration across all tabs

### Issues Found
- [ ] **NO DATA TO TEST**: All investment features are empty (DB was dropped). Cannot verify live quote fetching, XIRR calculation, P&L computation, or chart rendering without actual data.
- [ ] **ADD STOCK FORM DEFAULT**: Pre-fills "RELIANCE" as default symbol - minor UX issue, should probably be empty placeholder

---

## 6. Financial Health (/financial-health)

### Working Features
- [x] Header: "Financial Health - Deep dive into your financial wellness metrics"
- [x] Freedom Score gauge: 27/100 "Needs Work" - renders correctly with orange arc
- [x] Score Breakdown: Savings Rate 10.0/25, Emergency Fund 0.0/25, NWI Adherence 17.0/25, Investment Rate 0.0/25 (sum = 27, correct)
- [x] Metric tiles: Emergency Fund 0.3 months (-95.1%, Target 6 months), Monthly Income Rs 2,38,370 (-85.0%, Variable), Expense Trend -66.4% (vs previous period), Income Stability 15% (-35.0%, Variable)
- [x] Emergency Fund Progress bar: 0.3 months of 6 target = 5% - correct
- [x] Expense Velocity: Current Avg Rs 1,19,057 vs Previous Avg Rs 3,54,101 = -66.4% "Expenses Falling" - math verified
- [x] Income Profile: Avg Monthly Income Rs 2,38,370, Income Stability 15%, Income Type "Variable", Last Income "13 Feb 2026"
- [x] Net Worth Timeline chart: declining line from ~Rs 1.6L (Jan) to ~Rs 70k (Feb) - visually correct
- [x] Emergency Fund math: Rs 69,881 / avg monthly expenses (~Rs 2,36,579) = 0.30 months - verified
- [x] Avg Monthly Income: (Jan Rs 4,41,297 + Feb Rs 35,442) / 2 = Rs 2,38,370 - verified

### Issues Found
- [ ] **DATE OFF BY 1 DAY**: "Last Income: 13 Feb 2026" should be 14 Feb 2026 (same UTC/IST timezone bug)
- [ ] **MONTHLY INCOME MISLEADING**: Shows Rs 2,38,370 (all-time average) which is dominated by Jan's large income. Feb income is only Rs 35,442. Should show current month or clearly label as "average".
- [ ] **EMERGENCY FUND 0.0/25 SCORE**: Despite having 0.3 months coverage, the score component gives 0.0/25 - seems like the scoring threshold may require at least 1 month to get any points
- [ ] **INVESTMENT RATE 0.0/25**: Expected since no investment data exists (DB dropped), but will need re-verification after investment data is added

---

## 7. Goals (/goals)

### Working Features
- [x] Header: "Goals & Projections - Track savings goals and visualize your financial future"
- [x] Metric tiles: Total Saved Rs 0 (0 active goals), Total Target Rs 0 (0.0% overall), On Track 0/0, FIRE Progress 0.1% (50.0 years to FIRE)
- [x] **Savings Goals tab**: Empty state with "+ Create Goal" and "+ Add Goal" buttons
- [x] Add Savings Goal dialog: Name, Target Amount (500000 default), Current Amount (0), Target Date (date picker), Monthly Contribution (10000), Category dropdown - all fields render
- [x] **FIRE Calculator tab**: FIRE Number Rs 7,09,73,774 (25x annual expenses), Current Progress 0.1% (Rs 70,235), Years to FIRE 50.0, Monthly Required Rs 19,585
- [x] FIRE Projection chart: Green net worth line vs dashed red FIRE target - exponential growth renders correctly
- [x] FIRE Breakdown: Annual Expenses Rs 28,38,951, Current Net Worth Rs 70,235, Remaining to FIRE Rs 7,09,03,538
- [x] FIRE math: 25 x Rs 28,38,951 = Rs 7,09,73,775 - correct (rounding)
- [x] **Investment Projections tab**: Portfolio Projection chart (flat line at Rs 0 - correct since no investments)
- [x] **Net Worth Projection tab**: Net Worth Trajectory 30-year chart (invested vs projected growth), Emergency Fund gauge (0.3 months, Target 6, Remaining 754 months to build)
- [x] All 4 tabs switch and render correctly

### Issues Found
- [ ] **CURRENT NET WORTH Rs 70,235 vs BALANCE Rs 69,881**: FIRE Calculator shows Rs 70,235 as "Current Net Worth" but actual balance is Rs 69,881. Small discrepancy (~Rs 354) - possibly using a slightly different calculation or stale cache.
- [ ] **754 MONTHS TO BUILD EMERGENCY FUND**: "Remaining: 754 months to build" (~63 years) seems unrealistic. This is technically correct given negative/near-zero savings rate, but could be capped or shown as "N/A - negative savings rate" instead.
- [ ] **ANNUAL EXPENSES USES ALL-TIME AVERAGE**: Rs 28,38,951 annual expenses = averaging Jan's high expenses (Rs 3,54,101/mo) with Feb's lower expenses. This inflates the FIRE number. Should ideally use recent trend or let user configure.

---

## 8. AI Insights (/ai-insights)

### Working Features
- [x] Header: "AI Recommendations - AI-powered spending analysis, budget recommendations, and investment insights"
- [x] **Spending Analysis tab**: "AI-powered analysis of your spending patterns and financial health" with Generate button, empty state
- [x] **Monthly Budget tab**: "Monthly Budget Recommendations - Personalized budget allocation for the upcoming month" with Generate button
- [x] **Weekly Budget tab**: "Weekly Budget Recommendations - Short-term spending targets for the coming week" with Generate button
- [x] **Investment Insights tab**: "Investment Insights - AI analysis of your SIPs, stocks, and mutual fund portfolio" with Generate button
- [x] All 4 tabs switch correctly with appropriate descriptions and empty states
- [x] Each tab has a "Generate" button to trigger OpenRouter API call

### Issues Found
- [ ] **NOT TESTED - API CALL**: Did not click Generate to avoid consuming OpenRouter API credits. Would need manual verification that the AI analysis actually returns and renders correctly.
- [ ] **NO CACHED RESULTS**: No previous AI analyses shown (DB was dropped), so cannot verify result caching/display

---

## 9. Cron Jobs (/cron)

### Working Features
- [x] Header: "Cron Jobs - Automated data refresh schedules and status" with "Refresh" button
- [x] **Price Refresh** card: "Updates stock prices and mutual fund NAVs from Yahoo Finance and MFAPI", Schedule: Weekdays at 10:00 AM IST, Last Run: Never, Status: Never_run, "Trigger Now" button
- [x] **Sheet Sync** card: "Syncs transactions from Google Sheets into MongoDB", Schedule: Every 6 hours, Last Run: Never, Status: Never_run, "Trigger Now" button
- [x] **AI Analysis** card: "Generates weekly AI spending analysis for all users", Schedule: Mondays at 9:00 AM IST, Last Run: Never, Status: Never_run, "Trigger Now" button
- [x] Recent Runs table: Job, Status, Started, Finished, Duration, Error columns - empty state "No cron runs recorded yet."
- [x] All 3 cron job cards render with correct metadata and "Trigger Now" buttons

### Issues Found
- [ ] **NOT TESTED - TRIGGER**: Did not click "Trigger Now" to avoid side effects. Would need manual verification that cron triggers work and log results correctly.
- [ ] **NO HISTORICAL DATA**: DB was dropped, so no previous cron run history available to verify the Recent Runs table rendering.

---

## Cross-Cutting Issues (Affect Multiple Pages)

### CRITICAL
1. **DATE OFF BY 1 DAY** (Dashboard, Transactions, Analytics, Financial Health): All dates display 1 day behind due to UTC/IST timezone conversion. Feb 14 shows as "13 Feb". Root cause: dates stored as UTC ISO strings, displayed without timezone adjustment.
2. **93% UNCATEGORIZED TRANSACTIONS** (Dashboard, Transactions, Budget): Most transactions lack proper categories, causing NWI split to be 98% Wants, Budget "Others" at 4146%, and category-based analytics to be meaningless.

### MODERATE
3. **OVERSPEND RATE CAPPED AT 100%** (Dashboard, Analytics): Should show actual percentage (e.g., 236%) when expenses exceed income.
4. **ALL-TIME VS MONTHLY METRICS** (Transactions, Financial Health, Goals): Several pages show all-time averages instead of current month values, which can be misleading.
5. **"Add Transaction" BUTTON NON-FUNCTIONAL** (Transactions): No onClick handler - button does nothing.

### MINOR
6. **NWI BADGE ON INCOME TRANSACTIONS** (Transactions): Income rows show "W" (Wants) badge - semantically wrong, NWI is for expenses only.
7. **EMERGENCY FUND 0.0 months on Dashboard** vs 0.3 months on Financial Health: Inconsistent calculation between pages.
8. **NET WORTH DISCREPANCY**: Goals FIRE Calculator shows Rs 70,235 vs actual balance Rs 69,881.
9. **BUDGET REMAINING Rs 0**: Should show negative value when overspent.
10. **AVATAR 404**: /avatars/user.jpg returns 404 on every page load (cosmetic).
11. **ADD STOCK DEFAULT "RELIANCE"**: Should be empty placeholder instead.
