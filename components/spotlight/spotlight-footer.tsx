/**
 * Footer bar for the Spotlight dialog showing keyboard shortcut hints
 * (arrow keys to navigate, Enter to select, Escape to close).
 * @module components/spotlight/spotlight-footer
 */
"use client"

/** Renders a row of keyboard shortcut badges at the bottom of the Spotlight dialog. */
export function SpotlightFooter() {
  return (
    <div className="flex items-center gap-3 border-t border-border/40 px-4 py-2">
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
        <kbd className="rounded border border-border/50 bg-muted/40 px-1 py-0.5 font-mono text-[10px]">↑↓</kbd>
        <span>navigate</span>
      </div>
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
        <kbd className="rounded border border-border/50 bg-muted/40 px-1 py-0.5 font-mono text-[10px]">↵</kbd>
        <span>select</span>
      </div>
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
        <kbd className="rounded border border-border/50 bg-muted/40 px-1 py-0.5 font-mono text-[10px]">esc</kbd>
        <span>close</span>
      </div>
    </div>
  )
}
