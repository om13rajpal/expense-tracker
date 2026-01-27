"use client"

import * as React from "react"
import { Label, Pie, PieChart, Cell } from "recharts"

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

interface CategoryData {
  category: string
  amount: number
  percentage: number
}

const COLORS = [
  "#0ea5e9",
  "#22c55e",
  "#f97316",
  "#a855f7",
  "#f43f5e",
  "#0ea5e9",
  "#22c55e",
]

const chartConfig = {
  amount: {
    label: "Amount",
  },
  "Food & Dining": {
    label: "Food & Dining",
    color: COLORS[0],
  },
  Transport: {
    label: "Transport",
    color: COLORS[1],
  },
  Shopping: {
    label: "Shopping",
    color: COLORS[2],
  },
  "Bills & Utilities": {
    label: "Bills & Utilities",
    color: COLORS[3],
  },
  Entertainment: {
    label: "Entertainment",
    color: COLORS[4],
  },
  Healthcare: {
    label: "Healthcare",
    color: COLORS[5],
  },
  Others: {
    label: "Others",
    color: COLORS[6],
  },
} satisfies ChartConfig

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

export function CategoryChart({ data = [] }: { data?: CategoryData[] }) {
  const totalAmount = data.reduce((sum, item) => sum + item.amount, 0)
  const hasData = data.length > 0 && totalAmount > 0

  return (
    <Card className="@container/card flex flex-col border border-border/70">
      <CardHeader className="items-center pb-0">
        <CardTitle>Expenses by Category</CardTitle>
        <CardDescription>Current month breakdown</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        {hasData ? (
          <>
            <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[300px]">
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      hideLabel
                      className="backdrop-blur-xl bg-background/95 shadow-lg border-2"
                      formatter={(value: number, name: string) => (
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{name}:</div>
                          <div className="font-semibold">{formatCurrency(value)}</div>
                        </div>
                      )}
                    />
                  }
                />
                <Pie
                  data={data}
                  dataKey="amount"
                  nameKey="category"
                  innerRadius={70}
                  outerRadius={110}
                  strokeWidth={2}
                  paddingAngle={3}
                  isAnimationActive={false}
                >
                  {data.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      className="transition-opacity duration-200 hover:opacity-80"
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
                              className="fill-foreground text-3xl font-bold"
                            >
                              {formatCurrency(totalAmount)}
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) + 24}
                              className="fill-muted-foreground text-sm"
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
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm @lg/card:grid-cols-3">
              {data.map((item, index) => (
                <div
                  key={item.category}
                  className="flex items-center gap-2 rounded-lg p-2 transition-colors hover:bg-muted/50"
                >
                  <div
                    className="h-3 w-3 rounded-full shadow-sm"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <div className="flex-1 truncate">
                    <div className="font-medium text-xs truncate">{item.category}</div>
                    <div className="text-muted-foreground text-xs font-semibold">
                      {item.percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
            No expense data available for this period.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
