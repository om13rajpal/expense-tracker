"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { formatINR as formatCurrency } from "@/lib/format"
import { useDashboardData } from "@/lib/dashboard-context"
import type { WidgetComponentProps } from "@/lib/widget-registry"

export default function MonthlyTrendWidget({}: WidgetComponentProps) {
  const { monthlyTrendData } = useDashboardData()

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold">Monthly Trend</h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="size-2 rounded-full bg-lime-400" />
            <span className="text-[10px] text-muted-foreground font-medium">Income</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="size-2 rounded-full bg-zinc-400 dark:bg-zinc-500" />
            <span className="text-[10px] text-muted-foreground font-medium">Expenses</span>
          </div>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground font-medium mb-3">Last 6 months</p>

      <div className="flex-1 min-h-0">
        {monthlyTrendData.some(d => d.income > 0 || d.expenses > 0) ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyTrendData} barGap={4}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.2} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} width={45} />
              <Tooltip
                formatter={(value: number, name: string) => [formatCurrency(value), name === "income" ? "Income" : "Expenses"]}
                contentStyle={{ borderRadius: 12, fontSize: 11, border: "1px solid var(--border)", background: "var(--popover)", backdropFilter: "blur(20px)", color: "var(--popover-foreground)", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
                cursor={{ fill: "var(--muted)", radius: 8, fillOpacity: 0.3 }}
              />
              <Bar dataKey="income" fill="#a3e635" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expenses" fill="var(--color-expense-bar, #a1a1aa)" radius={[6, 6, 0, 0]} opacity={0.45} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No data yet.</div>
        )}
      </div>
    </div>
  )
}
