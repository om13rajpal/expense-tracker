"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

interface KeyboardShortcutsOptions {
  onQuickAdd?: () => void
  onSearch?: () => void
  onHelp?: () => void
}

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions = {}) {
  const router = useRouter()
  const pendingChord = useRef<string | null>(null)
  const chordTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
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
