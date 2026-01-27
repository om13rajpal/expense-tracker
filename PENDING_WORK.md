Pending Work for QA Build

Purpose
Complete QA hardening so lint and build pass, and ensure new analytics views behave correctly under edge cases.

Blocking Issues (must fix)
1) Lint errors from new UI state patterns
   - Avoid setState in useEffect for week selection and pagination reset.
2) Type safety violations (`no-explicit-any`)
   - API routes: auth login, sheets sync, transactions.
   - Hooks: use-auth, use-transactions.
   - Components: ui/chart, chart-area-interactive.
   - Libraries: data-processor, sheets.
3) Purity violation in sidebar skeleton (Math.random during render)
4) Prefer-const in categorizer utility
5) CommonJS require in scripts (ESLint forbids require)

Quality Enhancements (non-blocking but recommended)
- Remove unused variables in API route handlers and utilities.
- Reduce false positives in balance anomaly checks by grouping same-day transactions before comparison.

Edge Cases to Validate
- Empty dataset: audit should render with zeros and no crashes.
- Missing balances: audit should ignore balance change computations safely.
- Out-of-order transaction dates: audit sorts by date before analysis.
- Same-day multiple transactions: anomaly detection should avoid false positives.

Implementation Plan
1) Refactor weekly and transactions pages to avoid setState in effects.
2) Add typed error helpers and replace any in API routes and hooks.
3) Fix chart and tooltip typing in ui/chart and chart-area-interactive.
4) Remove Math.random usage in sidebar skeleton.
5) Update scripts to use ES module imports.
6) Run lint/build again to verify a clean QA pass.
