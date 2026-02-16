"use client"

import * as React from "react"
import {
  IconHelp,
  IconRefresh,
  IconWallet,
  IconHeartbeat,
  IconTarget,
  IconReceipt,
  IconKeyboard,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
        {children}
      </div>
    </div>
  )
}

function StepList({ steps }: { steps: string[] }) {
  return (
    <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
      {steps.map((step, i) => (
        <li key={i}>{step}</li>
      ))}
    </ol>
  )
}

export function HelpDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2"
          data-help-trigger="true"
        >
          <IconHelp className="h-4 w-4" />
          Help & Guide
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Finance Tracker Guide</DialogTitle>
          <DialogDescription>
            Learn how to use each feature of your personal finance tracker.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="sync" className="mt-4">
          <TabsList className="flex flex-wrap gap-1">
            <TabsTrigger value="sync" className="text-xs">
              <IconRefresh className="h-3 w-3 mr-1" />
              Syncing
            </TabsTrigger>
            <TabsTrigger value="transactions" className="text-xs">
              <IconReceipt className="h-3 w-3 mr-1" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="budget" className="text-xs">
              <IconWallet className="h-3 w-3 mr-1" />
              Budget
            </TabsTrigger>
            <TabsTrigger value="metrics" className="text-xs">
              <IconHeartbeat className="h-3 w-3 mr-1" />
              Metrics
            </TabsTrigger>
            <TabsTrigger value="goals" className="text-xs">
              <IconTarget className="h-3 w-3 mr-1" />
              Goals
            </TabsTrigger>
            <TabsTrigger value="shortcuts" className="text-xs">
              <IconKeyboard className="h-3 w-3 mr-1" />
              Shortcuts
            </TabsTrigger>
          </TabsList>

          {/* Syncing Transactions */}
          <TabsContent value="sync" className="space-y-4 mt-4">
            <Section title="How to sync transactions">
              <p>
                Transactions are imported from a Google Sheets spreadsheet. The
                spreadsheet should contain columns for date, description, amount,
                type (income/expense), category, payment method, and status.
              </p>
              <StepList
                steps={[
                  "Click the Sync button in the dashboard header.",
                  "The app fetches your latest Google Sheets data and imports new transactions.",
                  "Existing transactions are matched by date + description to avoid duplicates.",
                  "Categorization rules are applied automatically to newly imported transactions.",
                  "Manual category overrides you made earlier are preserved during re-import.",
                ]}
              />
            </Section>

            <Section title="Tips">
              <p>
                Keep your Google Sheet up to date with your bank exports. You can
                also use the Groww CSV import for investment transactions.
              </p>
            </Section>
          </TabsContent>

          {/* Transactions & Rules */}
          <TabsContent value="transactions" className="space-y-4 mt-4">
            <Section title="Managing transactions">
              <p>
                The Transactions page shows all imported activity. You can
                search, filter by type, and re-categorize individual or bulk
                transactions.
              </p>
              <StepList
                steps={[
                  "Click any category badge to change it via the dropdown.",
                  "Select multiple rows with checkboxes for bulk re-categorization.",
                  "Click the N/W/I badge to override a transaction's Needs/Wants/Investments classification.",
                ]}
              />
            </Section>

            <Section title="Categorization rules">
              <p>
                Rules automatically assign categories to transactions during
                import based on text patterns. For example, a rule with pattern
                "SWIGGY" matching the description field will auto-categorize any
                Swiggy transaction as "Dining".
              </p>
              <StepList
                steps={[
                  "Go to the Transactions page and click the Rules button.",
                  "Enter a pattern (text to match), choose which field to search (description, merchant, or any), and select the target category.",
                  "Rules are case-insensitive by default. Check 'Case sensitive' if needed.",
                  "The first matching rule wins. Order rules from most specific to least specific.",
                  "Toggle rules on/off with the checkmark button, or delete with the trash icon.",
                ]}
              />
            </Section>
          </TabsContent>

          {/* Budget */}
          <TabsContent value="budget" className="space-y-4 mt-4">
            <Section title="How budgets work">
              <p>
                Budgets let you set monthly spending limits for each category.
                The app tracks your actual spending against these limits and
                shows how much you have left.
              </p>
              <StepList
                steps={[
                  "Go to the Budget page from the sidebar.",
                  "Each category shows a monthly budget amount. Click the edit icon to change it.",
                  "Budgets are pro-rated based on how many days have passed this month.",
                  "Use the Add Category button to create new budget categories.",
                  "The Attention Needed panel highlights categories closest to their limit.",
                ]}
              />
            </Section>

            <Section title="NWI Split">
              <p>
                The Needs / Wants / Investments split divides your spending into
                three buckets. Adjust the target percentages on the Budget page
                (they must add up to 100%). Each transaction category is assigned
                to one bucket. The dashboard shows how your actual spending
                compares to your targets.
              </p>
            </Section>

            <Section title="Pro-rated budgets">
              <p>
                Since the month may not be complete, budgets are pro-rated. For
                example, if your monthly food budget is 10,000 and 15 of 30 days
                have passed, the pro-rated budget is 5,000. This gives a fair
                comparison of where you stand mid-month.
              </p>
            </Section>
          </TabsContent>

          {/* Metrics Explained */}
          <TabsContent value="metrics" className="space-y-4 mt-4">
            <Section title="Freedom Score">
              <p>
                A 0-100 score measuring your overall financial independence. It
                is calculated from four equally weighted components (25 points
                each):
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <strong>Savings Rate</strong> - What percentage of your income
                  you save each month.
                </li>
                <li>
                  <strong>Emergency Fund</strong> - How many months of expenses
                  your current balance can cover.
                </li>
                <li>
                  <strong>NWI Adherence</strong> - How closely your actual
                  Needs/Wants/Investments split matches your targets.
                </li>
                <li>
                  <strong>Investment Rate</strong> - The percentage of your
                  income going into investments.
                </li>
              </ul>
            </Section>

            <Section title="Emergency Fund">
              <p>
                Shows how many months of average expenses your current bank
                balance can cover. A healthy emergency fund is typically 3-6
                months. The target is configurable on the Financial Health page.
              </p>
            </Section>

            <Section title="Expense Velocity">
              <p>
                Tracks whether your spending is increasing, decreasing, or stable
                compared to the previous period. A decreasing trend is positive
                (you are spending less), while an increasing trend may need
                attention.
              </p>
            </Section>

            <Section title="Income Stability">
              <p>
                Measures how consistent your income is month to month. A score
                near 100% means very stable income. Variable income (freelance,
                bonuses) will show a lower percentage.
              </p>
            </Section>

            <Section title="FIRE Number">
              <p>
                Financial Independence, Retire Early. Your FIRE number is 25
                times your annual expenses (based on the 4% withdrawal rule).
                The Goals page shows your progress toward this target and
                estimates how many years remain at your current savings rate.
              </p>
            </Section>
          </TabsContent>

          {/* Goals */}
          <TabsContent value="goals" className="space-y-4 mt-4">
            <Section title="Savings goals">
              <p>
                Create goals for specific milestones like an emergency fund, car,
                or vacation. The app calculates whether you are on track based on
                your target date and monthly contributions.
              </p>
              <StepList
                steps={[
                  "Go to the Goals page and click Add Goal.",
                  "Enter a name, target amount, target date, and optional monthly contribution.",
                  "Track progress visually with the progress bar on each goal card.",
                  "Click Add Contribution to manually record savings toward a goal.",
                  "Goals marked 'Behind' need a higher monthly contribution to reach the target on time.",
                ]}
              />
            </Section>

            <Section title="Investment projections">
              <p>
                The Investment Projections tab shows estimated future values of
                your SIPs at 3, 5, and 10 year horizons. Portfolio projections
                break down growth by stocks, mutual funds, and SIPs.
              </p>
            </Section>
          </TabsContent>
          {/* Keyboard Shortcuts */}
          <TabsContent value="shortcuts" className="space-y-4 mt-4">
            <Section title="Navigation (press g then a letter)">
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                <ShortcutRow keys={["g", "d"]} label="Dashboard" />
                <ShortcutRow keys={["g", "t"]} label="Transactions" />
                <ShortcutRow keys={["g", "a"]} label="Analytics" />
                <ShortcutRow keys={["g", "b"]} label="Budget" />
                <ShortcutRow keys={["g", "i"]} label="Investments" />
                <ShortcutRow keys={["g", "h"]} label="Financial Health" />
                <ShortcutRow keys={["g", "g"]} label="Goals" />
                <ShortcutRow keys={["g", "p"]} label="Planner" />
                <ShortcutRow keys={["g", "s"]} label="Subscriptions" />
                <ShortcutRow keys={["g", "x"]} label="Tax Planner" />
                <ShortcutRow keys={["g", "l"]} label="Learn" />
                <ShortcutRow keys={["g", "n"]} label="Finance Agent" />
              </div>
            </Section>

            <Section title="Actions">
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                <ShortcutRow keys={["n"]} label="Quick Add Transaction" />
                <ShortcutRow keys={["Ctrl", "N"]} label="Quick Add Transaction" />
                <ShortcutRow keys={["?"]} label="Show Help" />
                <ShortcutRow keys={["Esc"]} label="Close Dialog" />
              </div>
            </Section>

            <Section title="Tips">
              <p>
                Shortcuts are disabled while typing in input fields. Press{" "}
                <kbd className="px-1.5 py-0.5 rounded bg-muted border text-xs font-mono">g</kbd>{" "}
                then a letter within 500ms to navigate. The floating + button on
                mobile also opens Quick Add.
              </p>
            </Section>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function ShortcutRow({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1">
        {keys.map((key, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span className="text-xs text-muted-foreground">+</span>}
            <kbd className="inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 rounded bg-muted border text-xs font-mono">
              {key}
            </kbd>
          </span>
        ))}
      </span>
    </div>
  )
}
