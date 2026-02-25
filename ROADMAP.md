# Finova Platform Overhaul - Roadmap

## Status: IN PROGRESS
## Date: 2026-02-26

---

## WHAT WE'RE CHANGING

### 1. Budget Spending Split - Interactive Dial Widget
**Priority: 1 | Files: `app/budget/page.tsx`, NEW `components/budget/spending-dial.tsx`**

**Current state:** 4 separate cards (Needs/Wants/Invest/Savings) with spinbutton controls. Takes too much vertical space, looks generic.

**Target state:** A single Apple-style interactive circular ring chart:
- 4 concentric or segmented arcs representing Needs/Wants/Invest/Savings
- Draggable segment boundaries OR +/- controls that animate the ring in real-time
- Center shows total income and allocation summary
- Hovering a segment highlights it and shows details
- Below the dial: compact horizontal legend with amounts and percentages
- "Save" button to persist changes
- Must total exactly 100%

**Technical approach:**
- Custom SVG-based circular chart component (no heavy charting library)
- Use CSS transitions for smooth real-time adjustments
- Segment colors: Needs (orange), Wants (rose), Invest (blue), Savings (emerald)
- Responsive: on mobile, show a simpler horizontal bar version
- Replace the 4-card section in the "Current Month" tab spending split area

**What NOT to change:**
- The category breakdown table below stays as-is
- The Budget vs Spending chart stays
- The Attention Needed section stays
- The NWI calculation logic in lib/nwi.ts stays

---

### 2. Bucket List - Complete Frontend Redesign
**Priority: 2 | Files: `components/bucket-list/item-card.tsx`, `components/bucket-list/item-grid.tsx`, NEW `components/bucket-list/item-detail-sheet.tsx`**

**Current state:** Tall cards with image headers, collapsible AI strategy/price panels that push other cards around. Looks "shabby" per user feedback. No dedicated item view.

**Target state:**
- **Compact Pinterest-style cards**: Smaller, cleaner. Show image, name, progress bar, target amount, monthly allocation. No expandable panels on the card itself.
- **Detail Sheet/Modal**: Clicking any card opens a large slide-over sheet (or full dialog) with:
  - Hero image at top
  - Item name, category, priority, target date
  - Progress ring with saved/target amounts
  - Quick Fund actions (preset amounts + custom)
  - Price History section (rendered as a clean list, not collapsible)
  - AI Strategy section (rendered as structured components, not markdown)
  - Edit/Delete actions
  - Timeline to target date
- **"Add another dream" card** stays but gets a cleaner dashed-border design
- Cards should be roughly equal height for clean grid alignment

**Technical approach:**
- Use Radix Dialog or Sheet component for the detail view
- Cards: reduce height, remove expandable sections, keep cover image + essential info only
- Grid: maintain 3-col desktop, 2-col tablet, 1-col mobile

---

### 3. AI Strategy - Structured JSON Output
**Priority: 2 | Files: `app/api/bucket-list/strategy/route.ts`, NEW `components/bucket-list/strategy-view.tsx`**

**Current state:** AI returns raw markdown string stored in `aiStrategy` field. Rendered via `<InsightMarkdown>` in a collapsible panel. Looks generic and takes up too much space.

**Target state:** AI returns structured JSON:
```json
{
  "monthlyPlan": {
    "amount": 3000,
    "duration": "5 months",
    "startDate": "Mar 2026"
  },
  "milestones": [
    { "percent": 25, "amount": 4000, "tip": "Skip 2 dining-out meals" },
    { "percent": 50, "amount": 8000, "tip": "Sell unused electronics" },
    { "percent": 75, "amount": 12000, "tip": "Consider cashback offers" },
    { "percent": 100, "amount": 16000, "tip": "Buy during sale season" }
  ],
  "savingTips": [
    { "title": "Use price alerts", "description": "Set up alerts on PriceHistory.in", "potentialSaving": 2000 },
    { "title": "Cashback stacking", "description": "Use HDFC card on Amazon for 5% extra", "potentialSaving": 800 }
  ],
  "priceOptimization": {
    "bestTimeToBuy": "End of March (Holi sales)",
    "bestPlatform": "Amazon.in",
    "estimatedDiscount": "10-15%"
  },
  "riskLevel": "low",
  "confidence": "high",
  "summary": "Save Rs.3,000/month for 5 months. Best to buy during Holi sale for potential 15% discount."
}
```

**Technical approach:**
- Update API system prompt to return JSON with `response_format: { type: "json_object" }`
- New `strategy-view.tsx` component renders milestones as a timeline, tips as cards, price optimization as a highlight box
- Store both raw JSON and parsed version
- Backwards compatible: if `aiStrategy` is a string (old format), render as markdown; if object, render as components

---

### 4. Gamification Page - Full Redesign
**Priority: 3 | Files: `app/gamification/page.tsx`**

**Current state:** "Penny Saver 195 XP" hero banner, stat cards, challenge section, badge gallery, activity feed. Feels empty and unmotivating without social context.

**Target state:**
- **Remove the big "Penny Saver" hero banner.** Replace with a compact profile card showing level, XP ring, and current challenge.
- **Add Friend Comparison section:**
  - "Add Friend" button to create comparison profiles
  - Each friend: name, avatar/initials, savings rate %, health score, monthly budget adherence
  - Simple leaderboard: rank by health score or savings rate
  - Data is manually entered (no auth for friends needed)
  - Store in MongoDB `friend_profiles` collection
- **Compact layout:**
  - Top: Your profile card (level, XP, streak) + active challenge in a row
  - Middle: Friend leaderboard with your position highlighted
  - Bottom: Badge showcase (unlocked prominent, locked dimmed) + recent activity
- **Monthly Challenge** more prominent - show it as a card on dashboard too

**Technical approach:**
- New API route: `/api/friends` for CRUD of friend comparison profiles
- Friend profile type: `{ id, name, avatar?, savingsRate, healthScore, budgetAdherence, monthlyIncome? }`
- Leaderboard sorts by healthScore descending
- Your own metrics computed from existing data

---

### 5. Split Expenses - Email via Resend API
**Priority: 4 | Files: NEW `app/api/splits/notify/route.ts`, `lib/email.ts`**

**Current state:** Contacts with name/phone/email exist. Splits are logged. No notification mechanism.

**Target state:** When a split expense is created or a settlement reminder is needed:
- Send an email via Resend API to the contact's email
- Email template: "Om split [expense description] with you. Your share: Rs.[amount]. Settle via UPI to [UPI ID]."
- Button in split view: "Send Reminder" per contact
- Auto-send option when creating a new split expense

**Technical approach:**
- Install `resend` npm package
- Create `lib/email.ts` with Resend client setup
- Create email templates (React Email or plain HTML)
- API route `/api/splits/notify` accepts contactId, splitId, sends email
- Add "Send Reminder" button to splits UI
- Store notification history: `{ splitId, contactId, sentAt, type: 'split_created' | 'reminder' }`

**Environment variable needed:** `RESEND_API_KEY`

---

### 6. Savings Goals - Auto-Link Transactions
**Priority: 5 | Files: `app/goals/page.tsx`, `app/api/savings-goals/route.ts`**

**Current state:** Goals have `linkedCategories` and `linkedKeywords` fields. Manual contributions via dialog. No auto-detection.

**Target state:**
- When new transactions are imported/synced, scan for potential goal contributions:
  - Transfers matching goal-linked keywords
  - Amounts matching SIP amounts
  - Transfers to specific accounts (if account patterns configured)
- Surface detected contributions as a toast/notification: "Detected Rs.5,000 transfer. Link to Savings goal?"
- One-tap to confirm and auto-update goal's `currentAmount`
- Show "pending linkage" badges on goals that have unlinked potential contributions

**Technical approach:**
- Add `autoLinkPatterns` field to SavingsGoal type: `{ accounts?: string[], keywords?: string[], amountRange?: { min, max } }`
- Background scan on transaction sync (or cron via Inngest)
- New API route: `/api/savings-goals/auto-link` that finds matches
- UI: notification dot on Goals nav item when pending links exist
- Confirmation dialog before applying

---

### 7. Cross-Linking Enhancements
**Priority: 6 | Various files**

**Current cross-links (keep):**
- Budget shows "Bucket List: Rs.2,000/mo committed" in Savings category
- Goals Overview shows Bucket List targets
- Goals FIRE tab shows SIP projections and portfolio data
- Dashboard shows everything summarized

**New cross-links to add:**
- **Investments page**: Show "Rs.10,000 SIP = 28% of your investment budget" banner
- **Investments page**: Link to FIRE tab for projection context
- **Tax Planner**: Show "Your Rs.X SIPs qualify for Rs.Y deduction under 80C" (if 80C data exists)
- **Budget alerts**: When over-budget in a category, link to specific transactions causing it
- **Goals**: Show which budget categories contribute to each goal

---

## WHAT WE'RE NOT CHANGING

| Feature | Reason |
|---------|--------|
| Dashboard layout & content | User says "perfect" |
| Money/Transactions page | User says "corrected" |
| AI Chat tab | Working well, good UX |
| AI Reports tab | Excellent feature, no changes needed |
| AI Learn tab | Beautiful, gamified learning works |
| Investment page data/charts | Clean and functional |
| Transaction import/sync flow | Working correctly |
| Authentication system | Stable |
| React Query data architecture | Sound pattern |
| MongoDB data models (mostly) | Only extend, don't break |
| NWI calculation logic | Core math stays |
| Budget category table | Working well |
| Budget history tab | Fine as-is |

---

## AGENT ASSIGNMENTS

| Agent | Task | Key Files | Isolation |
|-------|------|-----------|-----------|
| Agent 1 | Budget Dial Widget | `app/budget/page.tsx`, NEW `components/budget/spending-dial.tsx` | worktree |
| Agent 2 | Bucket List Redesign (cards + detail sheet) | `components/bucket-list/*`, `app/bucket-list/page.tsx` | worktree |
| Agent 3 | AI Strategy JSON + Strategy View Component | `app/api/bucket-list/strategy/route.ts`, NEW `components/bucket-list/strategy-view.tsx` | worktree |
| Agent 4 | Gamification Redesign + Friends | `app/gamification/page.tsx`, NEW API route | worktree |
| Agent 5 | Resend API for Split Emails | NEW `lib/email.ts`, NEW API route, splits UI | worktree |
| Agent 6 | Savings Goal Auto-Linking | Goals page + API | worktree |

---

## QA CHECKLIST (post-implementation)

- [ ] Budget dial renders correctly, totals 100%, saves to API
- [ ] Budget dial is responsive (mobile fallback)
- [ ] Bucket list cards are compact and equal-height
- [ ] Bucket list detail sheet opens on click with all sections
- [ ] AI Strategy returns JSON and renders as structured components
- [ ] Old markdown strategies still render (backwards compat)
- [ ] Gamification page shows friend leaderboard
- [ ] Friend CRUD works (add, edit, remove)
- [ ] Resend email sends on split creation
- [ ] Send Reminder button works in splits view
- [ ] Savings goal auto-link detects transactions
- [ ] Confirmation dialog before auto-linking
- [ ] No console errors on any page
- [ ] Dark mode works on all new components
- [ ] Light mode works on all new components
- [ ] All existing tests still pass
- [ ] No TypeScript errors
- [ ] Navigation still works (no broken links)
- [ ] Mobile responsive on all changed pages
