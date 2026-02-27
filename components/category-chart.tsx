/**
 * Donut chart showing expense breakdown by category for the current month.
 * Uses theme-aware CSS variable colors.
 * @module components/category-chart
 */
"use client"

import * as React from "react"
import { Label, Pie, PieChart, Cell } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

/**
 * Single entry in the category breakdown donut chart.
 * @property category   - Display name of the expense category.
 * @property amount     - Total spent in this category (INR).
 * @property percentage - Share of total expenses (0-100).
 */
interface CategoryData {
  category: string
  amount: number
  percentage: number
}

/** Theme-aware colour palette drawn from CSS custom properties for pie chart segments. */
const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--muted-foreground)",
  "var(--primary)",
]

/** Recharts ChartConfig mapping the `amount` data key to its tooltip label. */
const chartConfig = {
  amount: {
    label: "Amount",
  },
} satisfies ChartConfig

/** Formats a number as INR currency with no decimal places. */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Renders a donut pie chart with a center total label and a category legend.
 * @param data - Category name, amount, and percentage entries.
 */
export function CategoryChart({ data = [] }: { data?: CategoryData[] }) {
  const totalAmount = data.reduce((sum, item) => sum + item.amount, 0)
  const hasData = data.length > 0 && totalAmount > 0

  return (
    <div className="rounded-xl border border-border/60 bg-card p-5">
      <div className="mb-2">
        <h3 className="text-sm font-semibold">Expenses by Category</h3>
        <p className="text-xs text-muted-foreground">Current month breakdown</p>
      </div>
      {hasData ? (
        <>
          <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[260px]">
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    hideLabel
                    formatter={(value: number, name: string) => (
                      <div className="flex items-center gap-2">
                        <div className="text-xs">{name}:</div>
                        <div className="text-xs font-semibold">{formatCurrency(value)}</div>
                      </div>
                    )}
                  />
                }
              />
              <Pie
                data={data}
                dataKey="amount"
                nameKey="category"
                innerRadius={65}
                outerRadius={100}
                strokeWidth={2}
                paddingAngle={2}
                isAnimationActive={false}
              >
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="fill-foreground text-2xl font-bold"
                          >
                            {formatCurrency(totalAmount)}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 22}
                            className="fill-muted-foreground text-xs"
                          >
                            Total
                          </tspan>
                        </text>
                      )
                    }
                    return null
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            {data.map((item, index) => (
              <div
                key={item.category}
                className="flex items-center gap-2 rounded-md p-1.5"
              >
                <div
                  className="size-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <div className="flex-1 truncate">
                  <span className="text-muted-foreground">{item.category}</span>
                </div>
                <span className="text-muted-foreground tabular-nums shrink-0">{item.percentage.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
          No expense data available.
        </div>
      )}
    </div>
  )
}
