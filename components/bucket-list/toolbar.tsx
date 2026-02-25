"use client"

import { useState, useEffect } from "react"
import {
  IconPlus,
  IconSearch,
  IconArrowsSort,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { BucketListCategory, BucketListStatus } from "@/lib/types"

interface ToolbarProps {
  statusFilter: BucketListStatus | "all"
  onStatusChange: (value: BucketListStatus | "all") => void
  categoryFilter: BucketListCategory | "all"
  onCategoryChange: (value: BucketListCategory | "all") => void
  sortBy: string
  onSortChange: (value: string) => void
  onAddClick: () => void
  searchQuery: string
  onSearchChange: (value: string) => void
}

const sortOptions = [
  { value: "priority", label: "Priority" },
  { value: "progress", label: "Progress" },
  { value: "amount", label: "Amount" },
  { value: "date", label: "Target Date" },
  { value: "name", label: "Name" },
]

export function BucketListToolbar({
  statusFilter,
  onStatusChange,
  categoryFilter: _categoryFilter,
  onCategoryChange: _onCategoryChange,
  sortBy,
  onSortChange,
  onAddClick,
  searchQuery,
  onSearchChange,
}: ToolbarProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(localSearch)
    }, 300)
    return () => clearTimeout(timer)
  }, [localSearch, onSearchChange])

  // Sync external changes
  useEffect(() => {
    setLocalSearch(searchQuery)
  }, [searchQuery])

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <div className="relative w-full sm:w-auto sm:min-w-[180px]">
        <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input
          placeholder="Search dreams..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="pl-8 h-8 text-xs"
        />
      </div>

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

      {/* Sort dropdown as icon button */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <IconArrowsSort className="size-3.5" />
            <span className="hidden sm:inline">
              {sortOptions.find((o) => o.value === sortBy)?.label ?? "Sort"}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {sortOptions.map((opt) => (
            <DropdownMenuItem
              key={opt.value}
              onClick={() => onSortChange(opt.value)}
              className={sortBy === opt.value ? "font-semibold" : ""}
            >
              {opt.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="ml-auto">
        <Button size="sm" onClick={onAddClick} className="gap-1.5">
          <IconPlus className="size-4" />
          <span className="hidden sm:inline">Add Item</span>
        </Button>
      </div>
    </div>
  )
}
