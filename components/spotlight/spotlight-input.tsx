"use client"

import { IconSearch, IconLoader2 } from "@tabler/icons-react"

interface SpotlightInputProps {
  value: string
  onChange: (value: string) => void
  loading: boolean
  inputRef: React.RefObject<HTMLInputElement | null>
  activeIndex: number
  hasResults: boolean
}

export function SpotlightInput({ value, onChange, loading, inputRef, activeIndex, hasResults }: SpotlightInputProps) {
  return (
    <div className="flex items-center gap-3 border-b border-border/40 px-4 py-3">
      {loading ? (
        <IconLoader2 className="size-4 shrink-0 animate-spin text-muted-foreground/60" />
      ) : (
        <IconSearch className="size-4 shrink-0 text-muted-foreground/60" />
      )}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search, add expense, calculate EMI, ask AI..."
        className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        role="combobox"
        aria-expanded={true}
        aria-controls="spotlight-listbox"
        aria-autocomplete="list"
        aria-activedescendant={hasResults ? `spotlight-item-${activeIndex}` : undefined}
      />
      <kbd className="hidden sm:inline-flex items-center rounded border border-border/50 bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground/60">
        esc
      </kbd>
    </div>
  )
}
