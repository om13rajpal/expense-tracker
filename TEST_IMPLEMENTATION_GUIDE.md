# Test Implementation Guide

Quick reference for implementing tests in the Finance Tracker project.

---

## Project Structure

```
finance/
├── __tests__/
│   ├── components/
│   │   ├── login-form.test.tsx
│   │   ├── chart-area-interactive.test.tsx
│   │   ├── data-table.test.tsx
│   │   └── section-cards.test.tsx
│   ├── lib/
│   │   ├── analytics.test.ts
│   │   ├── validators.test.ts
│   │   ├── parsers.test.ts
│   │   └── sheets-sync.test.ts
│   ├── integration/
│   │   ├── auth-flow.test.tsx
│   │   ├── dashboard-data.test.tsx
│   │   └── sheets-integration.test.tsx
│   └── __fixtures__/
│       ├── transactions.ts
│       ├── analytics.ts
│       └── mock-data.ts
├── e2e/
│   ├── auth.spec.ts
│   ├── dashboard.spec.ts
│   └── sync.spec.ts
└── jest.config.js
```

---

## Quick Start Templates

### 1. Component Test Template

```typescript
// __tests__/components/example.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { ExampleComponent } from '@/components/example'

describe('ExampleComponent', () => {
  // Test data setup
  const mockProps = {
    data: [],
    onAction: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(<ExampleComponent {...mockProps} />)
      expect(screen.getByRole('main')).toBeInTheDocument()
    })

    it('should display correct content', () => {
      render(<ExampleComponent {...mockProps} />)
      expect(screen.getByText(/expected text/i)).toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('should handle button click', async () => {
      const user = userEvent.setup()
      render(<ExampleComponent {...mockProps} />)

      const button = screen.getByRole('button', { name: /click me/i })
      await user.click(button)

      expect(mockProps.onAction).toHaveBeenCalledTimes(1)
    })
  })

  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<ExampleComponent {...mockProps} />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })
})
```

### 2. Utility Function Test Template

```typescript
// __tests__/lib/example.test.ts
import { exampleFunction } from '@/lib/example'

describe('exampleFunction', () => {
  describe('Valid Inputs', () => {
    it('should handle valid input', () => {
      const result = exampleFunction('valid')
      expect(result).toBe('expected')
    })

    it('should handle edge case', () => {
      const result = exampleFunction('')
      expect(result).toBe('')
    })
  })

  describe('Invalid Inputs', () => {
    it('should throw on invalid input', () => {
      expect(() => exampleFunction(null)).toThrow()
    })
  })

  describe('Edge Cases', () => {
    it('should handle large inputs', () => {
      const largeInput = 'x'.repeat(10000)
      expect(() => exampleFunction(largeInput)).not.toThrow()
    })
  })
})
```

### 3. E2E Test Template

```typescript
// e2e/example.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Example Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should complete user journey', async ({ page }) => {
    // Navigate
    await page.click('text=Login')

    // Fill form
    await page.fill('input[type="email"]', 'user@example.com')

    // Submit
    await page.click('button[type="submit"]')

    // Verify outcome
    await expect(page).toHaveURL(/dashboard/)
    await expect(page.locator('h1')).toContainText('Dashboard')
  })
})
```

---

## Implementation Priority

### Phase 1: Foundation (Week 1)
1. Set up testing infrastructure
2. Create test fixtures and mock data
3. Implement utility function tests
4. Data parser and validator tests

**Files to create:**
- `jest.config.js`
- `jest.setup.ts`
- `__tests__/__fixtures__/transactions.ts`
- `__tests__/lib/validators.test.ts`
- `__tests__/lib/parsers.test.ts`

### Phase 2: Core Features (Week 2)
1. Authentication component tests
2. Analytics calculation tests
3. Data table component tests
4. Chart component tests

**Files to create:**
- `__tests__/components/login-form.test.tsx`
- `__tests__/lib/analytics.test.ts`
- `__tests__/components/data-table.test.tsx`
- `__tests__/components/chart-area-interactive.test.tsx`

### Phase 3: Integration (Week 3)
1. Google Sheets integration tests
2. Authentication flow tests
3. Dashboard integration tests

**Files to create:**
- `__tests__/integration/sheets-integration.test.tsx`
- `__tests__/integration/auth-flow.test.tsx`
- `__tests__/integration/dashboard-data.test.tsx`

### Phase 4: E2E (Week 4)
1. Critical user journey tests
2. Cross-browser tests
3. Mobile responsive tests

**Files to create:**
- `e2e/auth.spec.ts`
- `e2e/dashboard.spec.ts`
- `e2e/sync.spec.ts`
- `playwright.config.ts`

---

## Common Test Patterns

### Testing Async Operations

```typescript
it('should handle async operation', async () => {
  const result = await asyncFunction()
  expect(result).toBeDefined()
})

it('should handle loading state', async () => {
  render(<AsyncComponent />)

  // Check loading state
  expect(screen.getByText(/loading/i)).toBeInTheDocument()

  // Wait for data to load
  await waitFor(() => {
    expect(screen.getByText(/data loaded/i)).toBeInTheDocument()
  })
})
```

### Testing Error States

```typescript
it('should display error message on failure', async () => {
  // Mock API failure
  jest.spyOn(api, 'fetchData').mockRejectedValueOnce(new Error('Failed'))

  render(<Component />)

  await waitFor(() => {
    expect(screen.getByText(/error/i)).toBeInTheDocument()
  })
})
```

### Testing Forms

```typescript
it('should submit form with valid data', async () => {
  const user = userEvent.setup()
  const onSubmit = jest.fn()

  render(<Form onSubmit={onSubmit} />)

  await user.type(screen.getByLabelText(/email/i), 'test@example.com')
  await user.click(screen.getByRole('button', { name: /submit/i }))

  expect(onSubmit).toHaveBeenCalledWith({
    email: 'test@example.com'
  })
})
```

### Testing Conditional Rendering

```typescript
it('should show content when data exists', () => {
  render(<Component data={mockData} />)
  expect(screen.getByText(/content/i)).toBeInTheDocument()
})

it('should show empty state when no data', () => {
  render(<Component data={[]} />)
  expect(screen.getByText(/no data/i)).toBeInTheDocument()
})
```

---

## Mock Data Examples

### Mock Transactions

```typescript
// __tests__/__fixtures__/transactions.ts
import { Transaction, TransactionType, TransactionCategory } from '@/lib/types'

export const mockTransaction: Transaction = {
  id: '1',
  date: new Date('2024-01-15'),
  description: 'Test Transaction',
  merchant: 'Test Store',
  category: TransactionCategory.GROCERIES,
  amount: -50.00,
  type: TransactionType.EXPENSE,
  paymentMethod: 'Credit Card',
  account: 'Main Account',
  status: 'completed',
  tags: ['test'],
  recurring: false
}

export const mockTransactions: Transaction[] = [
  mockTransaction,
  {
    ...mockTransaction,
    id: '2',
    amount: 2000.00,
    type: TransactionType.INCOME,
    category: TransactionCategory.SALARY
  }
]

export const generateMockTransactions = (count: number): Transaction[] => {
  return Array.from({ length: count }, (_, i) => ({
    ...mockTransaction,
    id: `${i + 1}`,
    date: new Date(2024, 0, i + 1)
  }))
}
```

### Mock API Responses

```typescript
// __tests__/__fixtures__/api-responses.ts

export const mockSheetsResponse = {
  data: {
    values: [
      ['Date', 'Description', 'Merchant', 'Category', 'Amount'],
      ['2024-01-15', 'Groceries', 'Walmart', 'Food', '-50.00'],
      ['2024-01-16', 'Salary', 'Company', 'Income', '2000.00']
    ]
  }
}

export const mockAuthResponse = {
  user: {
    id: '123',
    email: 'test@example.com',
    name: 'Test User'
  },
  token: 'mock-jwt-token'
}
```

---

## MSW Setup for API Mocking

```typescript
// __tests__/mocks/handlers.ts
import { http, HttpResponse } from 'msw'

export const handlers = [
  // Mock Google Sheets API
  http.get('https://sheets.googleapis.com/v4/spreadsheets/:id', () => {
    return HttpResponse.json({
      values: [
        ['Date', 'Description', 'Amount'],
        ['2024-01-15', 'Test', '-50.00']
      ]
    })
  }),

  // Mock authentication
  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json()

    if (body.email === 'test@example.com') {
      return HttpResponse.json({
        token: 'mock-token',
        user: { id: '1', email: body.email }
      })
    }

    return new HttpResponse(null, { status: 401 })
  })
]

// __tests__/mocks/server.ts
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)

// jest.setup.ts
import { server } from './__tests__/mocks/server'

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

---

## Coverage Reporting

### Generate Coverage Report

```bash
npm test -- --coverage
```

### View HTML Report

```bash
npm test -- --coverage --coverageReporters=html
open coverage/index.html
```

### Coverage Badges

Add to README.md:

```markdown
![Coverage](https://img.shields.io/badge/coverage-85%25-brightgreen)
```

---

## Debugging Tests

### Run Single Test

```bash
npm test -- login-form.test.tsx
```

### Run Tests in Watch Mode

```bash
npm test -- --watch
```

### Debug with Chrome DevTools

```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

Then open `chrome://inspect` in Chrome.

### Visual Debugging with Playwright

```bash
npx playwright test --debug
```

---

## Common Issues & Solutions

### Issue: Tests timeout

```typescript
// Increase timeout for slow operations
it('should handle slow operation', async () => {
  jest.setTimeout(10000) // 10 seconds

  await slowOperation()
}, 10000)
```

### Issue: Async state updates

```typescript
// Use waitFor to handle async updates
await waitFor(() => {
  expect(screen.getByText(/updated/i)).toBeInTheDocument()
})
```

### Issue: Mock not working

```typescript
// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks()
})

// Or restore original implementation
afterEach(() => {
  jest.restoreAllMocks()
})
```

---

## Best Practices Checklist

- [ ] One assertion per test (when possible)
- [ ] Descriptive test names (should...)
- [ ] Arrange-Act-Assert pattern
- [ ] Clean up after tests (beforeEach/afterEach)
- [ ] Mock external dependencies
- [ ] Test user behavior, not implementation
- [ ] Use accessibility queries (getByRole)
- [ ] Avoid testing library internals
- [ ] Keep tests DRY with helper functions
- [ ] Test edge cases and error states

---

## Resources

- [Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest Docs](https://jestjs.io/docs/getting-started)
- [Playwright Docs](https://playwright.dev/)
- [MSW Docs](https://mswjs.io/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

**Happy Testing!** 🧪
