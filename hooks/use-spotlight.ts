"use client"

import { useReducer, useCallback, useRef, useEffect } from "react"
import type { SpotlightState, SpotlightAction, ResultGroup } from "@/lib/spotlight/types"
import { searchSync, searchAsync, flattenResults } from "@/lib/spotlight/orchestrator"
import { getRecentCommands } from "@/lib/command-palette/recent-commands"

const initialState: SpotlightState = {
  open: false,
  query: "",
  groups: [],
  activeIndex: 0,
  loading: false,
  aiExpanded: false,
  aiQuery: "",
}

function getTotalResults(groups: ResultGroup[]): number {
  return groups.reduce((sum, g) => sum + g.results.length, 0)
}

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

export function useSpotlight() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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

  const open = useCallback(() => dispatch({ type: "OPEN" }), [])
  const close = useCallback(() => dispatch({ type: "CLOSE" }), [])
  const setQuery = useCallback((q: string) => dispatch({ type: "SET_QUERY", query: q }), [])
  const moveNext = useCallback(() => dispatch({ type: "MOVE_NEXT" }), [])
  const movePrev = useCallback(() => dispatch({ type: "MOVE_PREV" }), [])
  const setActive = useCallback((i: number) => dispatch({ type: "SET_ACTIVE", index: i }), [])
  const expandAI = useCallback((q: string) => dispatch({ type: "EXPAND_AI", query: q }), [])
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
