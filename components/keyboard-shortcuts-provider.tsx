/**
 * Context provider that wires global keyboard shortcuts to the quick-add dialog
 * and provides an `openQuickAdd` function via React context.
 * Also renders the mobile floating action button.
 * @module components/keyboard-shortcuts-provider
 */
"use client"

import { useState, createContext, useContext, useCallback } from "react"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { QuickAddTransaction } from "@/components/quick-add"
import { IconPlus } from "@tabler/icons-react"

interface ShortcutsContextType {
  openQuickAdd: () => void
}

const ShortcutsContext = createContext<ShortcutsContextType>({
  openQuickAdd: () => {},
})

/** Accesses the keyboard shortcuts context (e.g. `openQuickAdd`). */
export function useShortcuts() {
  return useContext(ShortcutsContext)
}

/** Wraps children with global keyboard shortcut listeners and the quick-add dialog. */
export function KeyboardShortcutsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [quickAddOpen, setQuickAddOpen] = useState(false)

  const openQuickAdd = useCallback(() => setQuickAddOpen(true), [])
  const openHelp = useCallback(() => {
    // Programmatically click the help dialog trigger if it exists
    const helpButton = document.querySelector(
      '[data-help-trigger="true"]'
    ) as HTMLButtonElement | null
    if (helpButton) helpButton.click()
  }, [])

  useKeyboardShortcuts({
    onQuickAdd: openQuickAdd,
    onHelp: openHelp,
  })

  return (
    <ShortcutsContext.Provider value={{ openQuickAdd }}>
      {children}
      <QuickAddTransaction open={quickAddOpen} onOpenChange={setQuickAddOpen} />
      {/* Floating action button for mobile */}
      <button
        onClick={openQuickAdd}
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105 md:hidden"
        aria-label="Quick add transaction"
      >
        <IconPlus className="h-5 w-5" />
      </button>
    </ShortcutsContext.Provider>
  )
}
