/**
 * Spotlight / command-palette hook.
 * Powers the Cmd+K / Ctrl+K overlay with synchronous and asynchronous
 * search providers, keyboard navigation, and an expandable AI query mode.
 * @module hooks/use-spotlight
 */
"use client"

import { useReducer, useCallback, useRef, useEffect } from "react"
import type { SpotlightState, SpotlightAction, ResultGroup } from "@/lib/spotlight/types"
import { searchSync, searchAsync, flattenResults } from "@/lib/spotlight/orchestrator"
import { getRecentCommands } from "@/lib/command-palette/recent-commands"

/** Default spotlight state when the overlay is closed. */
const initialState: SpotlightState = {
  open: false,
  query: "",
  groups: [],
  activeIndex: 0,
  loading: false,
  aiExpanded: false,
  aiQuery: "",
}

/**
 * Calculates the total number of results across all result groups.
 * Used for bounds-checking the active index during keyboard navigation.
 * @param groups - Array of grouped search results
 * @returns The total count of individual results across all groups
 */
function getTotalResults(groups: ResultGroup[]): number {
  return groups.reduce((sum, g) => sum + g.results.length, 0)
}

/**
 * Pure reducer that manages all spotlight state transitions.
 * Handles opening/closing, query changes, result updates, keyboard
 * navigation (next/prev/set), loading state, and AI expansion.
 * @param state - Current spotlight state
 * @param action - The dispatched action describing the state change
 * @returns The new spotlight state
 */
function reducer(state: SpotlightState, action: SpotlightAction): SpotlightState {
  switch (action.type) {
    case "OPEN":
      return { ...initialState, open: true }
    case "CLOSE":
      return { ...initialState }
    case "SET_QUERY":
      return { ...state, query: action.query, activeIndex: 0, aiExpanded: false }
    case "SET_GROUPS":
      return {
        ...state,
        groups: action.groups,
        activeIndex: Math.min(state.activeIndex, Math.max(0, getTotalResults(action.groups) - 1)),
      }
    case "SET_LOADING":
      return { ...state, loading: action.loading }
    case "MOVE_NEXT": {
      const total = getTotalResults(state.groups)
      if (total === 0) return state
      return { ...state, activeIndex: (state.activeIndex + 1) % total }
    }
    case "MOVE_PREV": {
      const total = getTotalResults(state.groups)
      if (total === 0) return state
      return { ...state, activeIndex: (state.activeIndex - 1 + total) % total }
    }
    case "SET_ACTIVE":
      return { ...state, activeIndex: action.index }
    case "EXPAND_AI":
      return { ...state, aiExpanded: true, aiQuery: action.query }
    case "COLLAPSE_AI":
      return { ...state, aiExpanded: false }
    default:
      return state
  }
}

/**
 * Provides complete spotlight (command palette) functionality including
 * search, keyboard navigation, and AI query expansion.
 *
 * **Search behaviour:**
 * - Synchronous providers (page routes, commands) run immediately on keystroke
 * - Asynchronous providers (transaction search, AI suggestions) are debounced by 200 ms
 * - Previous async searches are aborted when a new keystroke arrives
 * - When the query is empty and the overlay is open, recent commands are shown instead
 *
 * **Keyboard shortcuts:**
 * - `Cmd+K` / `Ctrl+K` or `Cmd+Space` toggles the overlay open/closed
 *
 * @returns An object containing:
 *   - `state` - The full SpotlightState (open, query, groups, activeIndex, loading, aiExpanded, aiQuery)
 *   - `flat` - Flattened array of all search results across groups
 *   - `activeResult` - The currently highlighted result object, or null
 *   - `recentCommands` - Array of recently used commands (shown when query is empty)
 *   - `open()` - Opens the spotlight overlay
 *   - `close()` - Closes the spotlight overlay and resets state
 *   - `setQuery(q)` - Updates the search query and triggers providers
 *   - `moveNext()` - Moves the active highlight to the next result (wraps around)
 *   - `movePrev()` - Moves the active highlight to the previous result (wraps around)
 *   - `setActive(i)` - Sets the active highlight to a specific index (e.g. on hover)
 *   - `expandAI(q)` - Expands the AI query panel with the given query
 *   - `collapseAI()` - Collapses the AI query panel
 */
export function useSpotlight() {
  const [state, dispatch] = useReducer(reducer, initialState)
  /** Controller to abort in-flight async search requests when a new query arrives. */
  const abortRef = useRef<AbortController | null>(null)
  /** Timer handle for the 200 ms debounce on async search providers. */
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Monotonically increasing ID to detect stale async search responses. */
  const searchIdRef = useRef(0)

  // Run search when query changes
  useEffect(() => {
    if (!state.open) return

    const query = state.query

    // Cancel previous async search
    abortRef.current?.abort()
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!query.trim()) {
      dispatch({ type: "SET_GROUPS", groups: [] })
      dispatch({ type: "SET_LOADING", loading: false })
      return
    }

    // Run sync providers immediately
    const syncResult = searchSync(query)
    const syncResults = syncResult.groups.flatMap((g) => g.results)
    dispatch({ type: "SET_GROUPS", groups: syncResult.groups })

    // Debounce async providers
    if (syncResult.hasAsync) {
      dispatch({ type: "SET_LOADING", loading: true })
      const currentSearchId = ++searchIdRef.current
      const controller = new AbortController()
      abortRef.current = controller

      debounceRef.current = setTimeout(async () => {
        try {
          const groups = await searchAsync(query, syncResults, controller.signal)
          if (searchIdRef.current === currentSearchId && !controller.signal.aborted) {
            dispatch({ type: "SET_GROUPS", groups })
          }
        } catch {
          // Aborted or failed, ignore
        } finally {
          if (searchIdRef.current === currentSearchId) {
            dispatch({ type: "SET_LOADING", loading: false })
          }
        }
      }, 200)
    }

    return () => {
      abortRef.current?.abort()
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [state.query, state.open])

  // Global keyboard shortcut: Cmd+K / Ctrl+K and Cmd+Space
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === " ")) {
        e.preventDefault()
        if (state.open) dispatch({ type: "CLOSE" })
        else dispatch({ type: "OPEN" })
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [state.open])

  /** Opens the spotlight overlay, resetting all state to defaults. */
  const open = useCallback(() => dispatch({ type: "OPEN" }), [])
  /** Closes the spotlight overlay and resets all state. */
  const close = useCallback(() => dispatch({ type: "CLOSE" }), [])
  /** Updates the search query, resets the active index, and triggers search providers. */
  const setQuery = useCallback((q: string) => dispatch({ type: "SET_QUERY", query: q }), [])
  /** Moves the keyboard highlight to the next result, wrapping from last to first. */
  const moveNext = useCallback(() => dispatch({ type: "MOVE_NEXT" }), [])
  /** Moves the keyboard highlight to the previous result, wrapping from first to last. */
  const movePrev = useCallback(() => dispatch({ type: "MOVE_PREV" }), [])
  /** Sets the keyboard highlight to a specific index (used for mouse hover). */
  const setActive = useCallback((i: number) => dispatch({ type: "SET_ACTIVE", index: i }), [])
  /** Expands the inline AI query panel with the given query text. */
  const expandAI = useCallback((q: string) => dispatch({ type: "EXPAND_AI", query: q }), [])
  /** Collapses the inline AI query panel. */
  const collapseAI = useCallback(() => dispatch({ type: "COLLAPSE_AI" }), [])

  const flat = flattenResults(state.groups)
  const activeResult = flat[state.activeIndex] ?? null
  const recentCommands = state.open && !state.query.trim() ? getRecentCommands() : []

  return {
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
  }
}
