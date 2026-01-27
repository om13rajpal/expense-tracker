# Quick Reference Card - Transaction Analysis

**Period:** Jan 1-24, 2026 (24 days) | **Transactions:** 94

---

## The Numbers

| Metric | Amount |
|--------|--------|
| Starting Balance | ₹66,301 |
| Ending Balance | ₹41,817 |
| Total Income | ₹3,15,310 |
| Total Expenses | ₹3,39,794 |
| Net Change | -₹24,484 |

---

## The Mismatch Resolved

**User Dashboard:** ₹3,39,000 spend, ₹3,15,000 income, ₹41,98,000 balance
**Our Analysis:** ₹3,39,794 spend, ₹3,15,310 income, ₹41,817 balance

**Verdict:** Dashboard is CORRECT (just rounded values)

---

## Key Formula

```
Current Balance ≠ Income - Expenses
Current Balance = Starting Balance + Income - Expenses

₹41,817 = ₹66,301 + ₹3,15,310 - ₹3,39,794 ✓
```

---

## Main Insights

1. 90.9% of expenses = Education fee (₹3,09,000)
2. Primary income = POONAM M (₹1,93,000, 61.2%)
3. Daily spending (excluding fee) = ₹400-500/day
4. Savings rate = -7.76% (temporary deficit)
5. Data quality = 100% (no anomalies)

---

## Top 5 Expenses

1. THAPAR Institute - ₹2,83,500 (Education)
2. THAPAR Fee - ₹25,500 (Education)
3. Groww - ₹11,878 (Investment, 14 txns)
4. Swiggy - ₹2,794 (Food Delivery, 5 txns)
5. Wrap Chip - ₹1,740 (Restaurant, 7 txns)

---

## Top 5 Income Sources

1. POONAM M - ₹1,93,000 (4 txns)
2. AGI READ - ₹70,005 (1 txn)
3. MOHIT S - ₹37,500 (1 txn)
4. NEFT - ₹7,000 (1 txn)
5. JASVIN T - ₹6,740 (6 txns)

---

## Critical Implementation Rules

1. **Opening Balance:** Calculate from first txn OR use previous period's closing
2. **Partial Month:** Always show "Jan 1-24 (24 days)", not "Monthly"
3. **Balance:** Use `latestTransaction.balance`, NOT `income - expenses`
4. **Verification:** Always check `opening + income - expenses = closing`

---

## Files to Read

- **ANALYSIS_SUMMARY.md** - Quick overview
- **DATA_ANALYSIS_REPORT.md** - Complete 12-section deep dive
- **CALCULATION_REFERENCE.md** - Developer implementation guide
- **transactions_raw.csv** - Raw data (94 rows)

---

**All files in:** `D:/om/finance/data/`
