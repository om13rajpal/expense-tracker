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
  const color = trend ? "#10b981" : "#f59e0b"

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sparkArea)" />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="3" fill={color} />
    </svg>
  )
}

export default function NetPositionWidget({}: WidgetComponentProps) {
  const { closingBalance, totalIncome, totalExpenses, netSaved, sparklineData } = useDashboardData()

  const animatedBalance = useAnimatedValue(closingBalance)
  const animatedIncome = useAnimatedValue(totalIncome)
  const animatedExpenses = useAnimatedValue(totalExpenses)

  return (
    <div className="p-6 sm:p-7 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <p className="text-base font-semibold text-neutral-500">
          {getGreeting()}, <span className="text-neutral-900 font-bold">Om</span>
        </p>
        <span className="text-[11px] font-medium text-neutral-400">
          {new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" })}
        </span>
      </div>

      <div className="flex-1 flex flex-col justify-center -mt-2">
        <p className="text-[13px] font-medium text-neutral-500 mb-1.5">
          Current Balance
        </p>
        <motion.p
          variants={numberPop}
          initial="hidden"
          animate="show"
          className="text-5xl sm:text-6xl font-black tracking-tight tabular-nums text-neutral-900"
        >
          {formatCurrency(animatedBalance)}
        </motion.p>

        <div className="mt-3 -mx-1">
          <BalanceSparkline data={sparklineData} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 pt-4 mt-auto border-t border-neutral-100">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <div className="size-2 rounded-full bg-emerald-500" />
            <span className="text-[11px] text-neutral-500 font-medium">Income</span>
          </div>
          <p className="text-base font-black tracking-tight tabular-nums text-emerald-600">{formatCurrency(animatedIncome)}</p>
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <div className="size-2 rounded-full bg-neutral-300" />
            <span className="text-[11px] text-neutral-500 font-medium">Expenses</span>
          </div>
          <p className="text-base font-black tracking-tight tabular-nums text-neutral-700">{formatCurrency(animatedExpenses)}</p>
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <div className="size-2 rounded-full bg-emerald-400" />
            <span className="text-[11px] text-neutral-500 font-medium">Saved</span>
          </div>
          <p className={`text-base font-black tracking-tight tabular-nums ${netSaved >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            {formatCurrency(netSaved)}
          </p>
        </div>
      </div>
    </div>
  )
}
