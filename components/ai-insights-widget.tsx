"use client"

import * as React from "react"
import { IconSparkles, IconRefresh, IconArrowRight } from "@tabler/icons-react"
import Link from "next/link"

import { useAiInsight } from "@/hooks/use-ai-insights"
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
            <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed [&>h1]:text-base [&>h2]:text-sm [&>h2]:font-semibold [&>h3]:text-sm [&>ul]:my-1 [&>ol]:my-1 [&>p]:my-1">
              <MarkdownRenderer content={displayText} />
            </div>
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

function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split("\n")
  const elements: React.ReactNode[] = []
  let key = 0

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      elements.push(<br key={key++} />)
    } else if (trimmed.startsWith("### ")) {
      elements.push(<h3 key={key++}>{trimmed.slice(4)}</h3>)
    } else if (trimmed.startsWith("## ")) {
      elements.push(<h2 key={key++}>{trimmed.slice(3)}</h2>)
    } else if (trimmed.startsWith("# ")) {
      elements.push(<h1 key={key++}>{trimmed.slice(2)}</h1>)
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      elements.push(
        <div key={key++} className="flex gap-2 pl-2">
          <span className="text-muted-foreground">-</span>
          <span dangerouslySetInnerHTML={{ __html: inlineMd(trimmed.slice(2)) }} />
        </div>
      )
    } else if (/^\d+\.\s/.test(trimmed)) {
      const text = trimmed.replace(/^\d+\.\s/, "")
      const num = trimmed.match(/^(\d+)\./)?.[1]
      elements.push(
        <div key={key++} className="flex gap-2 pl-2">
          <span className="text-muted-foreground">{num}.</span>
          <span dangerouslySetInnerHTML={{ __html: inlineMd(text) }} />
        </div>
      )
    } else {
      elements.push(<p key={key++} dangerouslySetInnerHTML={{ __html: inlineMd(trimmed) }} />)
    }
  }

  return <>{elements}</>
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function inlineMd(text: string): string {
  const escaped = escapeHtml(text)
  return escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, '<code class="rounded bg-muted px-1 py-0.5 text-xs">$1</code>')
}
