# Code Quality Standards - Finance Tracker

## TypeScript Standards

### Type Safety Requirements

1. **Strict Mode**: Always enabled
   ```json
   // tsconfig.json
   {
     "compilerOptions": {
       "strict": true,
       "noUncheckedIndexedAccess": true,
       "noImplicitReturns": true
     }
   }
   ```

2. **No `any` Types**: Use proper typing or `unknown`
   ```typescript
   // ❌ Bad
   function process(data: any) { }

   // ✅ Good
   function process<T>(data: T): ProcessedData { }
   ```

3. **Interface Definitions**: All data structures must have interfaces
   ```typescript
   // ✅ Required for all API responses
   interface ApiResponse<T> {
     success: boolean;
     data?: T;
     error?: string;
   }
   ```

4. **Enum Usage**: For fixed sets of values
   ```typescript
   // ✅ Good
   enum TransactionType {
     INCOME = 'income',
     EXPENSE = 'expense'
   }
   ```

### Type Annotations

```typescript
// ✅ All function parameters and returns must be typed
export function calculateTotal(
  transactions: Transaction[]
): number {
  return transactions.reduce((sum, t) => sum + t.amount, 0);
}

// ✅ React component props
interface Props {
  title: string;
  optional?: number;
}

export function Component({ title, optional = 0 }: Props) {
  return <div>{title}</div>;
}
```

---

## Error Handling Standards

### 1. API Error Handling

```typescript
// ✅ Standard API error response
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Validate input
    const validation = schema.safeParse(data);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error },
        { status: 400 }
      );
    }

    // Process request
    const result = await processData(validation.data);

    return NextResponse.json({ success: true, data: result });

  } catch (error) {
    console.error('API Error:', error);

    // Never expose internal errors to client
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 2. React Error Boundaries

```typescript
// ✅ Required for all dashboard sections
<ErrorBoundary fallback={<ErrorFallback />}>
  <DataTable data={data} />
</ErrorBoundary>
```

### 3. Async Error Handling

```typescript
// ✅ Always use try-catch with async/await
async function fetchData() {
  try {
    const response = await fetch('/api/data');

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();

  } catch (error) {
    console.error('Fetch failed:', error);
    toast.error('Failed to load data');
    return null;
  }
}
```

### 4. User-Friendly Error Messages

```typescript
// ❌ Bad - Technical jargon
throw new Error('ERR_CONNECTION_REFUSED');

// ✅ Good - User-friendly
throw new Error('Unable to connect. Please check your internet connection.');
```

---

## Accessibility Standards (WCAG 2.1 AA)

### 1. Semantic HTML

```typescript
// ✅ Use proper semantic elements
<form onSubmit={handleSubmit}>
  <label htmlFor="email">Email Address</label>
  <input id="email" type="email" required />
  <button type="submit">Submit</button>
</form>

// ❌ Avoid div soup
<div onClick={handleClick}>
  <div>Email</div>
  <div contentEditable />
</div>
```

### 2. ARIA Labels

```typescript
// ✅ Screen reader support
<Button aria-label="Close modal">
  <X className="size-4" />
</Button>

// ✅ Hidden text for icons
<IconTrash className="size-4" />
<span className="sr-only">Delete item</span>
```

### 3. Keyboard Navigation

```typescript
// ✅ All interactive elements must be keyboard accessible
<div
  role="button"
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
  onClick={handleClick}
>
  Click me
</div>
```

### 4. Color Contrast

- Text: Minimum 4.5:1 contrast ratio
- Large text: Minimum 3:1 contrast ratio
- Interactive elements: Clear focus indicators

### 5. Form Validation

```typescript
// ✅ Client-side validation with error messages
<Field>
  <FieldLabel htmlFor="amount">Amount</FieldLabel>
  <Input
    id="amount"
    type="number"
    min="0"
    step="0.01"
    required
    aria-invalid={!!error}
    aria-describedby={error ? "amount-error" : undefined}
  />
  {error && (
    <FieldError id="amount-error">{error}</FieldError>
  )}
</Field>
```

---

## Security Standards

### 1. Authentication

```typescript
// ✅ Required security measures
- Password hashing (bcrypt, min 10 rounds)
- JWT with secure secrets (min 32 chars)
- HTTP-only cookies for tokens
- CSRF protection
- Rate limiting (max 5 login attempts/min)
- Account lockout after failures
```

### 2. Input Validation

```typescript
// ✅ Always validate on server-side
import { z } from 'zod';

const transactionSchema = z.object({
  amount: z.number().positive(),
  category: z.nativeEnum(TransactionCategory),
  date: z.string().datetime(),
  description: z.string().min(1).max(500),
});

// Validate all user input
const result = transactionSchema.safeParse(input);
if (!result.success) {
  throw new ValidationError(result.error);
}
```

### 3. Environment Variables

```typescript
// ✅ Never commit secrets
// .env.local (gitignored)
JWT_SECRET=your-secret-here
DATABASE_URL=postgresql://...

// ✅ Validate required vars at startup
function validateEnv() {
  const required = ['JWT_SECRET', 'DATABASE_URL'];
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required env var: ${key}`);
    }
  }
}
```

### 4. SQL Injection Prevention

```typescript
// ❌ Never concatenate SQL
const query = `SELECT * FROM users WHERE id = ${userId}`;

// ✅ Use parameterized queries
const query = 'SELECT * FROM users WHERE id = ?';
db.query(query, [userId]);
```

### 5. XSS Prevention

```typescript
// ✅ React escapes by default (safe)
<div>{userInput}</div>

// ❌ Dangerous - avoid dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ If HTML required, sanitize first
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{
  __html: DOMPurify.sanitize(userInput)
}} />
```

### 6. Security Headers

```typescript
// next.config.ts
async headers() {
  return [{
    source: '/(.*)',
    headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-XSS-Protection', value: '1; mode=block' },
      {
        key: 'Content-Security-Policy',
        value: "default-src 'self'; script-src 'self' 'unsafe-eval'"
      },
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains'
      }
    ]
  }];
}
```

---

## Performance Standards

### 1. Component Optimization

```typescript
// ✅ Memoize expensive computations
const filteredData = useMemo(
  () => data.filter(item => item.active),
  [data]
);

// ✅ Memoize callbacks
const handleClick = useCallback(
  () => processData(id),
  [id]
);

// ✅ Memoize components
const MemoizedChart = memo(Chart);
```

### 2. Code Splitting

```typescript
// ✅ Lazy load heavy components
import { lazy, Suspense } from 'react';

const DataTable = lazy(() => import('@/components/data-table'));

export function Dashboard() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <DataTable />
    </Suspense>
  );
}
```

### 3. Image Optimization

```typescript
// ✅ Use Next.js Image component
import Image from 'next/image';

<Image
  src="/avatar.jpg"
  alt="User avatar"
  width={48}
  height={48}
  priority // For above-the-fold images
/>
```

### 4. Bundle Size

- Maximum initial bundle: 200KB (gzipped)
- Maximum route bundle: 100KB (gzipped)
- Use bundle analyzer: `npm run analyze`

### 5. Server vs Client Components

```typescript
// ✅ Server Component (default)
// - Static content
// - Data fetching
// - No interactivity

export default async function Page() {
  const data = await fetchData();
  return <Display data={data} />;
}

// ✅ Client Component ("use client")
// - Interactivity (onClick, onChange)
// - State management (useState, useReducer)
// - Browser APIs (window, localStorage)

'use client';
export function InteractiveForm() {
  const [value, setValue] = useState('');
  return <input value={value} onChange={e => setValue(e.target.value)} />;
}
```

---

## Testing Standards

### 1. Unit Tests

```typescript
// ✅ Test all utility functions
import { describe, it, expect } from '@jest/globals';
import { categorizeTransaction } from './categorizer';

describe('categorizeTransaction', () => {
  it('should categorize food transactions', () => {
    const result = categorizeTransaction('Swiggy', 'Order #123');
    expect(result).toBe(TransactionCategory.DINING);
  });

  it('should return UNCATEGORIZED for unknown merchants', () => {
    const result = categorizeTransaction('Unknown', 'Test');
    expect(result).toBe(TransactionCategory.UNCATEGORIZED);
  });
});
```

### 2. Integration Tests

```typescript
// ✅ Test API routes
import { POST } from './route';
import { NextRequest } from 'next/server';

describe('/api/auth/login', () => {
  it('should return 401 for invalid credentials', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'test', password: 'wrong' })
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });
});
```

### 3. Component Tests

```typescript
// ✅ Test React components
import { render, screen, fireEvent } from '@testing-library/react';
import { LoginForm } from './login-form';

describe('LoginForm', () => {
  it('should submit form with email', async () => {
    const onSubmit = jest.fn();
    render(<LoginForm onSubmit={onSubmit} />);

    const input = screen.getByLabelText('Email');
    fireEvent.change(input, { target: { value: 'test@example.com' } });

    const button = screen.getByRole('button', { name: /login/i });
    fireEvent.click(button);

    expect(onSubmit).toHaveBeenCalledWith({ email: 'test@example.com' });
  });
});
```

### 4. Coverage Requirements

- Minimum overall: 80%
- Critical paths (auth, payment): 95%
- Utility functions: 100%

---

## Code Style Standards

### 1. File Naming

```
components/
  ui/
    button.tsx          # Lowercase for UI primitives
  LoginForm.tsx         # PascalCase for components
  data-table.tsx        # Kebab-case for multi-word

lib/
  auth.ts              # Lowercase for utilities
  categorizer.ts       # Lowercase for utilities

app/
  dashboard/
    page.tsx           # Next.js convention
    loading.tsx        # Next.js convention
```

### 2. Import Order

```typescript
// 1. React imports
import React, { useState } from 'react';

// 2. Next.js imports
import Image from 'next/image';
import Link from 'next/link';

// 3. Third-party libraries
import { z } from 'zod';
import { toast } from 'sonner';

// 4. Internal utilities
import { cn } from '@/lib/utils';
import { categorizeTransaction } from '@/lib/categorizer';

// 5. Internal components
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// 6. Types
import type { Transaction } from '@/lib/types';
```

### 3. Component Structure

```typescript
// ✅ Standard component structure
'use client';

import React from 'react';
import type { ComponentProps } from './types';

// 1. Types/Interfaces
interface Props {
  title: string;
}

// 2. Constants
const DEFAULT_TIMEOUT = 3000;

// 3. Helper functions
function formatTitle(title: string): string {
  return title.toUpperCase();
}

// 4. Main component
export function Component({ title }: Props) {
  // 4a. Hooks
  const [isOpen, setIsOpen] = useState(false);

  // 4b. Derived state
  const formattedTitle = formatTitle(title);

  // 4c. Event handlers
  const handleClick = () => setIsOpen(true);

  // 4d. Effects
  useEffect(() => {
    // ...
  }, []);

  // 4e. Render
  return (
    <div onClick={handleClick}>
      {formattedTitle}
    </div>
  );
}
```

### 4. Comments

```typescript
// ✅ JSDoc for functions
/**
 * Calculates the total amount of all transactions
 * @param transactions - Array of transaction objects
 * @returns Total amount in rupees
 */
export function calculateTotal(transactions: Transaction[]): number {
  return transactions.reduce((sum, t) => sum + t.amount, 0);
}

// ✅ Explain complex logic
// Sort by date descending, then by amount ascending
transactions.sort((a, b) => {
  const dateDiff = b.date.getTime() - a.date.getTime();
  return dateDiff !== 0 ? dateDiff : a.amount - b.amount;
});

// ❌ Don't state the obvious
// Set the value to true
setValue(true);
```

---

## Git Standards

### 1. Commit Messages

```
Format: <type>(<scope>): <subject>

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation
- style: Formatting
- refactor: Code restructuring
- test: Adding tests
- chore: Maintenance

Examples:
✅ feat(auth): implement JWT token refresh
✅ fix(table): resolve drag-and-drop sorting bug
✅ docs(api): add authentication endpoint docs
```

### 2. Branch Naming

```
<type>/<description>

Examples:
✅ feature/google-sheets-sync
✅ fix/login-validation-error
✅ refactor/auth-module
```

### 3. Pull Request Template

```markdown
## Description
Brief description of changes

## Changes
- Added X feature
- Fixed Y bug
- Refactored Z component

## Testing
- [ ] Unit tests added
- [ ] Integration tests pass
- [ ] Manual testing completed

## Screenshots (if applicable)

## Checklist
- [ ] Code follows style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No console.logs or debugger statements
- [ ] Environment variables documented
```

---

## Documentation Standards

### 1. README.md

Required sections:
- Project overview
- Installation steps
- Environment variables
- Development workflow
- Testing instructions
- Deployment guide

### 2. API Documentation

```typescript
/**
 * POST /api/auth/login
 *
 * Authenticates user and returns JWT token
 *
 * @body {object} credentials
 * @body {string} credentials.username - User's username
 * @body {string} credentials.password - User's password (min 8 chars)
 *
 * @returns {object} response
 * @returns {boolean} response.success - Authentication status
 * @returns {string} [response.token] - JWT token if successful
 * @returns {string} [response.error] - Error message if failed
 *
 * @throws {400} Invalid request body
 * @throws {401} Invalid credentials
 * @throws {429} Too many requests
 * @throws {500} Server error
 *
 * @example
 * fetch('/api/auth/login', {
 *   method: 'POST',
 *   body: JSON.stringify({ username: 'user', password: 'pass123' })
 * })
 */
```

### 3. Component Documentation

```typescript
/**
 * DataTable - Sortable, filterable table component
 *
 * Features:
 * - Drag & drop row reordering
 * - Column visibility toggle
 * - Pagination
 * - Row selection
 *
 * @param {Transaction[]} data - Array of transactions to display
 * @param {function} [onRowClick] - Callback when row is clicked
 * @param {number} [pageSize=10] - Number of rows per page
 *
 * @example
 * <DataTable
 *   data={transactions}
 *   onRowClick={(row) => console.log(row)}
 *   pageSize={20}
 * />
 */
```

---

## Deployment Checklist

### Pre-Production

- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Environment variables configured
- [ ] Security audit completed
- [ ] Performance benchmarks met
- [ ] Accessibility audit passed
- [ ] Database migrations ready
- [ ] Backup strategy implemented
- [ ] Monitoring configured

### Production

- [ ] HTTPS enabled
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Error logging active
- [ ] Analytics tracking setup
- [ ] CDN configured
- [ ] Database backups automated
- [ ] Rollback plan documented

---

*These standards are enforced through automated checks (ESLint, TypeScript, tests) and code review.*
