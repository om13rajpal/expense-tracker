/**
 * TanStack React Query client provider with global defaults.
 * Configures stale time, cache GC, retry policy, and mutation error toasts
 * for the entire application.
 * @module components/providers/query-provider
 */
"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

/**
 * Wraps the application in a `QueryClientProvider` with sensible defaults:
 * 5-minute stale time, 10-minute garbage collection, 2 retries with
 * exponential back-off, and a global mutation error handler that shows
 * a Sonner toast.
 * @param children - React subtree that needs access to the query client.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
            refetchOnWindowFocus: false,
            retry: 2,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
          },
          mutations: {
            onError: (error) => {
              const message = error instanceof Error ? error.message : "Operation failed"
              toast.error("Error", { description: message })
            },
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
