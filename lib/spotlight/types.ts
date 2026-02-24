/**
 * Type definitions for the Spotlight search/command palette system.
 *
 * Defines the category taxonomy, result shapes, provider interface, state
 * management types, and reducer actions for the unified search overlay
 * triggered by Cmd+K / Ctrl+K.
 *
 * @module lib/spotlight/types
 */

import type { ComponentType } from "react"

/**
 * Categories of results that can appear in the Spotlight overlay.
 * Each category is rendered as a distinct section with its own heading.
 */
export type SpotlightCategory =
  | "navigation"
  | "transaction"
  | "action"
  | "calculator"
  | "expense"
  | "ai"

/**
 * A single search result item displayed in the Spotlight overlay.
 * Contains display data, scoring for ranking, and action handlers.
 */
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

/** A group of search results sharing the same category, rendered as a section. */
export interface ResultGroup {
  category: SpotlightCategory
  label: string
  results: SpotlightResult[]
}

/** Interface for a search provider that generates results for a query. */
export interface SpotlightProvider {
  category: SpotlightCategory
  search(query: string, signal?: AbortSignal): SpotlightResult[] | Promise<SpotlightResult[]>
}

/** State shape for the Spotlight overlay managed by the reducer. */
export interface SpotlightState {
  open: boolean
  query: string
  groups: ResultGroup[]
  activeIndex: number
  loading: boolean
  aiExpanded: boolean
  aiQuery: string
}

/** Discriminated union of actions dispatched to the Spotlight state reducer. */
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
