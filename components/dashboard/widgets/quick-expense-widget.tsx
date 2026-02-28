"use client"

import { useState } from "react"
import { IconPlus, IconCheck, IconLoader2 } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { WidgetComponentProps } from "@/lib/widget-registry"

const QUICK_CATEGORIES = [
  "Food & Dining",
  "Transport",
  "Shopping",
  "Entertainment",
  "Utilities",
  "Health",
  "Other",
]

export default function QuickExpenseWidget({}: WidgetComponentProps) {
  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState("Food & Dining")
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle")

  const handleSubmit = async () => {
    const num = parseFloat(amount)
    if (!num || num <= 0) return

    setStatus("loading")
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: num,
          category,
          type: "expense",
          description: `Quick: ${category}`,
          date: new Date().toISOString(),
          paymentMethod: "UPI",
        }),
      })
      if (res.ok) {
        setStatus("success")
        setAmount("")
        setTimeout(() => setStatus("idle"), 2000)
      } else {
        setStatus("idle")
      }
    } catch {
      setStatus("idle")
    }
  }

  return (
    <div className="p-5 h-full flex flex-col">
      <p className="text-[13px] font-medium text-neutral-500 mb-3">Quick Expense</p>

      <div className="space-y-2 flex-1">
        <Input
          type="number"
          placeholder="₹ Amount"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="h-9 text-sm font-semibold tabular-nums"
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
        />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {QUICK_CATEGORIES.map(c => (
              <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        size="sm"
        className="w-full mt-2 gap-1.5 bg-neutral-900 text-white hover:bg-neutral-800"
        onClick={handleSubmit}
        disabled={status === "loading" || !amount}
      >
        {status === "loading" ? <IconLoader2 className="size-3.5 animate-spin" /> :
         status === "success" ? <IconCheck className="size-3.5" /> :
         <IconPlus className="size-3.5" />}
        {status === "success" ? "Added!" : "Add Expense"}
      </Button>
    </div>
  )
}
