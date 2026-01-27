"use client"

import { IconTrendingDown, IconTrendingUp, IconWallet, IconCreditCard, IconPigMoney, IconChartLine } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface FinanceMetrics {
  totalBalance: number
  monthlySpend: number
  monthlyIncome: number
  avgMonthlySavings: number
  balanceChange: number
  spendChange: number
  incomeChange: number
  savingsChange: number
}

// Helper function to format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

// Mock data - replace with real data from API
const mockMetrics: FinanceMetrics = {
  totalBalance: 125000,
  monthlySpend: 45200,
  monthlyIncome: 75000,
  avgMonthlySavings: 29800,
  balanceChange: 12.5,
  spendChange: -8.3,
  incomeChange: 5.2,
  savingsChange: 15.7,
}

export function SectionCards({ metrics = mockMetrics }: { metrics?: FinanceMetrics }) {
  const isBalancePositive = metrics.balanceChange >= 0
  const isSpendPositive = metrics.spendChange <= 0 // Negative spend change is good
  const isIncomePositive = metrics.incomeChange >= 0
  const isSavingsPositive = metrics.savingsChange >= 0

  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {/* Total Balance Card */}
      <Card className="group @container/card relative overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-primary/5 shadow-elevation-low transition-all duration-300 ease-out hover:border-primary/30 hover:shadow-elevation-high hover:translate-y-[-4px] animate-stagger-1">
        <CardHeader>
          <CardDescription className="flex items-center gap-3">
            {/* Icon with ambient glow and hover effects */}
            <div className="relative">
              {/* Ambient glow effect */}
              <div className="absolute inset-0 rounded-xl bg-primary/20 blur-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              {/* Icon background */}
              <div className="relative flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
                <IconWallet className="size-6 text-primary transition-transform duration-300 group-hover:scale-110" />
              </div>
            </div>
            <span className="text-label-caps text-muted-foreground">Total Balance</span>
          </CardDescription>
          <CardTitle className="text-stat-large">
            {formatCurrency(metrics.totalBalance)}
          </CardTitle>
          <CardAction>
            <Badge
              variant="outline"
              className={`border transition-all duration-300 ${
                isBalancePositive
                  ? "border-success/30 bg-success/10 text-success-foreground"
                  : "border-destructive/30 bg-destructive/10 text-destructive-foreground"
              }`}
            >
              {isBalancePositive ? <IconTrendingUp className="size-3" /> : <IconTrendingDown className="size-3" />}
              {isBalancePositive ? '+' : ''}{metrics.balanceChange.toFixed(1)}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {isBalancePositive ? 'Growing steadily' : 'Needs attention'}
            {isBalancePositive ? <IconTrendingUp className="size-4" /> : <IconTrendingDown className="size-4" />}
          </div>
          <div className="text-muted-foreground">
            Compared to last month
          </div>
        </CardFooter>
      </Card>

      {/* Monthly Spend Card */}
      <Card className="group @container/card relative overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-destructive/5 shadow-elevation-low transition-all duration-300 ease-out hover:border-destructive/30 hover:shadow-elevation-high hover:translate-y-[-4px] animate-stagger-2">
        <CardHeader>
          <CardDescription className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-destructive/20 blur-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="relative flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-destructive/10 to-destructive/5 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
                <IconCreditCard className="size-6 text-destructive transition-transform duration-300 group-hover:scale-110" />
              </div>
            </div>
            <span className="text-label-caps text-muted-foreground">Monthly Spend</span>
          </CardDescription>
          <CardTitle className="text-stat-large">
            {formatCurrency(metrics.monthlySpend)}
          </CardTitle>
          <CardAction>
            <Badge
              variant="outline"
              className={`border transition-all duration-300 ${
                isSpendPositive
                  ? "border-success/30 bg-success/10 text-success-foreground"
                  : "border-destructive/30 bg-destructive/10 text-destructive-foreground"
              }`}
            >
              {isSpendPositive ? <IconTrendingDown className="size-3" /> : <IconTrendingUp className="size-3" />}
              {metrics.spendChange >= 0 ? '+' : ''}{metrics.spendChange.toFixed(1)}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {isSpendPositive ? 'Controlled spending' : 'Increased expenses'}
            {isSpendPositive ? <IconTrendingDown className="size-4" /> : <IconTrendingUp className="size-4" />}
          </div>
          <div className="text-muted-foreground">
            Current month expenses
          </div>
        </CardFooter>
      </Card>

      {/* Monthly Income Card */}
      <Card className="group @container/card relative overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-success/5 shadow-elevation-low transition-all duration-300 ease-out hover:border-success/30 hover:shadow-elevation-high hover:translate-y-[-4px] animate-stagger-3">
        <CardHeader>
          <CardDescription className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-success/20 blur-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="relative flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-success/10 to-success/5 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
                <IconChartLine className="size-6 text-success transition-transform duration-300 group-hover:scale-110" />
              </div>
            </div>
            <span className="text-label-caps text-muted-foreground">Monthly Income</span>
          </CardDescription>
          <CardTitle className="text-stat-large">
            {formatCurrency(metrics.monthlyIncome)}
          </CardTitle>
          <CardAction>
            <Badge
              variant="outline"
              className={`border transition-all duration-300 ${
                isIncomePositive
                  ? "border-success/30 bg-success/10 text-success-foreground"
                  : "border-destructive/30 bg-destructive/10 text-destructive-foreground"
              }`}
            >
              {isIncomePositive ? <IconTrendingUp className="size-3" /> : <IconTrendingDown className="size-3" />}
              {isIncomePositive ? '+' : ''}{metrics.incomeChange.toFixed(1)}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {isIncomePositive ? 'Income growing' : 'Income decreased'}
            {isIncomePositive ? <IconTrendingUp className="size-4" /> : <IconTrendingDown className="size-4" />}
          </div>
          <div className="text-muted-foreground">
            Current month income
          </div>
        </CardFooter>
      </Card>

      {/* Average Monthly Savings Card */}
      <Card className="group @container/card relative overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-accent/5 shadow-elevation-low transition-all duration-300 ease-out hover:border-accent/30 hover:shadow-elevation-high hover:translate-y-[-4px] animate-stagger-4">
        <CardHeader>
          <CardDescription className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-accent/20 blur-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="relative flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
                <IconPigMoney className="size-6 text-accent transition-transform duration-300 group-hover:scale-110" />
              </div>
            </div>
            <span className="text-label-caps text-muted-foreground">Avg Monthly Savings</span>
          </CardDescription>
          <CardTitle className="text-stat-large">
            {formatCurrency(metrics.avgMonthlySavings)}
          </CardTitle>
          <CardAction>
            <Badge
              variant="outline"
              className={`border transition-all duration-300 ${
                isSavingsPositive
                  ? "border-success/30 bg-success/10 text-success-foreground"
                  : "border-destructive/30 bg-destructive/10 text-destructive-foreground"
              }`}
            >
              {isSavingsPositive ? <IconTrendingUp className="size-3" /> : <IconTrendingDown className="size-3" />}
              {isSavingsPositive ? '+' : ''}{metrics.savingsChange.toFixed(1)}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {isSavingsPositive ? 'Strong savings rate' : 'Savings declined'}
            {isSavingsPositive ? <IconTrendingUp className="size-4" /> : <IconTrendingDown className="size-4" />}
          </div>
          <div className="text-muted-foreground">
            Last 6 months average
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
