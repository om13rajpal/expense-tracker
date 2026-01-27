# Manual Testing Checklist - Finance Tracker

**Project:** Finance Tracker with Google Sheets Integration
**Version:** 1.0
**Last Updated:** 2026-01-26

---

## Pre-Testing Setup

### Required Test Accounts

- [ ] Google account with test spreadsheet configured
- [ ] Apple ID for OAuth testing (optional)
- [ ] Test spreadsheet with sample financial data (16 columns)

### Test Environment

- [ ] Development environment running (`npm run dev`)
- [ ] Network throttling tools ready (DevTools)
- [ ] Browser DevTools console open
- [ ] Screen recording software ready (for bug reports)

### Test Data

- [ ] Spreadsheet with 50+ transactions
- [ ] Spreadsheet with 0 transactions (empty state)
- [ ] Spreadsheet with malformed data (missing fields)
- [ ] Spreadsheet with special characters/unicode

---

## 1. Authentication Testing

### 1.1 Login Page (D:\om\finance\app\login\page.tsx)

#### Email Login

| Test Case | Steps | Expected Result | Status | Notes |
|-----------|-------|-----------------|--------|-------|
| **Valid email submission** | 1. Navigate to /login<br>2. Enter valid email<br>3. Click Login | Form submits, no errors | ⬜ |  |
| **Empty email** | 1. Click Login without entering email | HTML5 validation error | ⬜ |  |
| **Invalid email format** | 1. Enter "notanemail"<br>2. Try to submit | HTML5 validation error | ⬜ |  |
| **Email with spaces** | 1. Enter " user@test.com "<br>2. Submit | Spaces trimmed, accepts | ⬜ |  |
| **Very long email** | 1. Enter 300+ char email<br>2. Submit | Validation error or truncate | ⬜ |  |
| **SQL injection attempt** | 1. Enter "admin'--@test.com"<br>2. Submit | Sanitized, no security issue | ⬜ |  |
| **XSS attempt** | 1. Enter "<script>alert(1)</script>@test.com"<br>2. Submit | Sanitized, no script execution | ⬜ |  |

#### OAuth Login

| Test Case | Steps | Expected Result | Status | Notes |
|-----------|-------|-----------------|--------|-------|
| **Google OAuth button** | 1. Click "Continue with Google" | Opens Google OAuth popup/redirect | ⬜ |  |
| **Google OAuth success** | 1. Complete Google OAuth<br>2. Grant permissions | Redirects to dashboard with session | ⬜ |  |
| **Google OAuth cancel** | 1. Start OAuth<br>2. Click cancel | Returns to login, shows message | ⬜ |  |
| **Google OAuth error** | 1. Simulate OAuth error | Error message displayed | ⬜ |  |
| **Apple OAuth button** | 1. Click "Continue with Apple" | Opens Apple OAuth | ⬜ |  |
| **Apple OAuth success** | 1. Complete Apple OAuth | Redirects to dashboard | ⬜ |  |

#### Session Management

| Test Case | Steps | Expected Result | Status | Notes |
|-----------|-------|-----------------|--------|-------|
| **Session persistence** | 1. Login<br>2. Refresh page | Still logged in | ⬜ |  |
| **Logout** | 1. Login<br>2. Click logout | Redirects to login, session cleared | ⬜ |  |
| **Session expiry** | 1. Login<br>2. Wait for timeout<br>3. Try to navigate | Redirects to login | ⬜ |  |
| **Prevent double login** | 1. Already logged in<br>2. Navigate to /login | Redirects to dashboard | ⬜ |  |

#### UI/UX

| Test Case | Steps | Expected Result | Status | Notes |
|-----------|-------|-----------------|--------|-------|
| **Logo displayed** | 1. Load /login page | Logo/icon visible | ⬜ |  |
| **Welcome message** | 1. Load page | "Welcome to Acme Inc." visible | ⬜ |  |
| **Sign up link** | 1. Check "Don't have an account?" | Link present (even if inactive) | ⬜ |  |
| **Terms/Privacy links** | 1. Scroll to bottom | Links visible and functional | ⬜ |  |
| **Button hover states** | 1. Hover over buttons | Visual feedback | ⬜ |  |
| **Focus indicators** | 1. Tab through form | Visible focus rings | ⬜ |  |

---

## 2. Dashboard Testing

### 2.1 Initial Load (D:\om\finance\app\dashboard\page.tsx)

| Test Case | Steps | Expected Result | Status | Notes |
|-----------|-------|-----------------|--------|-------|
| **Dashboard loads** | 1. Login<br>2. Navigate to /dashboard | Page renders without errors | ⬜ |  |
| **Sidebar visible** | 1. Check left sidebar | AppSidebar component visible | ⬜ |  |
| **Header visible** | 1. Check top header | SiteHeader component visible | ⬜ |  |
| **All sections load** | 1. Scroll through page | Cards, charts, table all render | ⬜ |  |

### 2.2 Metric Cards (D:\om\finance\components\section-cards.tsx)

| Test Case | Steps | Expected Result | Status | Notes |
|-----------|-------|-----------------|--------|-------|
| **Total Revenue card** | 1. Check first card | Shows amount, trend, icon | ⬜ |  |
| **New Customers card** | 1. Check second card | Shows count, trend | ⬜ |  |
| **Active Accounts card** | 1. Check third card | Shows count, percentage | ⬜ |  |
| **Growth Rate card** | 1. Check fourth card | Shows percentage | ⬜ |  |
| **Responsive layout** | 1. Resize window<br>2. Check mobile | Cards stack vertically on mobile | ⬜ |  |
| **Trend icons** | 1. Check all cards | Up/down arrows match data | ⬜ |  |

### 2.3 Charts (D:\om\finance\components\chart-area-interactive.tsx)

| Test Case | Steps | Expected Result | Status | Notes |
|-----------|-------|-----------------|--------|-------|
| **Chart renders** | 1. Scroll to chart section | Area chart visible | ⬜ |  |
| **Time range toggle** | 1. Click "Last 30 days"<br>2. Observe chart | Data filters to 30 days | ⬜ |  |
| **90 days filter** | 1. Click "Last 3 months" | Shows 90 days of data | ⬜ |  |
| **7 days filter** | 1. Click "Last 7 days" | Shows 7 days of data | ⬜ |  |
| **Mobile dropdown** | 1. Resize to mobile<br>2. Use dropdown | Dropdown replaces toggles | ⬜ |  |
| **Tooltip hover** | 1. Hover over chart | Tooltip shows date and values | ⬜ |  |
| **Date formatting** | 1. Check tooltip dates | Format: "Jan 15" | ⬜ |  |
| **Chart animation** | 1. Switch time ranges | Smooth transition | ⬜ |  |
| **Empty data** | 1. Test with no data | Shows empty state or message | ⬜ |  |

### 2.4 Data Table (D:\om\finance\components\data-table.tsx)

| Test Case | Steps | Expected Result | Status | Notes |
|-----------|-------|-----------------|--------|-------|
| **Table renders** | 1. Scroll to table | All rows and columns visible | ⬜ |  |
| **Header row** | 1. Check table header | Column names displayed | ⬜ |  |
| **Pagination controls** | 1. Check bottom of table | Page numbers, prev/next buttons | ⬜ |  |
| **Row selection** | 1. Click checkbox on row | Row highlights, count updates | ⬜ |  |
| **Select all** | 1. Click header checkbox | All visible rows selected | ⬜ |  |
| **Deselect all** | 1. Click header checkbox again | All rows deselected | ⬜ |  |
| **Customize columns** | 1. Click "Customize Columns"<br>2. Toggle column off | Column hides | ⬜ |  |
| **Show hidden column** | 1. Toggle column back on | Column reappears | ⬜ |  |
| **Drag row** | 1. Drag grip icon<br>2. Move row | Row reorders | ⬜ |  |
| **Edit target** | 1. Click target field<br>2. Change value<br>3. Press Enter | Shows toast "Saving..." | ⬜ |  |
| **Edit limit** | 1. Click limit field<br>2. Change value | Shows toast notification | ⬜ |  |
| **Assign reviewer** | 1. Click "Assign reviewer"<br>2. Select from dropdown | Reviewer name displays | ⬜ |  |
| **Row actions menu** | 1. Click 3-dot menu<br>2. Check options | Edit, Copy, Favorite, Delete options | ⬜ |  |
| **Pagination - next** | 1. Click next page button | Shows next 10 rows | ⬜ |  |
| **Pagination - prev** | 1. Click previous button | Shows previous 10 rows | ⬜ |  |
| **Pagination - first** | 1. Click "first page" icon | Jumps to page 1 | ⬜ |  |
| **Pagination - last** | 1. Click "last page" icon | Jumps to last page | ⬜ |  |
| **Change page size** | 1. Select "20" from dropdown | Shows 20 rows per page | ⬜ |  |
| **Tab navigation** | 1. Click tabs: Outline, Past Performance, etc. | Tab content switches | ⬜ |  |
| **Empty table state** | 1. Test with no data | "No results." message | ⬜ |  |

### 2.5 Drawer/Modal (TableCellViewer)

| Test Case | Steps | Expected Result | Status | Notes |
|-----------|-------|-----------------|--------|-------|
| **Open drawer** | 1. Click transaction header link | Drawer slides in from right | ⬜ |  |
| **Mobile drawer** | 1. Test on mobile<br>2. Click header | Drawer slides from bottom | ⬜ |  |
| **Chart in drawer** | 1. Open drawer on desktop | Mini chart displays | ⬜ |  |
| **No chart on mobile** | 1. Open drawer on mobile | Chart hidden, form shows | ⬜ |  |
| **Edit form fields** | 1. Change header, type, status, etc. | All fields editable | ⬜ |  |
| **Submit button** | 1. Click "Submit" | Action triggered (or toast) | ⬜ |  |
| **Done button** | 1. Click "Done" | Drawer closes | ⬜ |  |
| **Click outside** | 1. Click outside drawer | Drawer closes | ⬜ |  |
| **Escape key** | 1. Press Escape | Drawer closes | ⬜ |  |

---

## 3. Google Sheets Integration Testing

### 3.1 Initial Sync

| Test Case | Steps | Expected Result | Status | Notes |
|-----------|-------|-----------------|--------|-------|
| **Connect Google Sheets** | 1. Click "Sync" or "Connect"<br>2. Authorize Google | OAuth flow completes | ⬜ |  |
| **Fetch transactions** | 1. After authorization<br>2. Wait for sync | Transactions appear in table | ⬜ |  |
| **Loading indicator** | 1. During sync | Spinner/skeleton shows | ⬜ |  |
| **Success notification** | 1. After sync completes | Toast: "Synced X transactions" | ⬜ |  |

### 3.2 Data Accuracy

| Test Case | Steps | Expected Result | Status | Notes |
|-----------|-------|-----------------|--------|-------|
| **Date parsing** | 1. Check dates in table<br>2. Compare to sheet | Dates match exactly | ⬜ |  |
| **Amount parsing** | 1. Check amounts<br>2. Compare to sheet | Amounts match (decimals correct) | ⬜ |  |
| **Category mapping** | 1. Check categories<br>2. Verify correct mapping | Categories mapped correctly | ⬜ |  |
| **Merchant names** | 1. Check merchant field | Names match sheet exactly | ⬜ |  |
| **Payment methods** | 1. Check payment types | Correctly parsed | ⬜ |  |

### 3.3 Analytics Accuracy

| Test Case | Steps | Expected Result | Status | Notes |
|-----------|-------|-----------------|--------|-------|
| **Total income** | 1. Sum all income in sheet<br>2. Check dashboard card | Totals match | ⬜ |  |
| **Total expenses** | 1. Sum all expenses<br>2. Check dashboard | Totals match | ⬜ |  |
| **Net savings** | 1. Calculate income - expenses<br>2. Check card | Calculation correct | ⬜ |  |
| **Savings rate %** | 1. Calculate manually<br>2. Compare | Percentage correct | ⬜ |  |
| **Category breakdown** | 1. Check chart<br>2. Verify percentages add to 100% | Math correct | ⬜ |  |

### 3.4 Edge Cases

| Test Case | Steps | Expected Result | Status | Notes |
|-----------|-------|-----------------|--------|-------|
| **Empty spreadsheet** | 1. Sync empty sheet | Empty state message | ⬜ |  |
| **Missing columns** | 1. Delete a column in sheet<br>2. Sync | Graceful error or skip | ⬜ |  |
| **Invalid dates** | 1. Add row with "not-a-date"<br>2. Sync | Skips row or shows error | ⬜ |  |
| **Invalid amounts** | 1. Add row with "abc" as amount<br>2. Sync | Skips or treats as 0 | ⬜ |  |
| **Very large dataset** | 1. Sync 1000+ rows | Handles without crash | ⬜ |  |
| **Network interruption** | 1. Start sync<br>2. Disconnect network<br>3. Reconnect | Shows error, allows retry | ⬜ |  |
| **Rate limit** | 1. Trigger multiple rapid syncs | Shows rate limit message | ⬜ |  |

---

## 4. Filtering & Search Testing

### 4.1 Filters (To be implemented)

| Test Case | Steps | Expected Result | Status | Notes |
|-----------|-------|-----------------|--------|-------|
| **Filter by category** | 1. Select "Groceries" filter | Shows only grocery transactions | ⬜ |  |
| **Filter by date range** | 1. Select "Last 30 days" | Shows only recent transactions | ⬜ |  |
| **Filter by payment method** | 1. Select "Credit Card" | Shows only CC transactions | ⬜ |  |
| **Multiple filters** | 1. Apply category + date | Shows intersection of filters | ⬜ |  |
| **Clear filters** | 1. Click "Clear all" | Shows all transactions | ⬜ |  |
| **No results** | 1. Apply impossible filter combo | "No matches" message | ⬜ |  |

### 4.2 Search (To be implemented)

| Test Case | Steps | Expected Result | Status | Notes |
|-----------|-------|-----------------|--------|-------|
| **Search by description** | 1. Type "grocery" in search | Shows matching transactions | ⬜ |  |
| **Search by merchant** | 1. Type "Walmart" | Shows all Walmart transactions | ⬜ |  |
| **Search by amount** | 1. Type "50.00" | Shows exact amount matches | ⬜ |  |
| **Case insensitive** | 1. Type "WALMART" | Shows results (case ignored) | ⬜ |  |
| **Partial match** | 1. Type "wal" | Shows "Walmart" results | ⬜ |  |
| **No results** | 1. Type "zzz" | "No results found" | ⬜ |  |
| **Clear search** | 1. Clear search box | Shows all transactions | ⬜ |  |

---

## 5. Responsive Design Testing

### 5.1 Desktop (1920x1080)

| Test Case | Expected Result | Status | Notes |
|-----------|-----------------|--------|-------|
| **Layout** | All elements properly spaced | ⬜ |  |
| **Sidebar** | Full sidebar visible | ⬜ |  |
| **Charts** | Charts at full width | ⬜ |  |
| **Table** | All columns visible without scroll | ⬜ |  |
| **Cards** | 4 cards in a row | ⬜ |  |

### 5.2 Laptop (1366x768)

| Test Case | Expected Result | Status | Notes |
|-----------|-----------------|--------|-------|
| **Layout** | No horizontal scroll | ⬜ |  |
| **Sidebar** | May collapse or overlay | ⬜ |  |
| **Charts** | Readable and functional | ⬜ |  |
| **Table** | Horizontal scroll if needed | ⬜ |  |

### 5.3 Tablet (768x1024)

| Test Case | Expected Result | Status | Notes |
|-----------|-----------------|--------|-------|
| **Layout** | Cards stack 2x2 | ⬜ |  |
| **Sidebar** | Hamburger menu or drawer | ⬜ |  |
| **Charts** | Full width, readable | ⬜ |  |
| **Table** | Horizontal scroll | ⬜ |  |
| **Touch targets** | At least 44x44px | ⬜ |  |

### 5.4 Mobile (375x667)

| Test Case | Expected Result | Status | Notes |
|-----------|-----------------|--------|-------|
| **Layout** | Cards stack vertically | ⬜ |  |
| **Sidebar** | Hidden, hamburger menu | ⬜ |  |
| **Charts** | Simplified, time range dropdown | ⬜ |  |
| **Table** | Mobile-optimized layout | ⬜ |  |
| **Touch targets** | Large enough for fingers | ⬜ |  |
| **Drawer** | Slides from bottom | ⬜ |  |

---

## 6. Performance Testing

### 6.1 Page Load

| Metric | Target | Actual | Status | Notes |
|--------|--------|--------|--------|-------|
| **Initial load (3G)** | < 3s | | ⬜ |  |
| **Initial load (4G)** | < 2s | | ⬜ |  |
| **Initial load (WiFi)** | < 1s | | ⬜ |  |
| **Time to Interactive** | < 2.5s | | ⬜ |  |
| **Largest Contentful Paint** | < 2.5s | | ⬜ |  |

### 6.2 Runtime Performance

| Operation | Target | Actual | Status | Notes |
|-----------|--------|--------|--------|-------|
| **Chart render** | < 300ms | | ⬜ |  |
| **Table filter** | < 200ms | | ⬜ |  |
| **Pagination** | < 100ms | | ⬜ |  |
| **Drawer open** | < 200ms | | ⬜ |  |
| **Sync 100 rows** | < 3s | | ⬜ |  |

### 6.3 Bundle Size

| Metric | Target | Actual | Status | Notes |
|--------|--------|--------|--------|-------|
| **Total JS (gzipped)** | < 500KB | | ⬜ |  |
| **Total CSS (gzipped)** | < 50KB | | ⬜ |  |
| **First Chunk** | < 200KB | | ⬜ |  |

---

## 7. Accessibility Testing

### 7.1 Keyboard Navigation

| Test Case | Steps | Expected Result | Status | Notes |
|-----------|-------|-----------------|--------|-------|
| **Tab order** | 1. Tab through page | Logical flow | ⬜ |  |
| **Focus indicators** | 1. Tab to elements | Visible focus rings | ⬜ |  |
| **Skip to content** | 1. Tab from top | Skip link available | ⬜ |  |
| **Table navigation** | 1. Arrow keys in table | Navigate cells | ⬜ |  |
| **Dropdown menus** | 1. Use keyboard only | Can open and select | ⬜ |  |
| **Modal/drawer** | 1. Open with keyboard<br>2. Close with Escape | Works as expected | ⬜ |  |

### 7.2 Screen Reader (NVDA/JAWS)

| Test Case | Expected Result | Status | Notes |
|-----------|-----------------|--------|-------|
| **Page title** | Announces page name | ⬜ |  |
| **Headings** | Proper heading hierarchy | ⬜ |  |
| **Links** | Announces link text | ⬜ |  |
| **Buttons** | Announces "button" + label | ⬜ |  |
| **Form labels** | Associates labels with inputs | ⬜ |  |
| **Images** | Alt text announced | ⬜ |  |
| **Tables** | Announces headers properly | ⬜ |  |
| **Live regions** | Announces updates | ⬜ |  |

### 7.3 WCAG Compliance

| Criterion | Requirement | Status | Notes |
|-----------|-------------|--------|-------|
| **Color contrast** | 4.5:1 for text | ⬜ |  |
| **Resize text** | 200% without loss | ⬜ |  |
| **No keyboard trap** | Can navigate out | ⬜ |  |
| **Link purpose** | Clear from context | ⬜ |  |
| **Multiple ways** | Navigation + search | ⬜ |  |

---

## 8. Cross-Browser Testing

### 8.1 Chrome (Latest)

| Feature | Status | Notes |
|---------|--------|-------|
| Login | ⬜ |  |
| Dashboard | ⬜ |  |
| Charts | ⬜ |  |
| Table | ⬜ |  |
| Sync | ⬜ |  |

### 8.2 Firefox (Latest)

| Feature | Status | Notes |
|---------|--------|-------|
| Login | ⬜ |  |
| Dashboard | ⬜ |  |
| Charts | ⬜ |  |
| Table | ⬜ |  |
| Sync | ⬜ |  |

### 8.3 Safari (Latest)

| Feature | Status | Notes |
|---------|--------|-------|
| Login | ⬜ |  |
| Dashboard | ⬜ |  |
| Charts | ⬜ |  |
| Table | ⬜ |  |
| Sync | ⬜ |  |

### 8.4 Edge (Latest)

| Feature | Status | Notes |
|---------|--------|-------|
| Login | ⬜ |  |
| Dashboard | ⬜ |  |
| Charts | ⬜ |  |
| Table | ⬜ |  |
| Sync | ⬜ |  |

### 8.5 Mobile Browsers

| Browser | Status | Notes |
|---------|--------|-------|
| Safari (iOS) | ⬜ |  |
| Chrome (Android) | ⬜ |  |
| Samsung Internet | ⬜ |  |

---

## 9. Security Testing

### 9.1 Manual Security Checks

| Test Case | Steps | Expected Result | Status | Notes |
|-----------|-------|-----------------|--------|-------|
| **XSS in input** | 1. Enter `<script>alert(1)</script>`<br>2. Submit | Sanitized, no alert | ⬜ |  |
| **SQL injection** | 1. Enter `'; DROP TABLE--`<br>2. Submit | Sanitized, no error | ⬜ |  |
| **HTTPS only** | 1. Try HTTP URL | Redirects to HTTPS | ⬜ |  |
| **Session hijacking** | 1. Copy session token<br>2. Use in different browser | Token invalidated or secure | ⬜ |  |
| **CSRF protection** | 1. Submit form from external site | Request rejected | ⬜ |  |
| **Rate limiting** | 1. Make 100 rapid requests | Rate limited after threshold | ⬜ |  |

### 9.2 Data Privacy

| Test Case | Expected Result | Status | Notes |
|-----------|-----------------|--------|-------|
| **No PII in URLs** | Sensitive data not in query params | ⬜ |  |
| **No PII in logs** | Console logs don't expose data | ⬜ |  |
| **Secure cookies** | HttpOnly, Secure flags set | ⬜ |  |
| **Token expiry** | Tokens expire after timeout | ⬜ |  |

---

## 10. Error Handling

### 10.1 Network Errors

| Scenario | Expected Behavior | Status | Notes |
|----------|-------------------|--------|-------|
| **Offline mode** | "No internet" message | ⬜ |  |
| **Slow network** | Loading indicators | ⬜ |  |
| **Timeout** | Error after 10s | ⬜ |  |
| **500 error** | User-friendly error message | ⬜ |  |
| **404 error** | "Not found" page | ⬜ |  |

### 10.2 User Errors

| Scenario | Expected Behavior | Status | Notes |
|----------|-------------------|--------|-------|
| **Invalid form data** | Inline validation errors | ⬜ |  |
| **Missing required field** | Clear error message | ⬜ |  |
| **Out of range value** | Validation message | ⬜ |  |

---

## Bug Report Template

When you find a bug, document it like this:

```markdown
**Bug ID:** BUG-001
**Severity:** Critical/High/Medium/Low
**Component:** Login Form / Dashboard / Sync / etc.

**Description:**
[Clear description of the issue]

**Steps to Reproduce:**
1. Navigate to...
2. Click...
3. Enter...
4. Observe...

**Expected Result:**
[What should happen]

**Actual Result:**
[What actually happened]

**Environment:**
- Browser: Chrome 120
- OS: Windows 11
- Screen size: 1920x1080
- Network: WiFi

**Screenshots/Video:**
[Attach if available]

**Console Errors:**
```
[Paste any console errors]
```

**Additional Notes:**
[Any other relevant information]
```

---

## Sign-Off Checklist

Before marking testing complete:

- [ ] All critical paths tested
- [ ] All major browsers tested
- [ ] Mobile responsive tested
- [ ] Accessibility requirements met
- [ ] Performance benchmarks met
- [ ] Security checks passed
- [ ] All bugs documented and triaged
- [ ] Test results documented
- [ ] Screenshots/videos captured for reference

---

**Tester Name:** _______________
**Date:** _______________
**Build Version:** _______________
**Overall Status:** ⬜ Pass / ⬜ Fail / ⬜ Conditional Pass

**Notes:**
