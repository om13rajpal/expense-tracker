"use client"

import { useState, useEffect, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { motion, useSpring, useTransform } from "motion/react"
import { IconActivityHeartbeat } from "@tabler/icons-react"

async function fetchMonthExpenses(): Promise<{ totalExpenses: number }> {
  // Reuse the predictions endpoint which already aggregates expenses
  const res = await fetch("/api/predictions", { credentials: "include" })
  const data = await res.json()
  if (!data.success) return { totalExpenses: 0 }
  // daily average * days elapsed gives current total
  const now = new Date()
  const elapsed = Math.max(1, now.getDate())
  const totalExpenses = (data.cashFlow?.dailyAverage ?? 0) * elapsed
  return { totalExpenses }
}

function AnimatedNumber({ value }: { value: number }) {
  const spring = useSpring(0, { stiffness: 40, damping: 20 })
  const display = useTransform(spring, (v) => v.toFixed(2))
  const [displayVal, setDisplayVal] = useState("0.00")

  useEffect(() => {
    spring.set(value)
  }, [value, spring])

  useEffect(() => {
    const unsub = display.on("change", (v) => setDisplayVal(v))
    return unsub
  }, [display])

  return <span>{displayVal}</span>
}

export function SpendVelocityTicker() {
  const { data } = useQuery({
    queryKey: ["month-expenses-velocity"],
    queryFn: fetchMonthExpenses,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const [perHour, setPerHour] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    function compute() {
      if (!data?.totalExpenses) return
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const hoursElapsed = Math.max(1, (now.getTime() - monthStart.getTime()) / (1000 * 60 * 60))
      setPerHour(data.totalExpenses / hoursElapsed)
    }

    compute()
    intervalRef.current = setInterval(compute, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [data])

  if (!data?.totalExpenses || perHour === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="card-elevated rounded-xl bg-card p-4 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
    >
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-gradient-to-br from-orange-500/15 to-red-500/15">
          <IconActivityHeartbeat className="h-4 w-4 text-orange-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Spend Velocity</p>
          <p className="text-base font-bold tabular-nums font-mono">
            <span className="text-muted-foreground">Rs </span>
            <AnimatedNumber value={perHour} />
            <span className="text-xs text-muted-foreground font-sans">/hr flowing out</span>
          </p>
        </div>
      </div>
    </motion.div>
  )
}
