type CommandMode =
  | "navigation"
  | "expense"
  | "calculator"
  | "search"
  | "quick-action"
  | "ai-query"
  | "idle"

interface RecentCommand {
  text: string
  mode: CommandMode
  timestamp: number
}

const STORAGE_KEY = "expense-tracker-recent-commands"
const MAX_COMMANDS = 5

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

export function clearRecentCommands(): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore storage errors
  }
}
