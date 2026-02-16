"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"

export const description = "Interactive expense tracking chart"

// Mock data for monthly expenses (last 6 months)
const monthlyData = [
  { date: "2025-08", expenses: 42300, income: 75000 },
  { date: "2025-09", expenses: 38500, income: 75000 },
  { date: "2025-10", expenses: 45200, income: 78000 },
  { date: "2025-11", expenses: 41800, income: 75000 },
  { date: "2025-12", expenses: 48900, income: 80000 },
  { date: "2026-01", expenses: 45200, income: 75000 },
]

// Mock data for daily expenses (current month - January 2026)
const dailyData = Array.from({ length: 26 }, (_, i) => {
  const day = i + 1
  return {
    date: `2026-01-${day.toString().padStart(2, '0')}`,
    expenses: Math.floor(Math.random() * 3000) + 500,
  }
})

const chartConfig = {
  expenses: {
    label: "Expenses",
    color: "var(--chart-5)",
  },
  income: {
    label: "Income",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

export function ChartAreaInteractive() {
  const [viewType, setViewType] = React.useState<"monthly" | "daily">("monthly")

  const currentData = viewType === "monthly" ? monthlyData : dailyData
  const totalExpenses = currentData.reduce((sum, item) => sum + item.expenses, 0)
  const avgExpenses = Math.round(totalExpenses / currentData.length)

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Expense Trends</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            {viewType === "monthly" ? "Last 6 months expense overview" : "Daily spending in current month"}
          </span>
          <span className="@[540px]/card:hidden">
            {viewType === "monthly" ? "6 months" : "This month"}
          </span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={viewType}
            onValueChange={(value) => value && setViewType(value as "monthly" | "daily")}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="monthly">Monthly</ToggleGroupItem>
            <ToggleGroupItem value="daily">Daily</ToggleGroupItem>
          </ToggleGroup>
          <Select value={viewType} onValueChange={(value) => setViewType(value as "monthly" | "daily")}>
            <SelectTrigger
              className="flex w-32 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select view type"
            >
              <SelectValue placeholder="Monthly" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="monthly" className="rounded-lg">
                Monthly View
              </SelectItem>
              <SelectItem value="daily" className="rounded-lg">
                Daily View
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={currentData}>
            <defs>
              {/* Multi-stop gradient for expenses with smooth fade */}
              <linearGradient id="fillExpenses" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--chart-5)"
                  stopOpacity={0.6}
                />
                <stop
                  offset="50%"
                  stopColor="var(--chart-5)"
                  stopOpacity={0.3}
                />
                <stop
                  offset="100%"
                  stopColor="var(--chart-5)"
                  stopOpacity={0.05}
                />
              </linearGradient>
              {/* Multi-stop gradient for income with smooth fade */}
              <linearGradient id="fillIncome" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--chart-1)"
                  stopOpacity={0.6}
                />
                <stop
                  offset="50%"
                  stopColor="var(--chart-1)"
                  stopOpacity={0.3}
                />
                <stop
                  offset="100%"
                  stopColor="var(--chart-1)"
                  stopOpacity={0.05}
                />
              </linearGradient>
              {/* Glow filter for line effect */}
              <filter id="lineGlow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="var(--border)"
              strokeOpacity={0.4}
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
              tickFormatter={(value) => {
                const date = new Date(value)
                if (viewType === "monthly") {
                  return date.toLocaleDateString("en-US", {
                    month: "short",
                    year: "2-digit",
                  })
                }
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  className="backdrop-blur-xl bg-background/95 shadow-lg border-2"
                  labelFormatter={(label) => {
                    if (typeof label !== "string" && typeof label !== "number") {
                      return ""
                    }
                    const date = new Date(label)
                    if (viewType === "monthly") {
                      return date.toLocaleDateString("en-US", {
                        month: "long",
                        year: "numeric",
                      })
                    }
                    return date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  }}
                  formatter={(value: number) => {
                    return new Intl.NumberFormat('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                      maximumFractionDigits: 0,
                    }).format(value as number)
                  }}
                  indicator="dot"
                />
              }
            />
            {viewType === "monthly" && (
              <Area
                dataKey="income"
                type="natural"
                fill="url(#fillIncome)"
                stroke="var(--chart-1)"
                strokeWidth={3}
                filter="url(#lineGlow)"
                strokeOpacity={0.95}
                isAnimationActive={false}
              />
            )}
            <Area
              dataKey="expenses"
              type="natural"
              fill="url(#fillExpenses)"
              stroke="var(--chart-5)"
              strokeWidth={3}
              filter="url(#lineGlow)"
              strokeOpacity={0.95}
              isAnimationActive={false}
            />
          </AreaChart>
        </ChartContainer>
        <div className="mt-4 flex items-center justify-between border-t pt-4 text-sm">
          <div className="text-muted-foreground">
            Average {viewType === "monthly" ? "monthly" : "daily"} expenses
          </div>
          <div className="font-semibold">
            {new Intl.NumberFormat('en-IN', {
              style: 'currency',
              currency: 'INR',
              maximumFractionDigits: 0,
            }).format(avgExpenses)}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
