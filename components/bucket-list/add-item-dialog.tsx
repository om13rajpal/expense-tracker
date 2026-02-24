/**
 * Add bucket list item dialog component.
 *
 * Renders a modal dialog for creating new bucket list items with fields:
 * - **Name** — required text input for the item name
 * - **Target Amount** — required number input with optional "Look up" price search button
 * - **Category** — dropdown selector (electronics, travel, vehicle, etc.)
 * - **Priority** — dropdown selector (high, medium, low)
 * - **Target Date** — optional date picker
 * - **Monthly Allocation** — optional number input for monthly savings toward this item
 * - **Description** — optional text input for notes
 *
 * The "Look up" button calls the Perplexity-powered price search API to auto-fill
 * the target amount based on real-time web prices.
 *
 * All fields reset to defaults when the dialog is closed or an item is created.
 *
 * @module components/bucket-list/add-item-dialog
 */
"use client"

import { useState } from "react"
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
import type { BucketListCategory, BucketListPriority } from "@/lib/types"

/**
 * Props for the AddItemDialog component.
 *
 * @property open - Whether the dialog is currently visible
 * @property onOpenChange - Callback to toggle dialog visibility
 * @property onSubmit - Callback with the form data when the user submits a new item
 * @property onPriceLookup - Optional async callback to fetch the current price for a product name
 * @property isPriceLooking - Whether a price lookup request is in progress
 */
interface AddItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: {
    name: string
    targetAmount: number
    category: BucketListCategory
    priority: BucketListPriority
    targetDate?: string
    monthlyAllocation: number
    description?: string
  }) => void
  onPriceLookup?: (query: string) => Promise<number | null>
  isPriceLooking?: boolean
}

/**
 * Available category options for the category dropdown.
 * Each entry maps an internal value to a display label.
 */
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

/**
 * Available priority options for the priority dropdown.
 * Each entry maps an internal value to a display label.
 */
const priorities: { value: BucketListPriority; label: string }[] = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
]

/**
 * Renders a modal dialog form for adding new bucket list items.
 *
 * Includes smart price lookup integration — when the user enters a name and clicks
 * "Look up", it queries the Perplexity Sonar API for real-time pricing and auto-fills
 * the target amount field. All form state resets after successful submission.
 *
 * @param props - Component props (see AddItemDialogProps)
 */
export function AddItemDialog({
  open,
  onOpenChange,
  onSubmit,
  onPriceLookup,
  isPriceLooking,
}: AddItemDialogProps) {
  const [name, setName] = useState("")
  const [targetAmount, setTargetAmount] = useState("")
  const [category, setCategory] = useState<BucketListCategory>("other")
  const [priority, setPriority] = useState<BucketListPriority>("medium")
  const [targetDate, setTargetDate] = useState("")
  const [monthlyAllocation, setMonthlyAllocation] = useState("")
  const [description, setDescription] = useState("")

  /** Resets all form fields to their default values. */
  function reset() {
    setName("")
    setTargetAmount("")
    setCategory("other")
    setPriority("medium")
    setTargetDate("")
    setMonthlyAllocation("")
    setDescription("")
  }

  /**
   * Handles form submission, validates required fields, calls onSubmit,
   * then resets the form and closes the dialog.
   */
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !targetAmount) return
    onSubmit({
      name: name.trim(),
      targetAmount: Number(targetAmount),
      category,
      priority,
      targetDate: targetDate || undefined,
      monthlyAllocation: Number(monthlyAllocation) || 0,
      description: description.trim() || undefined,
    })
    reset()
    onOpenChange(false)
  }

  /**
   * Triggers a price lookup for the current item name and auto-fills
   * the target amount if a price is found.
   */
  async function handlePriceLookup() {
    if (!onPriceLookup || !name.trim()) return
    const price = await onPriceLookup(name.trim())
    if (price) setTargetAmount(String(price))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Bucket List Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="add-name">Name</Label>
            <Input
              id="add-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. MacBook Pro M4"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-amount">Target Amount</Label>
            <div className="flex gap-2">
              <Input
                id="add-amount"
                type="number"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="0"
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
              <Label htmlFor="add-date">Target Date</Label>
              <Input
                id="add-date"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-monthly">Monthly Allocation</Label>
              <Input
                id="add-monthly"
                type="number"
                value={monthlyAllocation}
                onChange={(e) => setMonthlyAllocation(e.target.value)}
                placeholder="0"
                min={0}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-desc">Description</Label>
            <Input
              id="add-desc"
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
              Add Item
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
