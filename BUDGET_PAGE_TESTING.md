# Budget Page Testing Guide

## Pre-Test Setup

1. **Ensure you're logged in**:
   - Navigate to `/login`
   - Use credentials to authenticate
   - You should be redirected to the dashboard

2. **Verify transaction data**:
   - Navigate to `/transactions`
   - Confirm transactions are loaded (Jan 1-24, 2026 data)
   - Note the categories and amounts

## Test Cases

### Test 1: Initial Load
**Steps**:
1. Navigate to `/budget`
2. Wait for page to load

**Expected Results**:
- Page loads without errors
- Budget period shows: "Jan 1-24, 2026 (24 of 31 days)"
- Alert shows pro-rating message
- Overall budget card displays
- Category budget cards display (10 categories)
- Default budgets loaded if no saved budgets exist

**Verify**:
- [ ] Page loads successfully
- [ ] Period information is correct
- [ ] Pro-rating message appears
- [ ] All budget categories visible
- [ ] No console errors

### Test 2: Category Spending Calculation
**Steps**:
1. Check "Food & Dining" category
2. Compare with transaction data

**Expected Results**:
- Spending should be sum of DINING + GROCERIES transactions
- Should NOT be 0 (the original bug)
- Transaction count should match

**Verify**:
- [ ] Spending is > 0 (not zero)
- [ ] Amount matches transaction data
- [ ] Transaction count is correct
- [ ] Category mapping works

### Test 3: Pro-Rating for Partial Month
**Steps**:
1. Check any category budget
2. Note the "of ₹X (24 days)" message

**Expected Results**:
- Pro-rated budget = Monthly budget × (24/31)
- Example: ₹15,000 monthly → ₹11,612.90 pro-rated
- Percentage calculated against pro-rated amount
- "Projected" line shows full-month estimate

**Verify**:
- [ ] Pro-rated amount is correct (×24/31)
- [ ] Percentage based on pro-rated budget
- [ ] Projected spending shown
- [ ] Projection percentage shown

### Test 4: Progress Bar Display
**Steps**:
1. Find a category with >100% usage
2. Check the progress bar

**Expected Results**:
- Progress bar visual stops at 100% (full width)
- Badge shows actual percentage (e.g., 120%)
- "OVERSPENT" badge appears
- Shows "₹X over budget" instead of "remaining"
- Red color indicators

**Verify**:
- [ ] Overspent badge visible
- [ ] Percentage > 100% in badge
- [ ] Shows over budget amount
- [ ] Red color scheme
- [ ] Progress bar fills completely

### Test 5: Budget Editing
**Steps**:
1. Click edit icon on any category
2. Change budget amount
3. Click save (checkmark icon)

**Expected Results**:
- Input field appears
- Shows current monthly budget
- Save button triggers API call
- Budget persists across refresh
- Spending recalculates

**Verify**:
- [ ] Edit mode activates
- [ ] Input shows current value
- [ ] Save updates budget
- [ ] API call succeeds
- [ ] Page recalculates percentages
- [ ] Refresh preserves changes

### Test 6: Budget Persistence
**Steps**:
1. Edit a budget (e.g., change "Transport" to ₹10,000)
2. Save the change
3. Refresh the page (F5)
4. Check the budget value

**Expected Results**:
- Budget survives page refresh
- Stored in `data/budgets.json`
- Loaded on next visit

**Verify**:
- [ ] Budget persists after refresh
- [ ] File created: `data/budgets.json`
- [ ] Correct value in file
- [ ] All budgets in file

### Test 7: Overall Budget Summary
**Steps**:
1. Check the "Overall Budget" card at top
2. Verify totals

**Expected Results**:
- Total spent = sum of all category spending
- Total budget = sum of all pro-rated budgets
- Percentage = total spent / total pro-rated
- Projected shows full-month estimate
- Warning if >90%, overspent if >100%

**Verify**:
- [ ] Total calculations correct
- [ ] Percentage accurate
- [ ] Projected total shown
- [ ] Warning/overspent alerts work

### Test 8: Projected Spending
**Steps**:
1. Check any category with spending
2. Look at "Projected:" line

**Expected Results**:
- Daily average = spent / 24 days
- Projected = daily average × 31 days
- Percentage vs monthly budget
- Helps predict if over budget by month end

**Verify**:
- [ ] Projection calculation correct
- [ ] Based on daily average
- [ ] Percentage vs monthly shown
- [ ] Icon displays (trending up)

### Test 9: Zero Spending Category
**Steps**:
1. Find a category with 0 transactions
2. Check display

**Expected Results**:
- ₹0 spent
- 0% used
- Full budget remaining
- No transaction count shown
- Green status

**Verify**:
- [ ] Shows ₹0 correctly
- [ ] 0% percentage
- [ ] No errors
- [ ] Clean display

### Test 10: Error Handling
**Steps**:
1. Disconnect from internet (or block API)
2. Try to save a budget
3. Check for error message

**Expected Results**:
- Error message displays
- Budget not updated
- User notified of failure
- Can retry

**Verify**:
- [ ] Error alert appears
- [ ] Message is user-friendly
- [ ] Budget unchanged
- [ ] No console errors

### Test 11: Validation
**Steps**:
1. Edit a budget
2. Enter negative number
3. Try to save

**Expected Results**:
- API rejects negative values
- Error message shown
- Budget not saved

**Verify**:
- [ ] Negative values rejected
- [ ] Error message clear
- [ ] Budget remains unchanged

### Test 12: Category Mapping Accuracy
**Steps**:
1. Check transactions page
2. Count DINING + GROCERIES transactions manually
3. Check "Food & Dining" budget
4. Verify amounts match

**Expected Results**:
- "Food & Dining" = DINING + GROCERIES
- "Transport" = TRANSPORT + FUEL
- "Bills & Utilities" = UTILITIES + RENT
- All mappings accurate

**Verify**:
- [ ] Food & Dining mapping correct
- [ ] Transport mapping correct
- [ ] Bills & Utilities mapping correct
- [ ] All other mappings correct

### Test 13: Mobile Responsive
**Steps**:
1. Resize browser to mobile size
2. Check layout

**Expected Results**:
- Cards stack vertically
- All information visible
- Edit buttons accessible
- No horizontal scroll

**Verify**:
- [ ] Mobile layout works
- [ ] All content accessible
- [ ] Buttons clickable
- [ ] Readable text

### Test 14: Loading States
**Steps**:
1. Refresh page
2. Watch loading sequence

**Expected Results**:
- Skeleton loaders while data fetches
- Smooth transition to actual data
- No layout shift

**Verify**:
- [ ] Skeletons display
- [ ] Smooth transition
- [ ] No layout jump

## API Testing

### GET /api/budgets
```bash
curl http://localhost:3000/api/budgets \
  -H "Cookie: auth_token=authenticated"
```

**Expected**: Returns budgets JSON

### POST /api/budgets
```bash
curl -X POST http://localhost:3000/api/budgets \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=authenticated" \
  -d '{"budgets":{"Food & Dining":20000}}'
```

**Expected**: Updates budgets, returns success

### PUT /api/budgets
```bash
curl -X PUT http://localhost:3000/api/budgets \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=authenticated" \
  -d '{"category":"Transport","amount":7000}'
```

**Expected**: Updates single category

## Data Verification

### Check Budget File
```bash
cat data/budgets.json
```

**Expected**:
```json
{
  "Food & Dining": 15000,
  "Transport": 5000,
  ...
}
```

### Manual Calculation Test

**Example for "Food & Dining"**:
1. Monthly budget: ₹15,000
2. Days: 24 of 31
3. Pro-rated: ₹15,000 × (24/31) = ₹11,612.90
4. If spent ₹8,500:
   - Percentage: (8,500 / 11,612.90) × 100 = 73.2%
   - Remaining: ₹3,112.90
   - Daily avg: 8,500 / 24 = ₹354.17
   - Projected: 354.17 × 31 = ₹10,979.17
   - Projected %: (10,979.17 / 15,000) × 100 = 73.2%

**Verify calculations match UI**

## Success Criteria

All tests should pass:
- [ ] All 14 test cases pass
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] API endpoints work
- [ ] Data persists
- [ ] Calculations accurate
- [ ] UI responsive
- [ ] Error handling works

## Known Issues

None expected with current implementation.

## Performance

- Page should load < 1 second
- API calls < 100ms
- No memory leaks
- Smooth interactions

## Browser Testing

Test in:
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

## Regression Testing

After fixes:
1. Verify analytics page still works
2. Verify transactions page still works
3. Verify dashboard still works
4. Verify login still works

## Next Steps

After all tests pass:
1. Run production build: `npm run build`
2. Test in production mode: `npm start`
3. Deploy to production
4. Monitor for issues
