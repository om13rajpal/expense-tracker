"use client"

import * as React from "react"
import { IconSparkles, IconRefresh, IconArrowRight } from "@tabler/icons-react"
import Link from "next/link"

import { useAiInsight } from "@/hooks/use-ai-insights"
import { InsightMarkdown } from "@/components/insight-markdown"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

interface AiInsightsWidgetProps {
  compact?: boolean
}

export function AiInsightsWidget({ compact = false }: AiInsightsWidgetProps) {
  const insight = useAiInsight("spending_analysis")

  // Truncate content for compact widget view
  const displayText = React.useMemo(() => {
    if (!insight.content) return null
    if (!compact) return insight.content
    const truncated = insight.content.slice(0, 300)
    const lastNewline = truncated.lastIndexOf("\n")
    return (lastNewline > 100 ? truncated.slice(0, lastNewline) : truncated) + "..."
  }, [insight.content, compact])

  const isWorking = insight.isLoading || insight.isRegenerating

  return (
    <Card className="border border-border/70">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <IconSparkles className="h-5 w-5 text-amber-500" />
          <CardTitle className="text-base">AI Insights</CardTitle>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={insight.regenerate}
            disabled={isWorking}
            className="h-8 px-2"
          >
            <IconRefresh className={`h-4 w-4 ${isWorking ? "animate-spin" : ""}`} />
            <span className="ml-1 text-xs">Refresh</span>
          </Button>
          {compact && (
            <Button variant="ghost" size="sm" asChild className="h-8 px-2">
              <Link href="/ai-insights">
                <IconArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {insight.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : insight.error && !insight.content ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 dark:border-rose-900 dark:bg-rose-950">
            <p className="text-sm text-rose-700 dark:text-rose-300">{insight.error}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Make sure OPENROUTER_API_KEY is configured in your .env.local
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={insight.regenerate}
            >
              <IconRefresh className="mr-1 h-3 w-3" />
              Retry
            </Button>
          </div>
        ) : displayText ? (
          <div className="space-y-2">
            <InsightMarkdown content={displayText} />
            {insight.generatedAt && (
              <p className="text-xs text-muted-foreground pt-2">
                Generated {new Date(insight.generatedAt).toLocaleString("en-IN")}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

