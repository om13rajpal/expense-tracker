"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence } from "motion/react"
import { IconSearch, IconCommand, IconHistory, IconTrash } from "@tabler/icons-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { useSpotlight } from "@/hooks/use-spotlight"
import { SpotlightInput } from "@/components/spotlight/spotlight-input"
import { SpotlightResults } from "@/components/spotlight/spotlight-results"
import { SpotlightAIInline } from "@/components/spotlight/spotlight-ai-inline"
import { SpotlightFooter } from "@/components/spotlight/spotlight-footer"
import { formatINR } from "@/lib/format"
import { addRecentCommand } from "@/lib/command-palette/recent-commands"
import { clearRecentCommands } from "@/lib/command-palette/recent-commands"
import { pages } from "@/lib/spotlight/data/pages"
import type { SpotlightResult } from "@/lib/spotlight/types"

export function Spotlight() {
  const router = useRouter()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [isMac, setIsMac] = React.useState(false)
  const {
    state,
    flat,
    activeResult,
    recentCommands,
    open,
    close,
    setQuery,
    moveNext,
    movePrev,
    setActive,
    expandAI,
    collapseAI,
  } = useSpotlight()

  React.useEffect(() => {
    setIsMac(
      navigator.platform?.toLowerCase().includes("mac") ||
      navigator.userAgent?.toLowerCase().includes("mac")
    )
  }, [])

  // Focus input when dialog opens
  React.useEffect(() => {
    if (state.open) {
      // Small delay to let dialog animate in
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }, [state.open])

  const executeResult = React.useCallback(
    async (result: SpotlightResult) => {
      // AI result — expand inline panel
      if (result.aiQuery) {
        expandAI(result.aiQuery)
        return
      }

      // Expense result — submit via API
      if (result.expenseData) {
        const { description, amount, category, paymentMethod } = result.expenseData
        try {
          const res = await fetch("/api/transactions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              description,
              amount,
              type: "expense",
              date: new Date().toISOString(),
              category,
              paymentMethod,
            }),
          })
          if (!res.ok) throw new Error("Failed to add transaction")
          addRecentCommand(state.query, "expense")
          toast.success(`Added ${formatINR(amount)} expense for "${description}"`)
        } catch {
          toast.error("Failed to add transaction")
        }
        close()
        router.refresh()
        return
      }

      // Calculator result — copy to clipboard
      if (result.expression) {
        try {
          await navigator.clipboard.writeText(result.title.replace(/^=\s*/, ""))
          toast.success("Copied to clipboard")
        } catch {
          toast.error("Could not copy to clipboard")
        }
        close()
        return
      }

      // Navigation / action / transaction result — navigate
      if (result.url) {
        addRecentCommand(state.query, "navigation")
        close()
        router.push(result.url)
        return
      }

      // Custom onSelect handler
      if (result.onSelect) {
        result.onSelect()
        close()
      }
    },
    [router, close, expandAI, state.query]
  )

  // Keyboard handling inside the dialog
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
        case "Tab":
          if (!e.shiftKey) {
            e.preventDefault()
            moveNext()
          } else if (e.key === "Tab") {
            e.preventDefault()
            movePrev()
          }
          break
        case "ArrowUp":
          e.preventDefault()
          movePrev()
          break
        case "Enter":
          e.preventDefault()
          if (activeResult) {
            executeResult(activeResult)
          }
          break
        case "Escape":
          e.preventDefault()
          if (state.aiExpanded) {
            collapseAI()
          } else {
            close()
          }
          break
      }
    },
    [moveNext, movePrev, activeResult, executeResult, state.aiExpanded, collapseAI, close]
  )

  const handleSelect = React.useCallback(
    (result: SpotlightResult) => {
      executeResult(result)
    },
    [executeResult]
  )

  const handleRecentSelect = React.useCallback(
    (text: string) => {
      setQuery(text)
    },
    [setQuery]
  )

  const hasResults = flat.length > 0
  const showEmpty = state.query.trim().length > 0 && !hasResults && !state.loading

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={open}
        className="group flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-1.5 text-sm text-muted-foreground transition-all hover:bg-muted/60 hover:text-foreground hover:border-border"
        aria-label="Search"
      >
        <IconSearch className="size-4" />
        <span className="hidden sm:inline text-xs">Search...</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-0.5 rounded border border-border/60 bg-muted/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground/70 sm:inline-flex">
          {isMac ? (
            <>
              <IconCommand className="size-3" />
              <span>K</span>
            </>
          ) : (
            <>
              <span className="text-[11px]">Ctrl</span>
              <span>K</span>
            </>
          )}
        </kbd>
      </button>

      {/* Spotlight dialog */}
      <Dialog open={state.open} onOpenChange={(isOpen) => (isOpen ? open() : close())}>
        <DialogContent
          className="overflow-hidden p-0 shadow-2xl max-w-xl rounded-xl border-border/50 bg-background/95 backdrop-blur-xl gap-0"
          onKeyDown={handleKeyDown}
          aria-label="Spotlight search"
        >
          <DialogTitle className="sr-only">Spotlight Search</DialogTitle>
          <DialogDescription className="sr-only">
            Search pages, transactions, add expenses, calculate, or ask AI
          </DialogDescription>

          <SpotlightInput
            value={state.query}
            onChange={setQuery}
            loading={state.loading}
            inputRef={inputRef}
            activeIndex={state.activeIndex}
            hasResults={hasResults}
          />

          {/* Live region for screen readers */}
          <div aria-live="polite" className="sr-only">
            {flat.length} results available
          </div>

          {/* Empty state: recent commands + quick nav */}
          {!state.query.trim() && (
            <div className="py-2">
              {recentCommands.length > 0 && (
                <div className="px-2 py-1.5">
                  <div className="flex items-center justify-between px-2 py-1">
                    <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                      <IconHistory className="size-3" />
                      Recent
                    </span>
                    <button
                      onClick={() => {
                        clearRecentCommands()
                        // Force re-render by toggling query
                        setQuery(" ")
                        requestAnimationFrame(() => setQuery(""))
                      }}
                      className="text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors flex items-center gap-1"
                    >
                      <IconTrash className="size-3" />
                      Clear
                    </button>
                  </div>
                  {recentCommands.map((cmd, i) => (
                    <button
                      key={`${cmd.text}-${i}`}
                      onClick={() => handleRecentSelect(cmd.text)}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      <IconHistory className="size-3 shrink-0 opacity-50" />
                      <span className="truncate">{cmd.text}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Quick navigation shortcuts */}
              <div className="px-3 py-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 px-1">
                  Pages
                </span>
              </div>
              <div className="px-1">
                {pages.slice(0, 6).map((page) => (
                  <button
                    key={page.url}
                    onClick={() => {
                      close()
                      router.push(page.url)
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent"
                  >
                    <div className="flex size-8 items-center justify-center rounded-md bg-muted/60">
                      <page.icon className="size-4 text-muted-foreground" />
                    </div>
                    <span className="text-[13px] text-foreground">{page.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {hasResults && (
            <SpotlightResults
              groups={state.groups}
              activeIndex={state.activeIndex}
              onMouseEnter={setActive}
              onSelect={handleSelect}
            />
          )}

          {/* Empty search state */}
          {showEmpty && (
            <div className="px-4 py-8 text-center">
              <p className="text-xs text-muted-foreground">No results found</p>
            </div>
          )}

          {/* AI Inline Panel */}
          <AnimatePresence>
            {state.aiExpanded && (
              <SpotlightAIInline query={state.aiQuery} />
            )}
          </AnimatePresence>

          <SpotlightFooter />
        </DialogContent>
      </Dialog>
    </>
  )
}
