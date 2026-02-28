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
            <div className="size-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] text-neutral-400 font-medium">Income</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="size-2 rounded-full bg-neutral-300" />
            <span className="text-[10px] text-neutral-400 font-medium">Expenses</span>
          </div>
        </div>
      </div>
      <p className="text-[10px] text-neutral-400 font-medium mb-3">Last 6 months</p>

      <div className="flex-1 min-h-0">
        {monthlyTrendData.some(d => d.income > 0 || d.expenses > 0) ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyTrendData} barGap={4}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e5e5e5" strokeOpacity={0.5} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 10, fill: "#a3a3a3" }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#a3a3a3" }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} width={45} />
              <Tooltip
                formatter={(value: number, name: string) => [formatCurrency(value), name === "income" ? "Income" : "Expenses"]}
                contentStyle={{ borderRadius: 16, fontSize: 11, border: "1px solid #e5e5e5", background: "white", color: "#171717", boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}
                cursor={{ fill: "#f5f5f5", radius: 8, fillOpacity: 0.5 }}
              />
              <Bar dataKey="income" fill="#10b981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expenses" fill="#d4d4d8" radius={[6, 6, 0, 0]} opacity={0.7} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No data yet.</div>
        )}
      </div>
    </div>
  )
}
