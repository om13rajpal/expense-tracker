"use client"

import { useQuery } from "@tanstack/react-query"
import { cn } from "@/lib/utils"

interface HourlyRateData {
  success: boolean
  enabled: boolean
  computedRate: number
}

async function fetchHourlyRate(): Promise<HourlyRateData> {
  const res = await fetch("/api/settings/hourly-rate", { credentials: "include" })
  return res.json()
}

interface MoneyInHoursProps {
  amount: number
  className?: string
}

export function MoneyInHours({ amount, className }: MoneyInHoursProps) {
  const { data } = useQuery({
    queryKey: ["hourly-rate"],
    queryFn: fetchHourlyRate,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  })

  if (!data?.enabled || !data.computedRate || data.computedRate <= 0) return null

  const hours = amount / data.computedRate

  return (
    <span className={cn("text-xs text-muted-foreground/70 tabular-nums", className)}>
      = {hours < 1 ? `${Math.round(hours * 60)}m` : `${hours.toFixed(1)}hrs`} of work
    </span>
  )
}
