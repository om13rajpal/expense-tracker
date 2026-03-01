"use client"

import { useEffect, useRef, useState } from "react"
import { motion, useInView } from "motion/react"
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
  const w = 600
  const h = 120
  const pad = 8

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w
    const y = pad + (h - 2 * pad) * (1 - (v - min) / range)
    return { x, y }
  })

  // Smooth catmull-rom to cubic bezier path for a curvy line
  let linePath = `M${points[0].x},${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(points.length - 1, i + 2)]

    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6

    linePath += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`
  }
  const areaPath = `${linePath} L${w},${h} L0,${h} Z`

  const trend = values[values.length - 1] >= values[0]
  const color = trend ? "oklch(0.65 0.2 155)" : "oklch(0.75 0.15 65)"

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="sparkArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <linearGradient id="sparkLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="50%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="1" />
        </linearGradient>
      </defs>
      <motion.path
        d={areaPath}
        fill="url(#sparkArea)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.8 }}
      />
      <motion.path
        d={linePath}
        fill="none"
        stroke="url(#sparkLine)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ delay: 0.3, duration: 1.4, ease: [0.25, 0.1, 0.25, 1] }}
      />
      {/* Animated endpoint dot with glow */}
      <motion.circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r="4"
        fill={color}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.3, type: "spring" }}
        style={{ filter: `drop-shadow(0 0 6px ${color})` }}
      />
      <motion.circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r="8"
        fill={color}
        opacity={0.15}
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.5, 1] }}
        transition={{ delay: 1.5, duration: 0.6 }}
      />
    </svg>
  )
}

/* ─── Stat card subcomponent ─── */
function StatBlock({
  label,
  value,
  color,
  dotClass,
  delay,
}: {
  label: string
  value: string
  color: string
  dotClass?: string
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <div className={`size-2 rounded-full ${dotClass || "bg-muted-foreground/30"}`} />
        <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
      </div>
      <p className={`text-base font-black tracking-tight tabular-nums ${color}`}>{value}</p>
    </motion.div>
  )
}

export default function NetPositionWidget({}: WidgetComponentProps) {
  const { closingBalance, totalIncome, totalExpenses, netSaved, sparklineData } = useDashboardData()
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, margin: "-50px" })

  const animatedBalance = useAnimatedValue(isInView ? closingBalance : 0)
  const animatedIncome = useAnimatedValue(isInView ? totalIncome : 0)
  const animatedExpenses = useAnimatedValue(isInView ? totalExpenses : 0)

  return (
    <div ref={containerRef} className="p-6 sm:p-7 flex flex-col h-full widget-accent-money relative overflow-hidden">
      {/* Ambient background orbs */}
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-emerald-500/[0.04] dark:bg-emerald-500/[0.07] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-primary/[0.03] dark:bg-primary/[0.05] rounded-full blur-3xl pointer-events-none" />

      <motion.div
        className="flex items-center justify-between mb-4"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <p className="text-base font-semibold text-muted-foreground">
          {getGreeting()}, <span className="text-foreground font-bold">Om</span>
        </p>
        <span className="text-[11px] font-medium text-muted-foreground/60 px-2 py-0.5 rounded-full bg-muted/50">
          {new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" })}
        </span>
      </motion.div>

      <div className="flex-1 flex flex-col justify-center -mt-2 relative">
        <motion.p
          className="text-[13px] font-medium text-muted-foreground mb-1.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          Current Balance
        </motion.p>
        <motion.p
          variants={numberPop}
          initial="hidden"
          animate={isInView ? "show" : "hidden"}
          className="text-5xl sm:text-6xl font-black tracking-tight tabular-nums text-foreground"
        >
          {formatCurrency(animatedBalance)}
        </motion.p>

        <motion.div
          className="mt-3 -mx-1"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <BalanceSparkline data={sparklineData} />
        </motion.div>
      </div>

      <div className="grid grid-cols-3 gap-4 pt-4 mt-auto border-t border-border/50">
        <StatBlock
          label="Income"
          value={formatCurrency(animatedIncome)}
          color="text-emerald-500 dark:text-emerald-400"
          dotClass="bg-emerald-500 dot-glow"
          delay={0.8}
        />
        <StatBlock
          label="Expenses"
          value={formatCurrency(animatedExpenses)}
          color="text-foreground/70"
          delay={0.9}
        />
        <StatBlock
          label="Saved"
          value={formatCurrency(netSaved)}
          color={netSaved >= 0 ? "text-emerald-500 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}
          dotClass={netSaved >= 0 ? "bg-emerald-400 dot-glow" : "bg-red-400"}
          delay={1.0}
        />
      </div>
    </div>
  )
}
