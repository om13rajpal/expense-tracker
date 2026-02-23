"use client"

import { useMemo } from "react"
import { motion } from "motion/react"
import {
  IconShoppingCart,
  IconPigMoney,
  IconCoffee,
  IconFlame,
  IconChartDonut,
  IconTrophy,
  IconCalendarStats,
  IconStar,
  IconLeaf,
  IconTrendingUp,
  IconTrendingDown,
} from "@tabler/icons-react"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import { formatINR, formatCompact } from "@/lib/format"
import type { Transaction, TransactionType } from "@/lib/types"
import type { StreakInfo } from "@/hooks/use-gamification"

/* ─── Types ─────────────────────────────────────────────────────────── */

interface ReelData {
  id: string
  type: string
  title: string
  value: string
  subtitle: string
  icon: React.ElementType
  gradient: string
  extraData?: Record<string, unknown>
}

interface FinancialReelsProps {
  transactions: Transaction[]
  streak?: StreakInfo | null
}

/* ─── Gradient palette ──────────────────────────────────────────────── */

const GRADIENTS = [
  "from-purple-600 to-pink-500",
  "from-blue-600 to-cyan-500",
  "from-emerald-600 to-teal-500",
  "from-orange-500 to-red-500",
  "from-indigo-600 to-violet-500",
]

/* ─── Reel data generator ───────────────────────────────────────────── */

function generateReels(transactions: Transaction[], streak?: StreakInfo | null): ReelData[] {
  const reels: ReelData[] = []
  if (!transactions.length) return reels

  const now = new Date()
  const thisMonth = now.getMonth()
  const thisYear = now.getFullYear()
  const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1
  const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear

  const expenses = transactions.filter((t) => t.type === ("expense" as TransactionType))
  const thisMonthExpenses = expenses.filter((t) => {
    const d = new Date(t.date)
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear
  })
  const lastMonthExpenses = expenses.filter((t) => {
    const d = new Date(t.date)
    return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear
  })

  const thisMonthTotal = thisMonthExpenses.reduce((s, t) => s + Math.abs(t.amount), 0)
  const lastMonthTotal = lastMonthExpenses.reduce((s, t) => s + Math.abs(t.amount), 0)

  const categoryMap = new Map<string, number>()
  for (const t of thisMonthExpenses) {
    categoryMap.set(t.category, (categoryMap.get(t.category) || 0) + Math.abs(t.amount))
  }
  const sortedCategories = [...categoryMap.entries()].sort((a, b) => b[1] - a[1])

  // 1. Spending Spotlight
  if (sortedCategories.length > 0) {
    const [topCat, topAmount] = sortedCategories[0]
    reels.push({
      id: "spending-spotlight",
      type: "spending_spotlight",
      title: "Spending Spotlight",
      value: formatINR(topAmount),
      subtitle: `spent on ${topCat} this month`,
      icon: IconShoppingCart,
      gradient: GRADIENTS[0],
    })
  }

  // 2. Savings Win
  if (lastMonthTotal > 0) {
    const diff = lastMonthTotal - thisMonthTotal
    if (diff > 0) {
      reels.push({
        id: "savings-win",
        type: "savings_win",
        title: "Savings Win",
        value: formatINR(diff),
        subtitle: "saved more than last month!",
        icon: IconPigMoney,
        gradient: GRADIENTS[2],
      })
    }
  }

  // 3. Fun Comparison
  const diningSpend = categoryMap.get("Dining") || 0
  if (diningSpend > 0) {
    const pizzaEquiv = Math.floor(diningSpend / 300)
    if (pizzaEquiv > 0) {
      reels.push({
        id: "fun-comparison",
        type: "fun_comparison",
        title: "Fun Comparison",
        value: `${pizzaEquiv} Pizzas`,
        subtitle: `Your dining spending could buy ${pizzaEquiv} pizzas this month`,
        icon: IconCoffee,
        gradient: GRADIENTS[3],
      })
    }
  }

  // 4. Streak Flex
  if (streak && streak.currentStreak > 0) {
    reels.push({
      id: "streak-flex",
      type: "streak_flex",
      title: "Streak Flex",
      value: `${streak.currentStreak} Days`,
      subtitle: "tracking streak! Keep it going!",
      icon: IconFlame,
      gradient: GRADIENTS[3],
    })
  }

  // 5. Category Champion
  if (sortedCategories.length > 0) {
    const [champCat, champAmount] = sortedCategories[0]
    const pct = thisMonthTotal > 0 ? Math.round((champAmount / thisMonthTotal) * 100) : 0
    const donutData = sortedCategories.slice(0, 5).map(([cat, amt]) => ({ name: cat, value: amt }))
    reels.push({
      id: "category-champion",
      type: "category_champion",
      title: "Category Champion",
      value: `${champCat}`,
      subtitle: `Your biggest category at ${pct}%`,
      icon: IconChartDonut,
      gradient: GRADIENTS[4],
      extraData: { donutData, pct },
    })
  }

  // 6. Money Milestone
  const totalTracked = transactions.reduce((s, t) => s + Math.abs(t.amount), 0)
  if (totalTracked > 0) {
    reels.push({
      id: "money-milestone",
      type: "money_milestone",
      title: "Money Milestone",
      value: formatCompact(totalTracked),
      subtitle: "total tracked since joining",
      icon: IconTrophy,
      gradient: GRADIENTS[1],
    })
  }

  // 7. Daily Average
  const daysInMonth = now.getDate()
  if (daysInMonth > 0 && thisMonthTotal > 0) {
    const dailyAvg = thisMonthTotal / daysInMonth
    reels.push({
      id: "daily-average",
      type: "daily_average",
      title: "Daily Average",
      value: formatINR(Math.round(dailyAvg)),
      subtitle: "average daily spend this month",
      icon: IconCalendarStats,
      gradient: GRADIENTS[0],
    })
  }

  // 8. Biggest Day
  const dailySpendMap = new Map<string, number>()
  for (const t of thisMonthExpenses) {
    const key = new Date(t.date).toISOString().split("T")[0]
    dailySpendMap.set(key, (dailySpendMap.get(key) || 0) + Math.abs(t.amount))
  }
  const dailyEntries = [...dailySpendMap.entries()]
  if (dailyEntries.length > 0) {
    dailyEntries.sort((a, b) => b[1] - a[1])
    const [bestDay, bestAmount] = dailyEntries[0]
    const formattedDate = new Date(bestDay).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
    reels.push({
      id: "best-day",
      type: "best_day",
      title: "Biggest Day",
      value: formatINR(bestAmount),
      subtitle: `Your most expensive day: ${formattedDate}`,
      icon: IconStar,
      gradient: GRADIENTS[4],
    })

    // 9. Frugal Day
    if (dailyEntries.length > 1) {
      dailyEntries.sort((a, b) => a[1] - b[1])
      const [frugalDay, frugalAmount] = dailyEntries[0]
      const frugalDate = new Date(frugalDay).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
      reels.push({
        id: "frugal-day",
        type: "frugal_day",
        title: "Frugal Day",
        value: formatINR(frugalAmount),
        subtitle: `Your cheapest day: ${frugalDate}`,
        icon: IconLeaf,
        gradient: GRADIENTS[2],
      })
    }
  }

  // 10. Monthly Trend
  if (lastMonthTotal > 0) {
    const changePercent = ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100
    const isUp = changePercent > 0
    reels.push({
      id: "monthly-trend",
      type: "monthly_trend",
      title: "Monthly Trend",
      value: `${Math.abs(Math.round(changePercent))}%`,
      subtitle: `Spending is ${isUp ? "up" : "down"} from last month`,
      icon: isUp ? IconTrendingUp : IconTrendingDown,
      gradient: isUp ? GRADIENTS[3] : GRADIENTS[2],
    })
  }

  return reels
}

/* ─── Mini donut for Category Champion card ─────────────────────────── */

const DONUT_COLORS = ["#a78bfa", "#60a5fa", "#34d399", "#fbbf24", "#f87171"]

function MiniDonut({ data, pct }: { data: { name: string; value: number }[]; pct: number }) {
  return (
    <div className="relative h-32 w-32 mx-auto mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={36}
            outerRadius={56}
            paddingAngle={3}
            dataKey="value"
            stroke="none"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-bold text-white">{pct}%</span>
      </div>
    </div>
  )
}

/* ─── Single Reel Card (full-height, scroll-snapped) ─────────────── */

function ReelCard({ reel, index }: { reel: ReelData; index: number }) {
  const Icon = reel.icon
  const isChampion = reel.type === "category_champion"

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.25, 0.1, 0.25, 1] }}
      className={`snap-start shrink-0 w-full h-full rounded-2xl bg-gradient-to-br ${reel.gradient} p-8 flex flex-col items-center justify-center text-center text-white overflow-hidden select-none relative`}
    >
      {/* Decorative elements */}
      <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/[0.06]" />
      <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/[0.04]" />
      <div className="absolute top-6 left-6 h-16 w-16 rounded-full bg-white/[0.03]" />

      {/* Reel number indicator */}
      <div className="absolute top-4 right-4 text-[11px] font-medium text-white/40 tabular-nums">
        {index + 1}
      </div>

      {/* Icon */}
      <motion.div
        initial={{ scale: 0 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 15 }}
        className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg shadow-black/10"
      >
        <Icon className="h-8 w-8" />
      </motion.div>

      {/* Title */}
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60 mb-3">
        {reel.title}
      </p>

      {/* Big value */}
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="text-4xl md:text-5xl font-extrabold leading-tight mb-2"
      >
        {reel.value}
      </motion.h2>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="text-sm text-white/75 max-w-[280px] leading-relaxed"
      >
        {reel.subtitle}
      </motion.p>

      {/* Donut chart for category champion */}
      {isChampion && reel.extraData?.donutData && (
        <MiniDonut
          data={reel.extraData.donutData as { name: string; value: number }[]}
          pct={reel.extraData.pct as number}
        />
      )}
    </motion.div>
  )
}

/* ─── FinancialReels — vertical scroll-snap feed ─────────────────── */

export function FinancialReels({ transactions, streak }: FinancialReelsProps) {
  const reels = useMemo(() => generateReels(transactions, streak), [transactions, streak])

  if (reels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground gap-3">
        <IconStar className="h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm">No financial insights yet. Start tracking to unlock your reels!</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="text-center space-y-1">
        <h2 className="text-lg font-bold text-foreground">Your Financial Story</h2>
        <p className="text-xs text-muted-foreground">Scroll to discover insights from your data</p>
      </div>

      {/* Vertical reel feed */}
      <div className="flex flex-col gap-4">
        {reels.map((reel, i) => (
          <div key={reel.id} className="w-full" style={{ height: reel.type === "category_champion" ? 380 : 300 }}>
            <ReelCard reel={reel} index={i} />
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="text-center py-4">
        <p className="text-xs text-muted-foreground/50">That&apos;s all for now! Check back later for new insights.</p>
      </div>
    </div>
  )
}
