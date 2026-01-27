"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell } from "recharts"

import {
  Card,
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

interface PaymentMethodData {
  method: string
  count: number
  amount: number
}

const chartConfig = {
  count: {
    label: "Transactions",
    color: "#f97316",
  },
  amount: {
    label: "Amount",
    color: "#0ea5e9",
  },
} satisfies ChartConfig

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

export function PaymentMethodChart({ data = [] }: { data?: PaymentMethodData[] }) {
  const [viewMode, setViewMode] = React.useState<"count" | "amount">("amount")
  const [activeIndex, setActiveIndex] = React.useState<number | undefined>(undefined)

  const totalTransactions = data.reduce((sum, item) => sum + item.count, 0)
  const totalAmount = data.reduce((sum, item) => sum + item.amount, 0)
  const hasData = data.length > 0 && (totalTransactions > 0 || totalAmount > 0)

  const sortedData = [...data].sort((a, b) =>
    viewMode === "count" ? b.count - a.count : b.amount - a.amount
  )

  const gradientId = (index: number) => `barGradient-${index}`

  return (
    <Card className="@container/card border border-border/70">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>Payment Methods</CardTitle>
            <CardDescription>Transaction analysis by payment type</CardDescription>
          </div>
          <Select value={viewMode} onValueChange={(value) => setViewMode(value as "count" | "amount")}>
            <SelectTrigger className="w-32" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="amount">By Amount</SelectItem>
              <SelectItem value="count">By Count</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
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
                <defs>
                  {sortedData.map((_, index) => (
                    <linearGradient
                      key={`gradient-${index}`}
                      id={gradientId(index)}
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="0"
                    >
                      <stop
                        offset="0%"
                        stopColor={viewMode === "amount" ? "var(--color-amount)" : "var(--color-count)"}
                        stopOpacity={0.8}
                      />
                      <stop
                        offset="100%"
                        stopColor={viewMode === "amount" ? "var(--color-amount)" : "var(--color-count)"}
                        stopOpacity={1}
                      />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid horizontal={false} stroke="hsl(var(--border))" />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
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
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))", fontWeight: 500 }}
                />
                <ChartTooltip
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.1 }}
                  content={
                    <ChartTooltipContent
                      hideLabel
                      className="backdrop-blur-xl bg-background/95 shadow-lg border-2"
                      formatter={(value: number, name: string) => {
                        if (name === "amount") {
                          return (
                            <div className="flex items-center gap-2">
                              <div className="font-medium">Amount:</div>
                              <div className="font-semibold">{formatCurrency(value)}</div>
                            </div>
                          )
                        }
                        return (
                          <div className="flex items-center gap-2">
                            <div className="font-medium">Transactions:</div>
                            <div className="font-semibold">{value}</div>
                          </div>
                        )
                      }}
                    />
                  }
                />
                <Bar dataKey={viewMode} radius={[0, 8, 8, 0]} isAnimationActive={false}>
                  {sortedData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={`url(#${gradientId(index)})`}
                      opacity={activeIndex === undefined || activeIndex === index ? 1 : 0.6}
                      className="transition-opacity duration-200"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
            <div className="mt-4 grid grid-cols-2 gap-4 border-t pt-4">
              <div>
                <div className="text-sm text-muted-foreground">Total Transactions</div>
                <div className="text-2xl font-bold">{totalTransactions}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Amount</div>
                <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
            No payment method data available for this period.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
