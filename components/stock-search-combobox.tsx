"use client"

import * as React from "react"
import { useRef, useState } from "react"
import { IconCheck, IconSearch, IconLoader2 } from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface StockResult {
  symbol: string
  name: string
  exchange: string
}

interface StockSearchComboboxProps {
  value: { symbol: string; exchange: string }
  onSelect: (stock: StockResult) => void
  disabled?: boolean
}

export function StockSearchCombobox({ value, onSelect, disabled }: StockSearchComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<StockResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const handleSearch = (value: string) => {
    setQuery(value)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (abortRef.current) abortRef.current.abort()

    if (value.trim().length < 2) {
      setResults([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController()
      abortRef.current = controller
      try {
        const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(value.trim())}`, {
          signal: controller.signal,
        })
        const data = await res.json()
        if (data.success) setResults(data.results)
      } catch {
        // aborted or network error — ignore
      } finally {
        setIsLoading(false)
      }
    }, 300)
  }

  const handleSelect = (stock: StockResult) => {
    onSelect(stock)
    setOpen(false)
    setQuery("")
    setResults([])
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal h-9 text-sm"
        >
          {value.symbol ? (
            <span className="flex items-center gap-1.5 truncate">
              <span className="font-semibold">{value.symbol}</span>
              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 font-medium">
                {value.exchange}
              </Badge>
            </span>
          ) : (
            <span className="text-muted-foreground">Search stocks...</span>
          )}
          <IconSearch className="ml-2 size-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Type company name..."
            value={query}
            onValueChange={handleSearch}
          />
          <CommandList>
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <IconLoader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : query.length >= 2 && results.length === 0 ? (
              <CommandEmpty>No stocks found.</CommandEmpty>
            ) : (
              <CommandGroup>
                {results.map((stock) => (
                  <CommandItem
                    key={`${stock.symbol}-${stock.exchange}`}
                    value={`${stock.symbol}-${stock.exchange}`}
                    onSelect={() => handleSelect(stock)}
                    className="flex items-center gap-2"
                  >
                    <IconCheck
                      className={cn(
                        "size-3.5 shrink-0",
                        value.symbol === stock.symbol && value.exchange === stock.exchange
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{stock.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 font-mono font-semibold">
                          {stock.symbol}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                          {stock.exchange}
                        </Badge>
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
