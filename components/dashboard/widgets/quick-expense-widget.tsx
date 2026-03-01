"use client"

import { useState, useRef } from "react"
import { motion, useInView, AnimatePresence } from "motion/react"
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
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-20px" })

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
    <motion.div
      ref={ref}
      className="p-5 h-full flex flex-col relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: isInView ? 1 : 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Success flash overlay */}
      <AnimatePresence>
        {status === "success" && (
          <motion.div
            className="absolute inset-0 bg-emerald-500/5 dark:bg-emerald-500/10 pointer-events-none rounded-[1.75rem]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>

      <p className="text-[13px] font-medium text-muted-foreground mb-3">Quick Expense</p>

      <div className="space-y-2.5 flex-1">
        <Input
          type="number"
          placeholder="₹ Amount"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="h-11 text-lg font-bold tabular-nums rounded-xl border-border bg-muted/40 placeholder:text-muted-foreground/40 focus:bg-muted/60 transition-colors"
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
        />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-9 text-xs rounded-lg border-border/60">
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
        className={`w-full mt-3 gap-1.5 rounded-xl font-semibold transition-all duration-300 ${
          status === "success"
            ? "bg-emerald-500 text-white scale-[1.02] shadow-[0_0_16px_oklch(0.7_0.17_155/30%)]"
            : "bg-emerald-500/90 dark:bg-emerald-500/80 text-white hover:bg-emerald-500 dark:hover:bg-emerald-500 dark:shadow-[0_0_8px_oklch(0.7_0.17_155/15%)]"
        }`}
        onClick={handleSubmit}
        disabled={status === "loading" || !amount}
      >
        <AnimatePresence mode="wait">
          {status === "loading" ? (
            <motion.span key="loading" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
              <IconLoader2 className="size-3.5 animate-spin" />
            </motion.span>
          ) : status === "success" ? (
            <motion.span key="success" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ type: "spring", stiffness: 400 }}>
              <IconCheck className="size-4" />
            </motion.span>
          ) : (
            <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <IconPlus className="size-3.5" />
            </motion.span>
          )}
        </AnimatePresence>
        {status === "success" ? "Added!" : "Add Expense"}
      </Button>
    </motion.div>
  )
}
