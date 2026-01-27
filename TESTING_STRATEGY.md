# Finance Tracker - Comprehensive Testing Strategy

**Version:** 1.0
**Date:** 2026-01-26
**Agent:** Tester (Hive Mind Swarm)
**Mission:** Ensure data accuracy, authentication security, and sync reliability

---

## Table of Contents

1. [Overview](#overview)
2. [Testing Pyramid](#testing-pyramid)
3. [Test Categories](#test-categories)
4. [Detailed Test Plans](#detailed-test-plans)
5. [Edge Cases & Error Handling](#edge-cases--error-handling)
6. [Manual Testing Checklist](#manual-testing-checklist)
7. [Data Validation Tests](#data-validation-tests)
8. [Security Testing](#security-testing)
9. [Performance Benchmarks](#performance-benchmarks)
10. [Test Data Sets](#test-data-sets)
11. [Testing Tools & Setup](#testing-tools--setup)

---

## Overview

### Project Context
- **Platform:** Next.js 16.1.4 + React 19.2.3 + TypeScript
- **Data Source:** Google Sheets (16-column transaction data)
- **Critical Features:**
  - Authentication (email + OAuth)
  - Google Sheets synchronization
  - Financial data parsing & analytics
  - Real-time visualizations
  - Transaction filtering & search

### Testing Objectives
1. **Data Accuracy:** Ensure 100% accuracy in transaction parsing and calculations
2. **Auth Security:** Validate authentication flows and session management
3. **Sync Reliability:** Guarantee consistent data synchronization with Google Sheets
4. **User Experience:** Verify responsive UI and error handling
5. **Performance:** Maintain sub-200ms response times for critical operations

---

## Testing Pyramid

```
         /\
        /E2E\           5% - Critical user journeys
       /------\
      / Integ. \        15% - API + Component integration
     /----------\
    /   Unit     \      80% - Business logic, utilities, parsers
   /--------------\
```

### Coverage Requirements
- **Statements:** ≥85%
- **Branches:** ≥80%
- **Functions:** ≥85%
- **Lines:** ≥85%
- **Critical Paths:** 100% (auth, data parsing, calculations)

---

## Test Categories

### 1. Unit Tests (80% of suite)
- Data parsers and validators
- Analytics calculators
- Type converters
- Utility functions
- Zod schema validation

### 2. Integration Tests (15% of suite)
- Component + data flow
- API route handlers (when implemented)
- Google Sheets API integration
- Authentication flow

### 3. End-to-End Tests (5% of suite)
- Complete user journeys
- Cross-browser compatibility
- Mobile responsiveness

---

## Detailed Test Plans

## 1. Authentication Flow Tests

### 1.1 Login Form Component Tests

**File:** `components/login-form.tsx`

#### Unit Tests

```typescript
// __tests__/components/login-form.test.tsx

describe('LoginForm Component', () => {
  describe('Email Login', () => {
    it('should render email input with correct type', () => {
      render(<LoginForm />)
      const emailInput = screen.getByLabelText(/email/i)
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('required')
    })

    it('should validate email format on blur', () => {
      // Test HTML5 validation
      // Expected: Invalid emails should trigger validation error
    })

    it('should submit form with valid email', async () => {
      // Simulate form submission
      // Expected: Form submission triggers with correct data
    })

    it('should prevent submission with empty email', () => {
      // Expected: Required validation prevents submission
    })

    it('should handle submission errors gracefully', async () => {
      // Mock API error
      // Expected: Error message displayed to user
    })
  })

  describe('OAuth Login', () => {
    it('should render Google OAuth button', () => {
      render(<LoginForm />)
      expect(screen.getByText(/continue with google/i)).toBeInTheDocument()
    })

    it('should render Apple OAuth button', () => {
      render(<LoginForm />)
      expect(screen.getByText(/continue with apple/i)).toBeInTheDocument()
    })

    it('should handle Google OAuth click', async () => {
      // Mock OAuth flow
      // Expected: Redirects to Google OAuth
    })

    it('should handle Apple OAuth click', async () => {
      // Mock OAuth flow
      // Expected: Redirects to Apple OAuth
    })

    it('should handle OAuth callback success', async () => {
      // Mock successful OAuth callback
      // Expected: User authenticated and redirected to dashboard
    })

    it('should handle OAuth callback failure', async () => {
      // Mock failed OAuth callback
      // Expected: Error message displayed
    })
  })

  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<LoginForm />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should support keyboard navigation', () => {
      // Test Tab navigation between fields
    })

    it('should have proper ARIA labels', () => {
      // Verify all interactive elements have labels
    })
  })
})
```

#### Integration Tests

```typescript
// __tests__/integration/auth-flow.test.tsx

describe('Authentication Flow Integration', () => {
  it('should complete full email login flow', async () => {
    // 1. Navigate to /login
    // 2. Enter email
    // 3. Submit form
    // 4. Mock auth API success
    // 5. Verify redirect to /dashboard
    // 6. Verify session cookie set
  })

  it('should persist session across page reloads', async () => {
    // Login -> Reload -> Verify still authenticated
  })

  it('should handle session expiration', async () => {
    // Login -> Expire session -> Verify redirect to login
  })

  it('should prevent authenticated users from accessing login', async () => {
    // Login -> Navigate to /login -> Verify redirect to dashboard
  })
})
```

#### Edge Cases

| Test Case | Input | Expected Behavior |
|-----------|-------|-------------------|
| Empty email | `""` | HTML5 validation error |
| Invalid format | `"notanemail"` | HTML5 validation error |
| Valid email | `"user@example.com"` | Form submits |
| SQL injection attempt | `"admin'--@test.com"` | Sanitized, no security issue |
| XSS in email | `"<script>alert(1)</script>@test.com"` | Sanitized |
| Very long email | 256+ chars | Validation error or truncation |
| Unicode characters | `"用户@例え.com"` | Accepted (valid email) |
| Network timeout | Slow API | Loading state → Error after 10s |
| Rate limiting | 5+ rapid attempts | Rate limit error displayed |

---

## 2. Google Sheets Sync Tests

### 2.1 Data Fetching

**Priority:** CRITICAL

#### Unit Tests

```typescript
// __tests__/lib/sheets-sync.test.ts

describe('Google Sheets Sync', () => {
  describe('fetchTransactions', () => {
    it('should fetch and parse valid transaction data', async () => {
      const mockSheetData = [
        ['2024-01-15', 'Grocery Shopping', 'Walmart', 'Groceries', '-45.50', ...]
      ]

      const transactions = await fetchTransactions(mockSheetData)

      expect(transactions).toHaveLength(1)
      expect(transactions[0]).toMatchObject({
        date: new Date('2024-01-15'),
        description: 'Grocery Shopping',
        merchant: 'Walmart',
        category: TransactionCategory.GROCERIES,
        amount: -45.50,
        type: TransactionType.EXPENSE
      })
    })

    it('should handle empty sheet data', async () => {
      const result = await fetchTransactions([])
      expect(result).toEqual([])
    })

    it('should skip header row', async () => {
      const mockSheetData = [
        ['Date', 'Description', 'Merchant', ...],
        ['2024-01-15', 'Transaction', 'Store', ...]
      ]

      const transactions = await fetchTransactions(mockSheetData)
      expect(transactions).toHaveLength(1)
    })

    it('should handle malformed rows gracefully', async () => {
      const mockSheetData = [
        ['2024-01-15', 'Valid', 'Store', 'Groceries', '-45.50', ...],
        ['INVALID_DATE', 'Broken', null, undefined, 'NOT_A_NUMBER', ...],
        ['2024-01-16', 'Valid', 'Store', 'Dining', '-25.00', ...]
      ]

      const transactions = await fetchTransactions(mockSheetData)
      expect(transactions).toHaveLength(2) // Only valid rows
    })

    it('should handle network errors with retry logic', async () => {
      // Mock API failure -> Success on retry
      // Expected: Retries 3 times before failing
    })

    it('should handle authentication errors', async () => {
      // Mock 401 Unauthorized
      // Expected: Clear session, redirect to login
    })
  })

  describe('Data Parsing', () => {
    it('should parse dates in multiple formats', () => {
      const formats = [
        '2024-01-15',
        '01/15/2024',
        '15-Jan-2024',
        'January 15, 2024'
      ]

      formats.forEach(dateStr => {
        const parsed = parseTransactionDate(dateStr)
        expect(parsed).toBeInstanceOf(Date)
        expect(parsed.getFullYear()).toBe(2024)
      })
    })

    it('should parse currency amounts correctly', () => {
      const amounts = [
        { input: '45.50', expected: 45.50 },
        { input: '-45.50', expected: -45.50 },
        { input: '$45.50', expected: 45.50 },
        { input: '₹1,234.56', expected: 1234.56 },
        { input: '(45.50)', expected: -45.50 }, // Accounting format
      ]

      amounts.forEach(({ input, expected }) => {
        expect(parseCurrency(input)).toBe(expected)
      })
    })

    it('should map categories correctly', () => {
      const categories = {
        'groceries': TransactionCategory.GROCERIES,
        'Dining Out': TransactionCategory.DINING,
        'gas': TransactionCategory.FUEL,
        'Netflix': TransactionCategory.SUBSCRIPTION
      }

      Object.entries(categories).forEach(([input, expected]) => {
        expect(mapCategory(input)).toBe(expected)
      })
    })

    it('should handle unknown categories', () => {
      expect(mapCategory('Unknown Category')).toBe(
        TransactionCategory.UNCATEGORIZED
      )
    })
  })
})
```

#### Integration Tests

```typescript
describe('Google Sheets Integration', () => {
  it('should sync data from real Google Sheets API', async () => {
    // Use test spreadsheet
    // Expected: Data fetched and parsed correctly
  })

  it('should handle rate limiting', async () => {
    // Make multiple rapid requests
    // Expected: Backoff and retry
  })

  it('should update UI when new data arrives', async () => {
    // Trigger sync -> Wait for data -> Verify UI updates
  })

  it('should show sync status to user', async () => {
    // Start sync -> Verify loading state -> Verify success message
  })
})
```

#### Edge Cases

| Scenario | Test Case | Expected Behavior |
|----------|-----------|-------------------|
| Empty spreadsheet | 0 rows | Returns empty array, no error |
| Missing columns | Missing 'amount' | Skips row, logs warning |
| Malformed dates | "not-a-date" | Skips row or uses fallback |
| Invalid amounts | "abc" | Treats as 0 or skips row |
| Very large dataset | 10,000+ rows | Pagination, no memory issues |
| Concurrent syncs | 2 sync requests | Debounce, only 1 request |
| Network interruption | Mid-sync disconnect | Resume or retry from start |
| API quota exceeded | 429 response | Show error, retry after delay |
| Invalid spreadsheet ID | 404 response | Error message to user |
| Permission denied | 403 response | Prompt re-authentication |

---

## 3. Data Parsing & Validation Tests

### 3.1 Transaction Schema Validation

```typescript
// __tests__/lib/validation.test.ts

import { schema } from '@/lib/types'

describe('Transaction Schema Validation', () => {
  it('should validate complete transaction', () => {
    const validTransaction = {
      id: '123',
      date: '2024-01-15',
      description: 'Grocery Shopping',
      merchant: 'Walmart',
      category: 'Groceries',
      amount: '-45.50',
      type: 'expense',
      paymentMethod: 'Credit Card',
      account: 'Main Checking',
      status: 'completed',
      tags: 'food,essential',
      recurring: 'false'
    }

    const result = schema.safeParse(validTransaction)
    expect(result.success).toBe(true)
  })

  it('should reject invalid transaction types', () => {
    const invalid = { ...validTransaction, type: 'invalid_type' }
    const result = schema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('should handle optional fields', () => {
    const minimal = {
      id: '123',
      date: '2024-01-15',
      description: 'Test',
      merchant: 'Store',
      amount: '10.00',
      type: 'expense',
      paymentMethod: 'Cash',
      account: 'Cash',
      status: 'completed'
    }

    const result = schema.safeParse(minimal)
    expect(result.success).toBe(true)
  })
})
```

---

## 4. Analytics Calculation Tests

### 4.1 Financial Metrics

**File:** `lib/analytics.ts` (to be created)

```typescript
// __tests__/lib/analytics.test.ts

describe('Analytics Calculations', () => {
  const mockTransactions: Transaction[] = [
    {
      id: '1',
      date: new Date('2024-01-15'),
      amount: -45.50,
      type: TransactionType.EXPENSE,
      category: TransactionCategory.GROCERIES,
      // ... other required fields
    },
    {
      id: '2',
      date: new Date('2024-01-20'),
      amount: 2500.00,
      type: TransactionType.INCOME,
      category: TransactionCategory.SALARY,
      // ...
    },
    {
      id: '3',
      date: new Date('2024-01-25'),
      amount: -120.00,
      type: TransactionType.EXPENSE,
      category: TransactionCategory.DINING,
      // ...
    }
  ]

  describe('calculateTotals', () => {
    it('should calculate total income correctly', () => {
      const analytics = calculateAnalytics(mockTransactions)
      expect(analytics.totalIncome).toBe(2500.00)
    })

    it('should calculate total expenses correctly', () => {
      const analytics = calculateAnalytics(mockTransactions)
      expect(analytics.totalExpenses).toBe(165.50)
    })

    it('should calculate net savings', () => {
      const analytics = calculateAnalytics(mockTransactions)
      expect(analytics.netSavings).toBe(2334.50)
    })

    it('should calculate savings rate percentage', () => {
      const analytics = calculateAnalytics(mockTransactions)
      expect(analytics.savingsRate).toBeCloseTo(93.38, 2)
    })

    it('should handle zero income', () => {
      const expensesOnly = mockTransactions.filter(
        t => t.type === TransactionType.EXPENSE
      )
      const analytics = calculateAnalytics(expensesOnly)
      expect(analytics.savingsRate).toBe(0)
    })

    it('should handle negative savings', () => {
      const overspending = [
        { ...mockTransactions[0], amount: -3000 }
      ]
      const analytics = calculateAnalytics(overspending)
      expect(analytics.netSavings).toBeLessThan(0)
    })
  })

  describe('categoryBreakdown', () => {
    it('should group transactions by category', () => {
      const analytics = calculateAnalytics(mockTransactions)
      const groceries = analytics.categoryBreakdown.find(
        c => c.category === TransactionCategory.GROCERIES
      )

      expect(groceries).toBeDefined()
      expect(groceries!.amount).toBe(45.50)
      expect(groceries!.transactionCount).toBe(1)
    })

    it('should calculate category percentages', () => {
      const analytics = calculateAnalytics(mockTransactions)
      const totalPercentage = analytics.categoryBreakdown
        .reduce((sum, cat) => sum + cat.percentage, 0)

      expect(totalPercentage).toBeCloseTo(100, 1)
    })
  })

  describe('monthlyTrends', () => {
    it('should aggregate transactions by month', () => {
      const multiMonth = [
        { ...mockTransactions[0], date: new Date('2024-01-15') },
        { ...mockTransactions[1], date: new Date('2024-02-15') },
        { ...mockTransactions[2], date: new Date('2024-02-20') }
      ]

      const analytics = calculateAnalytics(multiMonth)
      expect(analytics.monthlyTrends).toHaveLength(2)
    })

    it('should calculate monthly savings rate', () => {
      const analytics = calculateAnalytics(mockTransactions)
      const januaryTrend = analytics.monthlyTrends[0]

      expect(januaryTrend.savingsRate).toBeGreaterThan(0)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty transaction array', () => {
      const analytics = calculateAnalytics([])
      expect(analytics.totalIncome).toBe(0)
      expect(analytics.totalExpenses).toBe(0)
      expect(analytics.categoryBreakdown).toEqual([])
    })

    it('should handle very large amounts', () => {
      const largeTransaction = {
        ...mockTransactions[0],
        amount: 999999999.99
      }

      const analytics = calculateAnalytics([largeTransaction])
      expect(analytics.totalExpenses).toBe(999999999.99)
    })

    it('should handle floating point precision', () => {
      const precisionTest = [
        { ...mockTransactions[0], amount: -0.1 },
        { ...mockTransactions[0], amount: -0.2 }
      ]

      const analytics = calculateAnalytics(precisionTest)
      expect(analytics.totalExpenses).toBeCloseTo(0.3, 10)
    })
  })
})
```

---

## 5. Chart Rendering Tests

### 5.1 Area Chart Component

```typescript
// __tests__/components/chart-area-interactive.test.tsx

describe('ChartAreaInteractive', () => {
  const mockData = [
    { date: "2024-04-01", desktop: 222, mobile: 150 },
    { date: "2024-04-02", desktop: 97, mobile: 180 },
    // ... more data
  ]

  it('should render chart with data', () => {
    render(<ChartAreaInteractive />)
    expect(screen.getByText(/total visitors/i)).toBeInTheDocument()
  })

  it('should filter data by time range', async () => {
    render(<ChartAreaInteractive />)

    const select = screen.getByRole('combobox')
    await userEvent.click(select)
    await userEvent.click(screen.getByText(/last 7 days/i))

    // Verify filtered data displayed
  })

  it('should update chart when time range changes', async () => {
    // Mock recharts
    // Change range -> Verify chart re-renders with new data
  })

  it('should handle mobile view', () => {
    // Mock mobile viewport
    render(<ChartAreaInteractive />)
    // Verify mobile-specific UI
  })

  it('should format dates correctly in tooltip', async () => {
    render(<ChartAreaInteractive />)
    // Hover over chart -> Verify tooltip format
  })

  it('should handle empty data gracefully', () => {
    // Pass empty data -> Verify no crash, shows message
  })
})
```

---

## 6. Data Table Tests

### 6.1 Filtering & Sorting

```typescript
// __tests__/components/data-table.test.tsx

describe('DataTable Component', () => {
  const mockData = [
    {
      id: 1,
      header: 'Transaction 1',
      type: 'Groceries',
      status: 'Done',
      target: '100',
      limit: '50',
      reviewer: 'John Doe'
    },
    // ... more data
  ]

  describe('Rendering', () => {
    it('should render all rows', () => {
      render(<DataTable data={mockData} />)
      expect(screen.getAllByRole('row')).toHaveLength(mockData.length + 1) // +1 for header
    })

    it('should show column headers', () => {
      render(<DataTable data={mockData} />)
      expect(screen.getByText(/header/i)).toBeInTheDocument()
      expect(screen.getByText(/status/i)).toBeInTheDocument()
    })
  })

  describe('Pagination', () => {
    it('should paginate data', async () => {
      const largeDataset = Array.from({ length: 50 }, (_, i) => ({
        ...mockData[0],
        id: i + 1
      }))

      render(<DataTable data={largeDataset} />)

      // Default page size is 10
      expect(screen.getAllByRole('row')).toHaveLength(11) // 10 + header
    })

    it('should navigate between pages', async () => {
      const largeDataset = Array.from({ length: 50 }, (_, i) => ({
        ...mockData[0],
        id: i + 1
      }))

      render(<DataTable data={largeDataset} />)

      const nextButton = screen.getByRole('button', { name: /next page/i })
      await userEvent.click(nextButton)

      expect(screen.getByText(/page 2 of 5/i)).toBeInTheDocument()
    })

    it('should change page size', async () => {
      // Select 20 rows per page -> Verify 20 rows shown
    })
  })

  describe('Column Visibility', () => {
    it('should toggle column visibility', async () => {
      render(<DataTable data={mockData} />)

      const columnButton = screen.getByText(/customize columns/i)
      await userEvent.click(columnButton)

      const typeCheckbox = screen.getByRole('menuitemcheckbox', { name: /type/i })
      await userEvent.click(typeCheckbox)

      // Verify 'type' column hidden
    })
  })

  describe('Row Selection', () => {
    it('should select individual rows', async () => {
      render(<DataTable data={mockData} />)

      const checkboxes = screen.getAllByRole('checkbox')
      await userEvent.click(checkboxes[1]) // First data row

      expect(screen.getByText(/1 of \d+ row\(s\) selected/i)).toBeInTheDocument()
    })

    it('should select all rows', async () => {
      render(<DataTable data={mockData} />)

      const selectAllCheckbox = screen.getAllByRole('checkbox')[0]
      await userEvent.click(selectAllCheckbox)

      expect(screen.getByText(new RegExp(`${mockData.length} of`))).toBeInTheDocument()
    })
  })

  describe('Drag and Drop', () => {
    it('should reorder rows via drag and drop', async () => {
      // Use @dnd-kit test utils
      // Drag row 1 to row 3 position -> Verify order changed
    })
  })

  describe('Inline Editing', () => {
    it('should edit target value', async () => {
      render(<DataTable data={mockData} />)

      const targetInput = screen.getByDisplayValue('100')
      await userEvent.clear(targetInput)
      await userEvent.type(targetInput, '150')

      // Submit form -> Verify toast notification
    })

    it('should edit limit value', async () => {
      // Similar to target edit test
    })
  })

  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<DataTable data={mockData} />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should support keyboard navigation', async () => {
      // Tab through interactive elements
    })
  })
})
```

---

## Edge Cases & Error Handling

### Critical Edge Cases

#### 1. Empty States

| Component | Empty State | Expected UI |
|-----------|-------------|-------------|
| Dashboard | No transactions | "No data available. Sync with Google Sheets to get started." |
| Charts | No data | Empty chart with message |
| Data Table | No rows | "No results." message |
| Filters | No matches | "No transactions match your filters." |

#### 2. Network Errors

| Scenario | Error Type | User Feedback | Recovery Action |
|----------|------------|---------------|-----------------|
| Sync failure | Network timeout | Toast: "Sync failed. Retrying..." | Auto-retry 3x with backoff |
| Auth failure | 401 Unauthorized | Redirect to login | Clear session, prompt re-login |
| API rate limit | 429 Too Many Requests | Toast: "Rate limit reached. Try again in X minutes." | Disable sync button temporarily |
| Server error | 500 Internal Server | Toast: "Server error. Please try again later." | Show cached data if available |

#### 3. Data Anomalies

| Issue | Detection | Handling |
|-------|-----------|----------|
| Duplicate transactions | Same ID or date+amount+merchant | Deduplicate, keep latest |
| Missing required fields | Validation error | Skip row, log warning |
| Invalid date ranges | Date in future or before 1970 | Use fallback date or skip |
| Negative income | Type mismatch | Auto-correct or flag for review |
| Extremely large amounts | >$1M | Flag for review, allow valid |

#### 4. Concurrent Operations

| Scenario | Conflict | Resolution |
|----------|----------|------------|
| Multiple sync requests | Race condition | Debounce, queue requests |
| Edit during sync | Data overwrite | Lock editing during sync |
| Session expiry during operation | Auth failure | Save draft, prompt re-login |

---

## Manual Testing Checklist

### Pre-Release Manual Testing

#### Authentication Flow
- [ ] Email login with valid credentials
- [ ] Email login with invalid credentials
- [ ] Google OAuth flow (success path)
- [ ] Google OAuth flow (user cancels)
- [ ] Apple OAuth flow (success path)
- [ ] Session persistence after browser refresh
- [ ] Logout functionality
- [ ] Auto-logout after session timeout
- [ ] Login redirect after accessing protected route

#### Google Sheets Integration
- [ ] Initial sync from empty state
- [ ] Incremental sync with new transactions
- [ ] Sync with 100+ transactions (performance)
- [ ] Sync with malformed data (skip bad rows)
- [ ] Sync button shows loading state
- [ ] Success notification after sync
- [ ] Error notification on sync failure
- [ ] Retry mechanism works

#### Dashboard & Analytics
- [ ] All metric cards display correct values
- [ ] Charts render without errors
- [ ] Time range filter (7d, 30d, 90d) works
- [ ] Category breakdown matches raw data
- [ ] Payment method distribution correct
- [ ] Monthly trends show correct aggregation
- [ ] Empty state shows helpful message

#### Data Table
- [ ] All transactions display
- [ ] Pagination works correctly
- [ ] Sorting by each column works
- [ ] Filter by category works
- [ ] Filter by payment method works
- [ ] Search functionality works
- [ ] Column visibility toggle works
- [ ] Row selection works
- [ ] Drag-and-drop reordering works (if applicable)
- [ ] Inline editing saves correctly
- [ ] Export functionality works (if implemented)

#### Responsive Design
- [ ] Desktop (1920x1080) - all features work
- [ ] Laptop (1366x768) - no layout breaks
- [ ] Tablet (768x1024) - mobile menu works
- [ ] Mobile (375x667) - touch targets adequate
- [ ] Charts resize appropriately
- [ ] Table scrolls horizontally on mobile

#### Cross-Browser Testing
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

#### Performance
- [ ] Initial page load < 3 seconds
- [ ] Sync operation < 5 seconds for 100 transactions
- [ ] Chart interactions < 100ms response time
- [ ] Table filtering < 200ms
- [ ] No memory leaks after 30min session

#### Accessibility
- [ ] Keyboard navigation through all interactive elements
- [ ] Screen reader compatibility (NVDA/JAWS)
- [ ] Focus indicators visible
- [ ] Color contrast meets WCAG AA
- [ ] All images have alt text
- [ ] Forms have proper labels

---

## Data Validation Tests

### Input Validation Rules

```typescript
// __tests__/lib/validators.test.ts

describe('Input Validators', () => {
  describe('Date Validation', () => {
    it('should accept valid dates', () => {
      const validDates = [
        '2024-01-15',
        '2024-12-31',
        '2020-02-29', // Leap year
      ]

      validDates.forEach(date => {
        expect(isValidDate(date)).toBe(true)
      })
    })

    it('should reject invalid dates', () => {
      const invalidDates = [
        '2023-02-29', // Not a leap year
        '2024-13-01', // Invalid month
        '2024-01-32', // Invalid day
        'not-a-date',
        '',
        null
      ]

      invalidDates.forEach(date => {
        expect(isValidDate(date)).toBe(false)
      })
    })

    it('should reject future dates', () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)

      expect(isValidTransactionDate(futureDate)).toBe(false)
    })
  })

  describe('Amount Validation', () => {
    it('should accept valid amounts', () => {
      expect(isValidAmount('45.50')).toBe(true)
      expect(isValidAmount('-45.50')).toBe(true)
      expect(isValidAmount('0')).toBe(true)
      expect(isValidAmount('999999.99')).toBe(true)
    })

    it('should reject invalid amounts', () => {
      expect(isValidAmount('abc')).toBe(false)
      expect(isValidAmount('')).toBe(false)
      expect(isValidAmount('45.5.0')).toBe(false)
    })

    it('should handle currency symbols', () => {
      expect(parseAmount('$45.50')).toBe(45.50)
      expect(parseAmount('₹1,234')).toBe(1234)
    })
  })

  describe('Category Validation', () => {
    it('should accept valid categories', () => {
      Object.values(TransactionCategory).forEach(category => {
        expect(isValidCategory(category)).toBe(true)
      })
    })

    it('should reject invalid categories', () => {
      expect(isValidCategory('InvalidCategory')).toBe(false)
    })

    it('should normalize category names', () => {
      expect(normalizeCategory('groceries')).toBe('Groceries')
      expect(normalizeCategory('GROCERIES')).toBe('Groceries')
      expect(normalizeCategory('  Groceries  ')).toBe('Groceries')
    })
  })
})
```

### Data Sanitization

```typescript
describe('Data Sanitization', () => {
  describe('XSS Prevention', () => {
    it('should sanitize script tags in description', () => {
      const malicious = '<script>alert("XSS")</script>Grocery'
      const sanitized = sanitizeDescription(malicious)

      expect(sanitized).not.toContain('<script>')
      expect(sanitized).toBe('Grocery')
    })

    it('should sanitize HTML in merchant name', () => {
      const malicious = '<img src=x onerror=alert(1)>Store'
      const sanitized = sanitizeMerchant(malicious)

      expect(sanitized).not.toContain('<img')
      expect(sanitized).toBe('Store')
    })
  })

  describe('SQL Injection Prevention', () => {
    it('should escape SQL special characters', () => {
      const malicious = "'; DROP TABLE transactions; --"
      const sanitized = sanitizeInput(malicious)

      // Verify escaping or rejection
      expect(sanitized).not.toContain('DROP TABLE')
    })
  })
})
```

---

## Security Testing

### Authentication Security

#### Test Cases

```typescript
describe('Authentication Security', () => {
  describe('Session Management', () => {
    it('should generate secure session tokens', () => {
      const token = generateSessionToken()

      expect(token).toHaveLength(64) // 256-bit
      expect(token).toMatch(/^[a-f0-9]+$/) // Hex
    })

    it('should expire sessions after timeout', async () => {
      // Login -> Wait for timeout -> Verify redirect
    })

    it('should invalidate old sessions on new login', async () => {
      // Login device 1 -> Login device 2 -> Verify device 1 logged out
    })

    it('should prevent session fixation attacks', () => {
      // Attempt to set custom session ID -> Verify rejected
    })
  })

  describe('CSRF Protection', () => {
    it('should reject requests without CSRF token', async () => {
      // POST without token -> Expect 403
    })

    it('should validate CSRF token', async () => {
      // POST with invalid token -> Expect 403
    })
  })

  describe('Rate Limiting', () => {
    it('should rate limit login attempts', async () => {
      // 5 failed attempts -> Expect lockout
    })

    it('should rate limit API requests', async () => {
      // 100 requests in 1min -> Expect 429
    })
  })

  describe('Data Privacy', () => {
    it('should not expose sensitive data in errors', () => {
      // Trigger error -> Verify no PII in response
    })

    it('should not log sensitive data', () => {
      // Verify logs don't contain passwords, tokens
    })
  })
})
```

### OAuth Security

- [ ] Validate OAuth state parameter (prevent CSRF)
- [ ] Verify OAuth token signature
- [ ] Check token expiration
- [ ] Validate redirect URI matches registered URI
- [ ] Use PKCE for mobile/SPA flows
- [ ] Securely store refresh tokens

### API Security

- [ ] HTTPS only (no HTTP)
- [ ] Validate all input parameters
- [ ] Implement proper CORS policy
- [ ] Use Content Security Policy headers
- [ ] Sanitize all user-generated content
- [ ] Implement request signing for sensitive operations

---

## Performance Benchmarks

### Target Metrics

| Operation | Target Time | Max Acceptable |
|-----------|-------------|----------------|
| Initial page load | < 2s | 3s |
| Dashboard render | < 500ms | 1s |
| Chart render | < 300ms | 500ms |
| Table filter | < 100ms | 200ms |
| Google Sheets sync (100 rows) | < 3s | 5s |
| Analytics calculation | < 200ms | 500ms |
| Search query | < 150ms | 300ms |

### Performance Tests

```typescript
describe('Performance Benchmarks', () => {
  describe('Dashboard Rendering', () => {
    it('should render 1000 transactions in under 500ms', async () => {
      const largeDataset = generateMockTransactions(1000)

      const start = performance.now()
      render(<Dashboard transactions={largeDataset} />)
      const duration = performance.now() - start

      expect(duration).toBeLessThan(500)
    })
  })

  describe('Analytics Calculation', () => {
    it('should calculate analytics for 10k transactions in under 1s', () => {
      const largeDataset = generateMockTransactions(10000)

      const start = performance.now()
      const analytics = calculateAnalytics(largeDataset)
      const duration = performance.now() - start

      expect(duration).toBeLessThan(1000)
    })
  })

  describe('Memory Usage', () => {
    it('should not leak memory during sync', async () => {
      const initialMemory = performance.memory.usedJSHeapSize

      // Perform 10 sync operations
      for (let i = 0; i < 10; i++) {
        await syncGoogleSheets()
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      // Force garbage collection (if available)
      if (global.gc) global.gc()

      const finalMemory = performance.memory.usedJSHeapSize
      const memoryIncrease = finalMemory - initialMemory

      // Memory increase should be < 10MB
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024)
    })
  })
})
```

### Bundle Size Monitoring

- [ ] Total bundle size < 500KB (gzipped)
- [ ] Largest chunk < 200KB
- [ ] No duplicate dependencies
- [ ] Tree-shaking working correctly
- [ ] Code-splitting implemented for routes

---

## Test Data Sets

### Sample Transaction Data

```typescript
// __tests__/__fixtures__/transactions.ts

export const validTransactions = [
  {
    id: '1',
    date: new Date('2024-01-15'),
    description: 'Weekly Grocery Shopping',
    merchant: 'Walmart',
    category: TransactionCategory.GROCERIES,
    amount: -125.50,
    type: TransactionType.EXPENSE,
    paymentMethod: PaymentMethod.CREDIT_CARD,
    account: 'Chase Freedom',
    status: TransactionStatus.COMPLETED,
    tags: ['food', 'essential'],
    recurring: false
  },
  {
    id: '2',
    date: new Date('2024-01-16'),
    description: 'Monthly Salary',
    merchant: 'Employer Inc.',
    category: TransactionCategory.SALARY,
    amount: 5000.00,
    type: TransactionType.INCOME,
    paymentMethod: PaymentMethod.NET_BANKING,
    account: 'Checking',
    status: TransactionStatus.COMPLETED,
    tags: ['income', 'regular'],
    recurring: true
  },
  {
    id: '3',
    date: new Date('2024-01-17'),
    description: 'Dinner at Italian Restaurant',
    merchant: 'Olive Garden',
    category: TransactionCategory.DINING,
    amount: -85.00,
    type: TransactionType.EXPENSE,
    paymentMethod: PaymentMethod.CREDIT_CARD,
    account: 'Chase Freedom',
    status: TransactionStatus.COMPLETED,
    tags: ['dining', 'entertainment'],
    recurring: false
  },
  {
    id: '4',
    date: new Date('2024-01-18'),
    description: 'Gas Station Fill-up',
    merchant: 'Shell',
    category: TransactionCategory.FUEL,
    amount: -45.00,
    type: TransactionType.EXPENSE,
    paymentMethod: PaymentMethod.DEBIT_CARD,
    account: 'Checking',
    status: TransactionStatus.COMPLETED,
    tags: ['transport', 'essential'],
    recurring: false
  },
  {
    id: '5',
    date: new Date('2024-01-20'),
    description: 'Netflix Subscription',
    merchant: 'Netflix',
    category: TransactionCategory.SUBSCRIPTION,
    amount: -15.99,
    type: TransactionType.EXPENSE,
    paymentMethod: PaymentMethod.CREDIT_CARD,
    account: 'Chase Freedom',
    status: TransactionStatus.COMPLETED,
    tags: ['entertainment', 'subscription'],
    recurring: true
  }
]

export const edgeCaseTransactions = [
  {
    id: 'edge-1',
    description: 'Zero amount transaction',
    amount: 0,
    // ...
  },
  {
    id: 'edge-2',
    description: 'Very large amount',
    amount: 999999.99,
    // ...
  },
  {
    id: 'edge-3',
    description: 'Fractional cents',
    amount: -12.345, // Should round to -12.35
    // ...
  },
  {
    id: 'edge-4',
    description: 'Unicode characters: 测试 テスト',
    merchant: 'Café ☕',
    // ...
  }
]

export const malformedData = [
  {
    date: 'INVALID_DATE',
    description: null,
    amount: 'not-a-number',
    // ...
  }
]
```

---

## Testing Tools & Setup

### Required Dependencies

```json
{
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/user-event": "^14.5.1",
    "@testing-library/jest-dom": "^6.1.5",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0",
    "@types/jest": "^29.5.11",
    "ts-jest": "^29.1.1",
    "msw": "^2.0.0",
    "axe-core": "^4.8.3",
    "jest-axe": "^8.0.0",
    "@playwright/test": "^1.40.0",
    "vitest": "^1.0.4"
  }
}
```

### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/__tests__/**',
  ],
  coverageThresholds: {
    global: {
      statements: 85,
      branches: 80,
      functions: 85,
      lines: 85,
    },
  },
}
```

### Test Setup

```typescript
// jest.setup.ts
import '@testing-library/jest-dom'
import { toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    }
  },
  usePathname() {
    return ''
  },
}))

// Mock window.matchMedia for responsive hooks
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})
```

### E2E Test Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

---

## Test Execution Plan

### Development Workflow

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- login-form.test.tsx

# Run tests with coverage
npm test -- --coverage

# Run E2E tests
npm run test:e2e

# Run E2E tests in UI mode
npm run test:e2e -- --ui

# Run accessibility tests only
npm test -- --testPathPattern=a11y
```

### CI/CD Pipeline

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v3

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

### Pre-Deployment Checklist

- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] All E2E tests passing
- [ ] Coverage thresholds met (>85%)
- [ ] No accessibility violations
- [ ] Performance benchmarks met
- [ ] Security tests passing
- [ ] Manual testing checklist completed
- [ ] Cross-browser tests passing
- [ ] Mobile responsive tests passing

---

## Test Reporting

### Coverage Reports

Generate and review coverage reports:

```bash
npm test -- --coverage --coverageReporters=html
open coverage/index.html
```

### Test Metrics to Track

1. **Code Coverage:** Track trends over time
2. **Test Execution Time:** Monitor for slowdowns
3. **Flaky Tests:** Identify and fix unreliable tests
4. **Bug Escape Rate:** Tests that didn't catch bugs
5. **Mutation Test Score:** Code quality indicator

### Continuous Improvement

- Review test failures weekly
- Update test data sets monthly
- Refactor slow tests quarterly
- Audit test coverage gaps monthly
- Update this strategy document as features evolve

---

## Conclusion

This testing strategy ensures the Finance Tracker maintains:

✅ **Data Accuracy:** Comprehensive validation and calculation tests
✅ **Security:** Authentication, authorization, and data protection
✅ **Reliability:** Edge case handling and error recovery
✅ **Performance:** Benchmarked response times
✅ **Usability:** Accessibility and responsive design

**Next Steps:**
1. Set up testing infrastructure (Jest, Playwright, MSW)
2. Implement unit tests for core utilities
3. Add integration tests for API routes
4. Create E2E tests for critical paths
5. Establish CI/CD pipeline with automated testing

---

**Document Version:** 1.0
**Last Updated:** 2026-01-26
**Maintained By:** Tester Agent (Hive Mind Swarm)
