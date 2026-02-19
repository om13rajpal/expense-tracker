import type { ComponentType } from "react"

export type SpotlightCategory =
  | "navigation"
  | "transaction"
  | "action"
  | "calculator"
  | "expense"
  | "ai"

export interface SpotlightResult {
  id: string
  category: SpotlightCategory
  title: string
  subtitle?: string
  icon?: ComponentType<{ className?: string }>
  score: number
  badge?: { label: string; className: string }
  amount?: number
  amountType?: "income" | "expense"
  date?: string
  url?: string
  onSelect?: () => void
  expression?: string
  expenseData?: {
    description: string
    amount: number
    category: string
    paymentMethod: string
  }
  aiQuery?: string
}

export interface ResultGroup {
  category: SpotlightCategory
  label: string
  results: SpotlightResult[]
}

export interface SpotlightProvider {
  category: SpotlightCategory
  search(query: string, signal?: AbortSignal): SpotlightResult[] | Promise<SpotlightResult[]>
}

export interface SpotlightState {
  open: boolean
  query: string
  groups: ResultGroup[]
  activeIndex: number
  loading: boolean
  aiExpanded: boolean
  aiQuery: string
}

export type SpotlightAction =
  | { type: "OPEN" }
  | { type: "CLOSE" }
  | { type: "SET_QUERY"; query: string }
  | { type: "SET_GROUPS"; groups: ResultGroup[] }
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "MOVE_NEXT" }
  | { type: "MOVE_PREV" }
  | { type: "SET_ACTIVE"; index: number }
  | { type: "EXPAND_AI"; query: string }
  | { type: "COLLAPSE_AI" }
