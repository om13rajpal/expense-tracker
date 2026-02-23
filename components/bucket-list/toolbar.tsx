"use client"

import { IconPlus } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { BucketListCategory, BucketListStatus } from "@/lib/types"

interface ToolbarProps {
  statusFilter: BucketListStatus | "all"
  onStatusChange: (value: BucketListStatus | "all") => void
  categoryFilter: BucketListCategory | "all"
  onCategoryChange: (value: BucketListCategory | "all") => void
  sortBy: string
  onSortChange: (value: string) => void
  onAddClick: () => void
}

const categoryLabels: Record<BucketListCategory | "all", string> = {
  all: "All Categories",
  electronics: "Electronics",
  travel: "Travel",
  vehicle: "Vehicle",
  home: "Home",
  education: "Education",
  experience: "Experience",
  fashion: "Fashion",
  health: "Health",
  other: "Other",
}

export function BucketListToolbar({
  statusFilter,
  onStatusChange,
  categoryFilter,
  onCategoryChange,
  sortBy,
  onSortChange,
  onAddClick,
}: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={statusFilter}
        onValueChange={(v) => {
          if (v) onStatusChange(v as BucketListStatus | "all")
        }}
      >
        <ToggleGroupItem value="all" className="text-xs">
          All
        </ToggleGroupItem>
        <ToggleGroupItem value="wishlist" className="text-xs">
          Wishlist
        </ToggleGroupItem>
        <ToggleGroupItem value="saving" className="text-xs">
          Saving
        </ToggleGroupItem>
        <ToggleGroupItem value="completed" className="text-xs">
          Completed
        </ToggleGroupItem>
      </ToggleGroup>

      <Select
        value={categoryFilter}
        onValueChange={(v) =>
          onCategoryChange(v as BucketListCategory | "all")
        }
      >
        <SelectTrigger size="sm" className="text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(categoryLabels).map(([value, label]) => (
            <SelectItem key={value} value={value} className="text-xs">
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={sortBy} onValueChange={onSortChange}>
        <SelectTrigger size="sm" className="text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="priority" className="text-xs">
            Priority
          </SelectItem>
          <SelectItem value="progress" className="text-xs">
            Progress
          </SelectItem>
          <SelectItem value="amount" className="text-xs">
            Amount
          </SelectItem>
          <SelectItem value="date" className="text-xs">
            Target Date
          </SelectItem>
          <SelectItem value="name" className="text-xs">
            Name
          </SelectItem>
        </SelectContent>
      </Select>

      <div className="ml-auto">
        <Button size="sm" onClick={onAddClick} className="gap-1.5">
          <IconPlus className="size-4" />
          <span className="hidden sm:inline">Add Item</span>
        </Button>
      </div>
    </div>
  )
}
