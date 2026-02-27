"use client"

import { useMemo } from "react"
import { motion } from "motion/react"
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { IconTrendingUp, IconChartPie, IconChartLine, IconCalendarStats } from "@tabler/icons-react"
import { Card, CardContent } from "@/components/ui/card"
import { stagger, fadeUp } from "@/lib/motion"
import { formatCompact, formatCompactAxis } from "@/lib/format"
import type { BucketListItem } from "@/lib/types"

interface InsightsPanelProps {
  items: BucketListItem[]
}

const CATEGORY_COLORS: Record<string, string> = {
  electronics: "#3b82f6",
  travel: "#10b981",
  vehicle: "#f97316",
  home: "#a855f7",
  education: "#06b6d4",
  experience: "#ec4899",
  fashion: "#f43f5e",
  health: "#22c55e",
  other: "#6b7280",
}

export function InsightsPanel({ items }: InsightsPanelProps) {
  // 1. Savings Trajectory: past 6 months actual + projected 6 months
  const trajectoryData = useMemo(() => {
    const now = new Date()
    const points: { label: string; actual?: number; projected?: number }[] = []

    // Past 6 months - build cumulative savings
    const totalSaved = items.reduce((s, i) => s + i.savedAmount, 0)
    const totalMonthly = items
      .filter((i) => i.status !== "completed")
      .reduce((s, i) => s + i.monthlyAllocation, 0)

    // Simulate past 6 months
    for (let m = 5; m >= 0; m--) {
      const d = new Date(now)
      d.setMonth(d.getMonth() - m)
      const label = d.toLocaleDateString("en-IN", { month: "short" })
      // Linearly interpolate past savings
      const fraction = (6 - m) / 6
      points.push({ label, actual: Math.round(totalSaved * fraction) })
    }

    // Projected 6 months
    for (let m = 1; m <= 6; m++) {
      const d = new Date(now)
      d.setMonth(d.getMonth() + m)
      const label = d.toLocaleDateString("en-IN", { month: "short" })
      points.push({ label, projected: Math.round(totalSaved + totalMonthly * m) })
    }

    // Bridge: set projected on last actual point
    if (points.length > 6) {
      points[5].projected = points[5].actual
    }

    return points
  }, [items])

  // 2. Category distribution (donut)
  const categoryData = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of items) {
      const cat = item.category
      map.set(cat, (map.get(cat) ?? 0) + item.targetAmount)
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [items])

  // 3. Price history (for items with multiple price points)
  const priceHistoryData = useMemo(() => {
    const itemsWithPrices = items.filter((i) => i.priceHistory.length >= 2)
    if (itemsWithPrices.length === 0) return null

    // Use the item with the most price points
    const best = itemsWithPrices.sort((a, b) => b.priceHistory.length - a.priceHistory.length)[0]
    return {
      name: best.name,
      data: best.priceHistory
        .sort((a, b) => a.checkedAt.localeCompare(b.checkedAt))
        .map((p) => ({
          date: new Date(p.checkedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
          price: p.price,
        })),
    }
  }, [items])

  // 4. Completion timeline (projected months to complete each active item)
  const completionData = useMemo(() => {
    return items
      .filter((i) => i.status !== "completed" && i.monthlyAllocation > 0)
      .map((item) => {
        const remaining = Math.max(0, item.targetAmount - item.savedAmount)
        const months = Math.ceil(remaining / item.monthlyAllocation)
        return { name: item.name.length > 15 ? item.name.slice(0, 15) + "..." : item.name, months }
      })
      .sort((a, b) => a.months - b.months)
      .slice(0, 8)
  }, [items])

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 md:grid-cols-2 gap-4"
    >
      {/* Savings Trajectory */}
      <motion.div variants={fadeUp}>
        <Card className="py-4">
          <CardContent>
            <div className="flex items-center gap-2 mb-4">
              <IconTrendingUp className="size-4 text-lime-600 dark:text-lime-400" />
              <h3 className="text-sm font-semibold">Savings Trajectory</h3>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trajectoryData}>
                <defs>
                  <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => formatCompactAxis(v)} width={50} />
                <Tooltip
                  formatter={(value: number) => formatCompact(value)}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Area type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2} fill="url(#actualGrad)" connectNulls={false} />
                <Area type="monotone" dataKey="projected" stroke="#10b981" strokeWidth={2} strokeDasharray="6 3" fill="url(#projGrad)" connectNulls={false} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* Category Distribution */}
      <motion.div variants={fadeUp}>
        <Card className="py-4">
          <CardContent>
            <div className="flex items-center gap-2 mb-4">
              <IconChartPie className="size-4 text-foreground/70" />
              <h3 className="text-sm font-semibold">Category Distribution</h3>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {categoryData.map((entry) => (
                    <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] ?? CATEGORY_COLORS.other} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCompact(value)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend
                  formatter={(value: string) => <span className="text-xs capitalize">{value}</span>}
                  wrapperStyle={{ fontSize: 10 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* Price History */}
      <motion.div variants={fadeUp}>
        <Card className="py-4">
          <CardContent>
            <div className="flex items-center gap-2 mb-4">
              <IconChartLine className="size-4 text-lime-600 dark:text-lime-400" />
              <h3 className="text-sm font-semibold">
                Price History{priceHistoryData ? `: ${priceHistoryData.name}` : ""}
              </h3>
            </div>
            {priceHistoryData ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={priceHistoryData.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => formatCompactAxis(v)} width={50} />
                  <Tooltip formatter={(value: number) => formatCompact(value)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Line type="monotone" dataKey="price" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: "#10b981" }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                <p>Search prices on items to see trends</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Completion Timeline */}
      <motion.div variants={fadeUp}>
        <Card className="py-4">
          <CardContent>
            <div className="flex items-center gap-2 mb-4">
              <IconCalendarStats className="size-4 text-amber-500" />
              <h3 className="text-sm font-semibold">Estimated Completion</h3>
            </div>
            {completionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={completionData} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis type="number" tick={{ fontSize: 10 }} label={{ value: "months", position: "insideBottom", offset: -2, fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
                  <Tooltip formatter={(value: number) => `${value} months`} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="months" radius={[0, 4, 4, 0]}>
                    {completionData.map((_, index) => (
                      <Cell key={index} fill={index % 2 === 0 ? "#3b82f6" : "#10b981"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                <p>Set monthly allocations to see projections</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
