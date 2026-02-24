/**
 * Recent commands history for the Spotlight command palette.
 *
 * Persists the last 5 user commands in localStorage for quick re-execution.
 * Handles SSR gracefully by checking for `window` availability.
 *
 * @module lib/command-palette/recent-commands
 */

/** The operational mode of a recent command. */
type CommandMode =
  | "navigation"
  | "expense"
  | "calculator"
  | "search"
  | "quick-action"
  | "ai-query"
  | "idle"

/** A single recently executed command with its context. */
interface RecentCommand {
  text: string
  mode: CommandMode
  timestamp: number
}

/** localStorage key for persisting recent commands. */
const STORAGE_KEY = "expense-tracker-recent-commands"
/** Maximum number of recent commands to retain. */
const MAX_COMMANDS = 5

/**
 * Retrieve the list of recently executed commands from localStorage.
 *
 * @returns Array of recent commands (newest first), or empty array on SSR or error.
 */
export function getRecentCommands(): RecentCommand[] {
  if (typeof window === "undefined") return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    return JSON.parse(stored) as RecentCommand[]
  } catch {
    return []
  }
}

/**
 * Add a command to the recent commands history.
 *
 * Deduplicates by text, prepends to the list, and trims to `MAX_COMMANDS`.
 *
 * @param text - The command text as entered by the user.
 * @param mode - The operational mode of the command.
 */
export function addRecentCommand(text: string, mode: CommandMode): void {
  if (typeof window === "undefined") return
  try {
    const commands = getRecentCommands()
    // Remove duplicate if exists
    const filtered = commands.filter((c) => c.text !== text)
    // Add to front
    filtered.unshift({ text, mode, timestamp: Date.now() })
    // Keep only last MAX_COMMANDS
    const trimmed = filtered.slice(0, MAX_COMMANDS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clear all recent commands from localStorage.
 */
export function clearRecentCommands(): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore storage errors
  }
}
