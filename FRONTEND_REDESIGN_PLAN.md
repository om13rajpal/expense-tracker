Frontend Redesign Plan

Design Direction
- Professional financial command center with clear hierarchy, subdued neutrals, and a single teal/blue accent.
- Dense but scannable layouts: cards, charts, and tables arranged in grid sections.
- Subtle background texture and soft elevation for a premium dashboard feel.

Global Layout
- Header: title + subtitle, right-side actions (sync, time range, export).
- Sidebar: unchanged structure, refreshed colors to match the new palette.
- Page surfaces: rounded cards with soft borders, consistent spacing, and chart-ready containers.

Pages and Sections

1) Dashboard
- Hero summary row
  - Current balance, month opening balance, week opening balance, month net change, week net change, savings rate.
- Balance Reference
  - Month bridge: opening balance, inflow, outflow, closing balance, net change.
  - Week bridge: same metrics for the selected week.
- Trends and Performance
  - Monthly income vs expenses (area chart).
  - Balance runway (line chart using running balance).
- Short-term Activity
  - Daily cashflow (bar or line chart) for the current month.
  - Category mix (pie) for current month.
- Operational Detail
  - Payment method breakdown (horizontal bars).
  - Top merchants table.
  - Recent transactions table.

2) Analytics
- Snapshot
  - Account summary, month summary, savings rate band.
- Daily
  - Daily trend chart with net and totals, daily averages, peak day.
- Weekly
  - Week selector, weekly balance bridge, daily breakdown, top categories, top expenses.
- Monthly
  - Monthly trends, month-over-month growth, category deep dive.
- Yearly
  - Year-over-year totals, annual savings rate, year comparison chart.

3) Transactions
- Summary strip
  - Filtered totals: income, expenses, net.
- Timeline chart
  - Daily spend line for the filtered period.
- Table
  - Expanded columns: date, description, category, payment, amount, balance.
  - Inline badges for income/expense and category.

4) Budget
- Budget health overview
  - Total spent vs prorated budget, projected end-of-month spend, remaining runway.
- Category budgets
  - Edit-in-place, progress bars with status colors, remaining/overspent labels.

5) Login
- Branded login card with subtle gradient, security assurance text, and concise form.

Component Strategy
- Shared metric tiles for headline stats.
- Shared period bridge card for month/week reference balances.
- Chart containers standardized with a consistent color system and tooltip style.
