"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { IconSearch, IconLoader2 } from "@tabler/icons-react"
import type {
  BucketListItem,
  BucketListCategory,
  BucketListPriority,
} from "@/lib/types"

interface EditItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: BucketListItem | null
  onSubmit: (
    id: string,
    data: Partial<BucketListItem> & { addAmount?: number }
  ) => void
  onPriceLookup?: (query: string) => Promise<number | null>
  isPriceLooking?: boolean
}

const categories: { value: BucketListCategory; label: string }[] = [
  { value: "electronics", label: "Electronics" },
  { value: "travel", label: "Travel" },
  { value: "vehicle", label: "Vehicle" },
  { value: "home", label: "Home" },
  { value: "education", label: "Education" },
  { value: "experience", label: "Experience" },
  { value: "fashion", label: "Fashion" },
  { value: "health", label: "Health" },
  { value: "other", label: "Other" },
]

const priorities: { value: BucketListPriority; label: string }[] = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
]

export function EditItemDialog({
  open,
  onOpenChange,
  item,
  onSubmit,
  onPriceLookup,
  isPriceLooking,
}: EditItemDialogProps) {
  const [name, setName] = useState("")
  const [targetAmount, setTargetAmount] = useState("")
  const [category, setCategory] = useState<BucketListCategory>("other")
  const [priority, setPriority] = useState<BucketListPriority>("medium")
  const [targetDate, setTargetDate] = useState("")
  const [monthlyAllocation, setMonthlyAllocation] = useState("")
  const [description, setDescription] = useState("")
  const [addFunds, setAddFunds] = useState("")

  useEffect(() => {
    if (item) {
      setName(item.name)
      setTargetAmount(String(item.targetAmount))
      setCategory(item.category)
      setPriority(item.priority)
      setTargetDate(item.targetDate ?? "")
      setMonthlyAllocation(String(item.monthlyAllocation))
      setDescription(item.description ?? "")
      setAddFunds("")
    }
  }, [item])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!item || !name.trim() || !targetAmount) return
    onSubmit(item.id, {
      name: name.trim(),
      targetAmount: Number(targetAmount),
      category,
      priority,
      targetDate: targetDate || undefined,
      monthlyAllocation: Number(monthlyAllocation) || 0,
      description: description.trim() || undefined,
      addAmount: Number(addFunds) || undefined,
    } as Partial<BucketListItem> & { addAmount?: number })
    onOpenChange(false)
  }

  async function handlePriceLookup() {
    if (!onPriceLookup || !name.trim()) return
    const price = await onPriceLookup(name.trim())
    if (price) setTargetAmount(String(price))
  }

  if (!item) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-amount">Target Amount</Label>
            <div className="flex gap-2">
              <Input
                id="edit-amount"
                type="number"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                required
                min={0}
              />
              {onPriceLookup && (
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  onClick={handlePriceLookup}
                  disabled={isPriceLooking || !name.trim()}
                  className="shrink-0"
                >
                  {isPriceLooking ? (
                    <IconLoader2 className="size-4 animate-spin" />
                  ) : (
                    <IconSearch className="size-4" />
                  )}
                  <span className="hidden sm:inline ml-1.5">Look up</span>
                </Button>
              )}
            </div>
          </div>

          {/* Add Funds field */}
          <div className="space-y-2">
            <Label htmlFor="edit-funds">Add Funds</Label>
            <Input
              id="edit-funds"
              type="number"
              value={addFunds}
              onChange={(e) => setAddFunds(e.target.value)}
              placeholder="Amount to add to savings"
              min={0}
            />
            <p className="text-[11px] text-muted-foreground/60">
              Current saved: {new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: "INR",
                maximumFractionDigits: 0,
              }).format(item.savedAmount)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as BucketListCategory)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as BucketListPriority)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="edit-date">Target Date</Label>
              <Input
                id="edit-date"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-monthly">Monthly Allocation</Label>
              <Input
                id="edit-monthly"
                type="number"
                value={monthlyAllocation}
                onChange={(e) => setMonthlyAllocation(e.target.value)}
                placeholder="0"
                min={0}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-desc">Description</Label>
            <Input
              id="edit-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes..."
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || !targetAmount}>
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
