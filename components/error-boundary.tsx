/**
 * React error boundaries for isolating component failures.
 * `ErrorBoundary` renders a retry card; `SectionErrorBoundary` provides a
 * lighter fallback scoped to a single dashboard section.
 * @module components/error-boundary
 */
"use client"

import * as React from "react"
import { IconAlertTriangle, IconRefresh } from "@tabler/icons-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/** Class-based error boundary with a "Try Again" button fallback. */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <Card className="border border-rose-200 dark:border-rose-900">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <IconAlertTriangle className="h-10 w-10 text-rose-500 mb-3" />
            <h3 className="text-lg font-semibold text-rose-700 dark:text-rose-300">
              Something went wrong
            </h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-md">
              {this.state.error?.message || "An unexpected error occurred while rendering this section."}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              <IconRefresh className="mr-1 h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}

/**
 * A lightweight wrapper for sections that may fail independently.
 * Catches errors in a card-scoped boundary so the rest of the page stays intact.
 */
export function SectionErrorBoundary({
  children,
  name,
}: {
  children: React.ReactNode
  name?: string
}) {
  return (
    <ErrorBoundary
      fallback={
        <Card className="border border-rose-200/50 dark:border-rose-900/50">
          <CardContent className="flex items-center gap-3 py-6">
            <IconAlertTriangle className="h-5 w-5 text-rose-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-rose-700 dark:text-rose-300">
                Failed to load{name ? ` ${name}` : " this section"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Try refreshing the page. If the problem persists, check the browser console.
              </p>
            </div>
          </CardContent>
        </Card>
      }
    >
      {children}
    </ErrorBoundary>
  )
}
