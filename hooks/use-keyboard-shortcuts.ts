/**
 * Global keyboard shortcut handler.
 * Registers single-key shortcuts (n, ?, /) and two-key "g then letter" chords
 * for rapid page navigation. Skips events when focus is in an input/textarea.
 * @module hooks/use-keyboard-shortcuts
 */
"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

/**
 * Configuration callbacks for single-key shortcuts.
 * @property onQuickAdd - Callback invoked when the user presses `n` or `Ctrl+N` to add a new transaction
 * @property onSearch - Callback invoked when the user presses `/` or `Ctrl+K` to focus the search input
 * @property onHelp - Callback invoked when the user presses `?` to display the shortcuts help overlay
 */
interface KeyboardShortcutsOptions {
  onQuickAdd?: () => void
  onSearch?: () => void
  onHelp?: () => void
}

/**
 * Attaches global keydown listeners for app-wide keyboard shortcuts.
 *
 * **Single-key shortcuts:**
 * - `n` or `Ctrl+N` -- Quick-add a new transaction
 * - `?` -- Show keyboard shortcuts help
 * - `/` or `Ctrl+K` -- Focus search
 * - `Escape` -- Cancel any pending chord
 *
 * **Two-key "go to" chords (press `g` then a letter within 500 ms):**
 * - `g d` -- Dashboard
 * - `g t` -- Transactions
 * - `g a` -- Analytics
 * - `g b` -- Budget
 * - `g i` -- Investments
 * - `g h` -- Financial Health
 * - `g g` -- Goals
 * - `g p` -- Planner
 * - `g s` -- Subscriptions
 * - `g x` -- Tax
 * - `g l` -- Learn
 * - `g n` -- AI Agent
 *
 * All shortcuts are suppressed when the active element is an `INPUT`,
 * `TEXTAREA`, `SELECT`, or `contentEditable` element.
 *
 * @param options - Optional callbacks for quick-add, search, and help shortcuts
 */
export function useKeyboardShortcuts(options: KeyboardShortcutsOptions = {}) {
  const router = useRouter()
  /** Tracks the first key of a pending two-key chord (currently only "g"). */
  const pendingChord = useRef<string | null>(null)
  /** Timer handle for the 500 ms chord expiry window. */
  const chordTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    /**
     * Global keydown event handler that dispatches to the appropriate
     * shortcut action or starts/completes a chord sequence.
     * @param e - The native keyboard event
     */
    function handleKeyDown(e: KeyboardEvent) {
      // Skip when typing in input/textarea/contenteditable
      const target = e.target as HTMLElement
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) return

      const key = e.key.toLowerCase()

      // Escape - clear any pending chord
      if (key === "escape") {
        pendingChord.current = null
        return
      }

      // Ctrl+N or n - Quick add transaction
      if ((e.ctrlKey && key === "n") || (!e.ctrlKey && !e.metaKey && key === "n" && !pendingChord.current)) {
        e.preventDefault()
        options.onQuickAdd?.()
        return
      }

      // ? - Show shortcuts help
      if (key === "?" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        options.onHelp?.()
        return
      }

      // / or Ctrl+K - Focus search (if search exists)
      if ((key === "/" && !e.ctrlKey) || (e.ctrlKey && key === "k")) {
        e.preventDefault()
        options.onSearch?.()
        return
      }

      // Two-key chord: g then letter
      if (pendingChord.current === "g") {
        pendingChord.current = null
        if (chordTimeout.current) clearTimeout(chordTimeout.current)

        /** Route map for the second key of a "g + letter" navigation chord. */
        const routes: Record<string, string> = {
          d: "/dashboard",
          t: "/transactions",
          a: "/analytics",
          b: "/budget",
          i: "/investments",
          h: "/financial-health",
          g: "/goals",
          p: "/planner",
          s: "/subscriptions",
          x: "/tax",
          l: "/learn",
          n: "/agent",
        }

        if (routes[key]) {
          e.preventDefault()
          router.push(routes[key])
        }
        return
      }

      // Start chord with 'g'
      if (key === "g" && !e.ctrlKey && !e.metaKey) {
        pendingChord.current = "g"
        chordTimeout.current = setTimeout(() => {
          pendingChord.current = null
        }, 500) // 500ms window for second key
        return
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      if (chordTimeout.current) clearTimeout(chordTimeout.current)
    }
  }, [router, options])
}
