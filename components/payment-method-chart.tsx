/**
 * Horizontal bar chart showing transaction count or total amount by payment method.
 * @module components/payment-method-chart
 */
"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell } from "recharts"

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

interface PaymentMethodData {
  method: string
  count: number
  amount: number
}

const chartConfig = {
  count: {
    label: "Transactions",
    color: "var(--muted-foreground)",
  },
  amount: {
    label: "Amount",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Renders a horizontal bar chart of payment methods, toggleable between count and amount views.
 * @param data - Payment method breakdown entries.
 */
export function PaymentMethodChart({ data = [] }: { data?: PaymentMethodData[] }) {
  const [viewMode, setViewMode] = React.useState<"count" | "amount">("amount")
  const [activeIndex, setActiveIndex] = React.useState<number | undefined>(undefined)

  const totalTransactions = data.reduce((sum, item) => sum + item.count, 0)
  const totalAmount = data.reduce((sum, item) => sum + item.amount, 0)
  const hasData = data.length > 0 && (totalTransactions > 0 || totalAmount > 0)

  const sortedData = [...data].sort((a, b) =>
    viewMode === "count" ? b.count - a.count : b.amount - a.amount
  )

  const barColor = viewMode === "amount" ? "var(--chart-1)" : "var(--muted-foreground)"

  return (
    <div className="rounded-xl border border-border/60 bg-card p-5">
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-semibold">Payment Methods</h3>
          <p className="text-xs text-muted-foreground">Transaction analysis by payment type</p>
        </div>
        <Select value={viewMode} onValueChange={(value) => setViewMode(value as "count" | "amount")}>
          <SelectTrigger className="w-28 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="amount" className="text-xs">By Amount</SelectItem>
            <SelectItem value="count" className="text-xs">By Count</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {hasData ? (
        <>
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <BarChart
              data={sortedData}
              layout="vertical"
              margin={{ left: 10, right: 10, top: 10, bottom: 10 }}
              onMouseMove={(state) => {
                if (state.isTooltipActive && state.activeTooltipIndex != null) {
                  setActiveIndex(typeof state.activeTooltipIndex === "number" ? state.activeTooltipIndex : undefined)
                } else {
                  setActiveIndex(undefined)
                }
              }}
              onMouseLeave={() => setActiveIndex(undefined)}
            >
              <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.5} />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickFormatter={(value) =>
                  viewMode === "amount" ? `₹${(value / 1000).toFixed(0)}k` : value.toString()
                }
              />
              <YAxis
                type="category"
                dataKey="method"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                width={60}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              />
              <ChartTooltip
                cursor={{ fill: "var(--color-muted)", opacity: 0.1 }}
                content={
                  <ChartTooltipContent
                    hideLabel
                    formatter={(value: number, name: string) => {
                      if (name === "amount") {
                        return (
                          <div className="flex items-center gap-2 text-xs">
                            <span>Amount:</span>
                            <span className="font-semibold">{formatCurrency(value)}</span>
                          </div>
                        )
                      }
                      return (
                        <div className="flex items-center gap-2 text-xs">
                          <span>Transactions:</span>
                          <span className="font-semibold">{value}</span>
                        </div>
                      )
                    }}
                  />
                }
              />
              <Bar dataKey={viewMode} radius={[0, 6, 6, 0]} isAnimationActive={false}>
                {sortedData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={barColor}
                    opacity={activeIndex === undefined || activeIndex === index ? 1 : 0.5}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
          <div className="mt-3 grid grid-cols-2 gap-4 border-t border-border/30 pt-3">
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Total Transactions</p>
              <p className="text-lg font-semibold tabular-nums">{totalTransactions}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Total Amount</p>
              <p className="text-lg font-semibold tabular-nums">{formatCurrency(totalAmount)}</p>
            </div>
          </div>
        </>
      ) : (
        <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
          No payment method data available.
        </div>
      )}
    </div>
  )
}
