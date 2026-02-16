"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Common expense categories for quick selection
const QUICK_CATEGORIES = [
  "Shopping",
  "Dining",
  "Transport",
  "Groceries",
  "Entertainment",
  "Healthcare",
  "Utilities",
  "Education",
  "Subscription",
  "Miscellaneous",
]

interface QuickAddProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuickAddTransaction({ open, onOpenChange }: QuickAddProps) {
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("Miscellaneous")
  const [type, setType] = useState<"expense" | "income">("expense")
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error("Enter a valid amount")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description || category,
          amount: Number(amount),
          type,
          date,
          category,
          paymentMethod: "Other",
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Transaction added!")
        // Reset form
        setAmount("")
        setDescription("")
        setCategory("Miscellaneous")
        setType("expense")
        setDate(new Date().toISOString().slice(0, 10))
        onOpenChange(false)
      } else {
        toast.error(data.message || "Failed to add transaction")
      }
    } catch {
      toast.error("Failed to add transaction")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Quick Add Transaction</DialogTitle>
          <DialogDescription>
            Add a transaction from anywhere. Press Ctrl+N to open.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Type toggle */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={type === "expense" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setType("expense")}
            >
              Expense
            </Button>
            <Button
              size="sm"
              variant={type === "income" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setType("income")}
            >
              Income
            </Button>
          </div>

          {/* Amount */}
          <div>
            <Label htmlFor="qa-amount">Amount (Rs.)</Label>
            <Input
              id="qa-amount"
              type="number"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
              className="text-lg font-bold tabular-nums"
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="qa-desc">Description</Label>
            <Input
              id="qa-desc"
              placeholder="What was this for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Category */}
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUICK_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div>
            <Label htmlFor="qa-date">Date</Label>
            <Input
              id="qa-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add Transaction"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
