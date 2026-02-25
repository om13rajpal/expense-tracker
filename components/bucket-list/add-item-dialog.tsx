"use client"

import { useState, useRef } from "react"
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
import { IconSearch, IconLoader2, IconUpload, IconLink, IconX, IconPhoto } from "@tabler/icons-react"
import type { BucketListCategory, BucketListPriority } from "@/lib/types"

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
    coverImageUrl?: string
  }) => void
  onPriceLookup?: (query: string) => Promise<number | null>
  isPriceLooking?: boolean
  onFileUpload?: (file: File) => Promise<string | null>
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
  const [imageUrl, setImageUrl] = useState("")
  const [imageMode, setImageMode] = useState<"url" | "upload" | null>(null)
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function reset() {
    setName("")
    setTargetAmount("")
    setCategory("other")
    setPriority("medium")
    setTargetDate("")
    setMonthlyAllocation("")
    setDescription("")
    setImageUrl("")
    setImageMode(null)
    setUploadedPreview(null)
    setUploadedFile(null)
  }

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
      coverImageUrl: imageUrl.trim() || undefined,
    })
    reset()
    onOpenChange(false)
  }

  async function handlePriceLookup() {
    if (!onPriceLookup || !name.trim()) return
    const price = await onPriceLookup(name.trim())
    if (price) setTargetAmount(String(price))
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadedFile(file)
    const reader = new FileReader()
    reader.onload = () => {
      setUploadedPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
    setImageMode("upload")
  }

  function clearImage() {
    setImageUrl("")
    setUploadedPreview(null)
    setUploadedFile(null)
    setImageMode(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const previewSrc = imageMode === "url" && imageUrl.trim() ? imageUrl : uploadedPreview

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto rounded-xl">
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

          {/* Cover Image section */}
          <div className="space-y-2">
            <Label>Cover Image</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleFileSelect}
            />
            {previewSrc ? (
              <div className="relative rounded-lg overflow-hidden border border-border/50 h-32 bg-muted/30">
                <img
                  src={previewSrc}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  onError={() => { if (imageMode === "url") setImageUrl("") }}
                />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 transition-colors"
                >
                  <IconX className="size-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex flex-col items-center gap-1.5 rounded-lg border-2 border-dashed border-border/60 hover:border-primary/40 hover:bg-muted/30 p-3 transition-colors"
                >
                  <IconUpload className="size-4 text-muted-foreground" />
                  <span className="text-[11px] font-medium text-muted-foreground">Upload file</span>
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode("url")}
                  className="flex-1 flex flex-col items-center gap-1.5 rounded-lg border-2 border-dashed border-border/60 hover:border-primary/40 hover:bg-muted/30 p-3 transition-colors"
                >
                  <IconLink className="size-4 text-muted-foreground" />
                  <span className="text-[11px] font-medium text-muted-foreground">Paste URL</span>
                </button>
              </div>
            )}
            {imageMode === "url" && !previewSrc && (
              <div className="flex gap-2">
                <Input
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="text-xs"
                  autoFocus
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { if (!imageUrl.trim()) setImageMode(null) }}
                  className="shrink-0 text-xs"
                >
                  {imageUrl.trim() ? "Preview" : "Cancel"}
                </Button>
              </div>
            )}
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
