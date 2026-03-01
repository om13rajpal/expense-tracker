"use client"

import { useRef } from "react"
import { motion, useInView } from "motion/react"
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
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-40px" })

  return (
    <div ref={ref} className="p-6 h-full flex flex-col relative overflow-hidden">
      {/* Subtle ambient glow */}
      <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-emerald-500/[0.03] dark:bg-emerald-500/[0.05] rounded-full blur-3xl pointer-events-none" />

      <motion.div
        className="flex items-center justify-between mb-1"
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : -6 }}
        transition={{ duration: 0.4 }}
      >
        <h3 className="text-sm font-semibold text-foreground">Monthly Trend</h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="size-2.5 rounded-full bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_6px] shadow-emerald-500/30" />
            <span className="text-[10px] text-muted-foreground font-medium">Income</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="size-2.5 rounded-full bg-muted-foreground/30" />
            <span className="text-[10px] text-muted-foreground font-medium">Expenses</span>
          </div>
        </div>
      </motion.div>

      <motion.p
        className="text-[10px] text-muted-foreground font-medium mb-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: isInView ? 0.7 : 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
      >
        Last 6 months
      </motion.p>

      <motion.div
        className="flex-1 min-h-0"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 12 }}
        transition={{ delay: 0.3, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {monthlyTrendData.some(d => d.income > 0 || d.expenses > 0) ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyTrendData} barGap={4}>
              <CartesianGrid
                vertical={false}
                horizontal={true}
                strokeDasharray="none"
                stroke="currentColor"
                className="text-border"
                strokeOpacity={0.1}
              />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                width={45}
              />
              <Tooltip
                formatter={(value: number, name: string) => [formatCurrency(value), name === "income" ? "Income" : "Expenses"]}
                contentStyle={{
                  borderRadius: 16,
                  fontSize: 11,
                  border: '1px solid var(--border)',
                  background: 'var(--card)',
                  color: 'var(--foreground)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                }}
                cursor={{ fill: 'var(--muted)', radius: 8, fillOpacity: 0.3 }}
              />
              <Bar
                dataKey="income"
                fill="oklch(0.65 0.2 155)"
                radius={[8, 8, 0, 0]}
                animationDuration={isInView ? 800 : 0}
                animationBegin={400}
              />
              <Bar
                dataKey="expenses"
                fill="var(--muted-foreground)"
                radius={[8, 8, 0, 0]}
                opacity={0.2}
                animationDuration={isInView ? 800 : 0}
                animationBegin={600}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No data yet.</div>
        )}
      </motion.div>
    </div>
  )
}
