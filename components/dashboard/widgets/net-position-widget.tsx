"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "motion/react"
import { numberPop } from "@/lib/motion"
import { formatINR as formatCurrency } from "@/lib/format"
import { useDashboardData } from "@/lib/dashboard-context"
import type { WidgetComponentProps } from "@/lib/widget-registry"

function useAnimatedValue(target: number, duration = 1200) {
  const [value, setValue] = useState(0)
  const prevTarget = useRef(0)
  const mounted = useRef(false)

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      setValue(target)
      prevTarget.current = target
      return
    }
    const from = prevTarget.current
    prevTarget.current = target
    const start = performance.now()
    let rafId: number
    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(from + (target - from) * eased))
      if (progress < 1) rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [target, duration])

  return value
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

function BalanceSparkline({ data }: { data: { balance: number }[] }) {
  if (data.length < 2) return null
  const values = data.map(d => d.balance)
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const w = 240
  const h = 80
  const pad = 4

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w
    const y = pad + (h - 2 * pad) * (1 - (v - min) / range)
    return { x, y }
  })

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")
  const areaPath = `${linePath} L${w},${h} L0,${h} Z`

  const trend = values[values.length - 1] >= values[0]
  const color = trend ? "#a3e635" : "#fb923c"

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <filter id="sparkGlow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path d={areaPath} fill="url(#sparkArea)" />
      <path d={linePath} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" filter="url(#sparkGlow)" />
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="3.5" fill={color} filter="url(#sparkGlow)" />
    </svg>
  )
}

export default function NetPositionWidget({}: WidgetComponentProps) {
  const { closingBalance, totalIncome, totalExpenses, netSaved, sparklineData } = useDashboardData()

  const animatedBalance = useAnimatedValue(closingBalance)
  const animatedIncome = useAnimatedValue(totalIncome)
  const animatedExpenses = useAnimatedValue(totalExpenses)

  return (
    <div className="p-6 sm:p-7 flex flex-col h-full bg-gradient-to-br from-lime-500/[0.07] via-lime-500/[0.02] to-transparent">
      <div className="flex items-center justify-between mb-4">
        <p className="text-base font-semibold text-muted-foreground">
          {getGreeting()}, <span className="text-primary">Om</span>
        </p>
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
          {new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" })}
        </span>
      </div>

      <div className="flex-1 flex flex-col justify-center -mt-2">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
          Current Balance
        </p>
        <motion.p
          variants={numberPop}
          initial="hidden"
          animate="show"
          className="text-5xl sm:text-6xl font-black tracking-tight tabular-nums"
          style={{ filter: "drop-shadow(0 0 50px rgba(163,230,53,0.15))" }}
        >
          {formatCurrency(animatedBalance)}
        </motion.p>

        <div className="mt-3 -mx-1">
          <BalanceSparkline data={sparklineData} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 pt-4 mt-auto border-t border-border">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <div className="size-2 rounded-full bg-lime-600 dark:bg-lime-400" />
            <span className="text-[11px] text-muted-foreground font-medium">Income</span>
          </div>
          <p className="text-base font-black tracking-tight tabular-nums text-lime-600 dark:text-lime-400">{formatCurrency(animatedIncome)}</p>
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <div className="size-2 rounded-full bg-zinc-400 dark:bg-zinc-500" />
            <span className="text-[11px] text-muted-foreground font-medium">Expenses</span>
          </div>
          <p className="text-base font-black tracking-tight tabular-nums text-foreground/70">{formatCurrency(animatedExpenses)}</p>
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <div className="size-2 rounded-full bg-lime-500 dark:bg-lime-300" />
            <span className="text-[11px] text-muted-foreground font-medium">Saved</span>
          </div>
          <p className={`text-base font-black tracking-tight tabular-nums ${netSaved >= 0 ? "text-lime-600 dark:text-lime-400" : "text-destructive"}`}>
            {formatCurrency(netSaved)}
          </p>
        </div>
      </div>
    </div>
  )
}
