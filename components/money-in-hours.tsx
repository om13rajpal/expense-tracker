/**
 * Converts a monetary amount to equivalent work hours based on the
 * user's configured hourly income rate (fetched from /api/settings/hourly-rate).
 * Renders nothing when the feature is disabled or the rate is unavailable.
 * @module components/money-in-hours
 */
"use client"

import { useQuery } from "@tanstack/react-query"
import { cn } from "@/lib/utils"

/**
 * Shape of the hourly rate API response.
 * @property success      - Whether the API call succeeded.
 * @property enabled      - Whether the "money in hours" feature is turned on.
 * @property computedRate - Derived hourly income rate in INR.
 */
interface HourlyRateData {
  success: boolean
  enabled: boolean
  computedRate: number
}

/**
 * Fetches the user's computed hourly rate from the settings API.
 * @returns Parsed HourlyRateData JSON response.
 */
async function fetchHourlyRate(): Promise<HourlyRateData> {
  const res = await fetch("/api/settings/hourly-rate", { credentials: "include" })
  return res.json()
}

/**
 * Props for {@link MoneyInHours}.
 * @property amount    - The INR amount to convert into work-hours.
 * @property className - Optional CSS class for the inline span.
 */
interface MoneyInHoursProps {
  amount: number
  className?: string
}

/**
 * Displays a small inline label like "= 3.2hrs of work" next to a money amount.
 * For sub-hour amounts the output uses minutes (e.g. "= 45m of work").
 * Hidden when the feature is disabled or the hourly rate is zero/unavailable.
 */
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
