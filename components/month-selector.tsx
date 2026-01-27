"use client"

import * as React from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MonthIdentifier } from "@/lib/monthly-utils"
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"

interface MonthSelectorProps {
  availableMonths: MonthIdentifier[]
  selectedMonth: MonthIdentifier
  onMonthChange: (month: MonthIdentifier) => void
}

export function MonthSelector({
  availableMonths,
  selectedMonth,
  onMonthChange
}: MonthSelectorProps) {
  const currentIndex = availableMonths.findIndex(
    m => m.year === selectedMonth.year && m.month === selectedMonth.month
  )

  const hasPrevious = currentIndex > 0
  const hasNext = currentIndex < availableMonths.length - 1

  const handlePrevious = () => {
    if (hasPrevious) {
      onMonthChange(availableMonths[currentIndex - 1])
    }
  }

  const handleNext = () => {
    if (hasNext) {
      onMonthChange(availableMonths[currentIndex + 1])
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={handlePrevious}
        disabled={!hasPrevious}
      >
        <IconChevronLeft className="size-4" />
      </Button>

      <Select
        value={`${selectedMonth.year}-${selectedMonth.month}`}
        onValueChange={(value) => {
          const [year, month] = value.split('-').map(Number)
          const monthData = availableMonths.find(m => m.year === year && m.month === month)
          if (monthData) {
            onMonthChange(monthData)
          }
        }}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {availableMonths.map((month) => (
            <SelectItem
              key={`${month.year}-${month.month}`}
              value={`${month.year}-${month.month}`}
            >
              {month.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="icon"
        onClick={handleNext}
        disabled={!hasNext}
      >
        <IconChevronRight className="size-4" />
      </Button>
    </div>
  )
}
