"use client"

import * as React from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
import {
  IconSparkles,
  IconRefresh,
  IconReportAnalytics,
  IconTargetArrow,
  IconChartPie,
  IconLoader2,
  IconAlertTriangle,
  IconClock,
  IconBolt,
  IconArrowUpRight,
  IconArrowDownRight,
  IconInfoCircle,
  IconCircleCheck,
} from "@tabler/icons-react"

import { useAuth } from "@/hooks/use-auth"
import { useAiInsight } from "@/hooks/use-ai-insights"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { fadeUp } from "@/lib/motion"
import type { AiInsightType, InsightSection } from "@/lib/ai-types"

/* ─── Accent configuration per card type ─── */

interface InsightMeta {
  type: AiInsightType
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  iconBg: string
  iconColor: string
}

const insightConfig: InsightMeta[] = [
  {
    type: "spending_analysis",
    title: "Spending Analysis",
    description: "AI-powered analysis of your spending patterns and financial health",
    icon: IconReportAnalytics,
    iconBg: "bg-blue-500/10 dark:bg-blue-500/15",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    type: "monthly_budget",
    title: "Monthly Budget",
    description: "Personalized budget allocation for the upcoming month",
    icon: IconTargetArrow,
    iconBg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    type: "weekly_budget",
    title: "Weekly Budget",
    description: "Short-term spending targets for the coming week",
    icon: IconTargetArrow,
    iconBg: "bg-amber-500/10 dark:bg-amber-500/15",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  {
    type: "investment_insights",
    title: "Investment Insights",
    description: "AI analysis of your SIPs, stocks, and mutual fund portfolio",
    icon: IconChartPie,
    iconBg: "bg-purple-500/10 dark:bg-purple-500/15",
    iconColor: "text-purple-600 dark:text-purple-400",
  },
]

/* ─── Relative timestamp helper ─── */

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  })
}

/* ─── Severity styles ─── */

const severityStyles: Record<string, { border: string; bg: string; icon: React.ComponentType<{ className?: string }>; iconColor: string; badge: string; badgeText: string }> = {
  positive: {
    border: "border-emerald-200/70 dark:border-emerald-800/50",
    bg: "bg-emerald-50/50 dark:bg-emerald-950/20",
    icon: IconArrowUpRight,
    iconColor: "text-emerald-600 dark:text-emerald-400",
    badge: "bg-emerald-100 dark:bg-emerald-900/40",
    badgeText: "text-emerald-700 dark:text-emerald-300",
  },
  warning: {
    border: "border-amber-200/70 dark:border-amber-800/50",
    bg: "bg-amber-50/50 dark:bg-amber-950/20",
    icon: IconAlertTriangle,
    iconColor: "text-amber-600 dark:text-amber-400",
    badge: "bg-amber-100 dark:bg-amber-900/40",
    badgeText: "text-amber-700 dark:text-amber-300",
  },
  critical: {
    border: "border-rose-200/70 dark:border-rose-800/50",
    bg: "bg-rose-50/50 dark:bg-rose-950/20",
    icon: IconArrowDownRight,
    iconColor: "text-rose-600 dark:text-rose-400",
    badge: "bg-rose-100 dark:bg-rose-900/40",
    badgeText: "text-rose-700 dark:text-rose-300",
  },
  neutral: {
    border: "border-border/60",
    bg: "bg-muted/30",
    icon: IconInfoCircle,
    iconColor: "text-muted-foreground",
    badge: "bg-muted",
    badgeText: "text-muted-foreground",
  },
}

function getSeverityStyle(severity?: string) {
  return severityStyles[severity || "neutral"] || severityStyles.neutral
}

/* ─── Page component ─── */

export default function AiInsightsPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  const analysis = useAiInsight("spending_analysis")
  const monthlyRecs = useAiInsight("monthly_budget")
  const weeklyRecs = useAiInsight("weekly_budget")
  const investmentInsights = useAiInsight("investment_insights")

  const allInsights = [analysis, monthlyRecs, weeklyRecs, investmentInsights]
  const isAnyRegenerating = allInsights.some((i) => i.isRegenerating)

  const regenerateAll = () => {
    for (const insight of allInsights) {
      insight.regenerate()
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
      } as React.CSSProperties}
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader
          title="AI Recommendations"
          subtitle="AI-powered spending analysis, budget recommendations, and investment insights"
        />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-5 p-5">
            <Tabs defaultValue="spending_analysis" className="flex flex-col gap-4">
              {/* Tab bar with regenerate all */}
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <TabsList className="h-auto w-full justify-start gap-1 bg-muted/50 p-1 sm:w-auto">
                  {insightConfig.map((config) => {
                    const Icon = config.icon
                    return (
                      <TabsTrigger
                        key={config.type}
                        value={config.type}
                        className="gap-1.5 rounded-lg px-3 py-2 text-xs data-[state=active]:shadow-sm"
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{config.title}</span>
                      </TabsTrigger>
                    )
                  })}
                </TabsList>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {allInsights.filter((i) => i.content).length}/{allInsights.length} ready
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={regenerateAll}
                    disabled={isAnyRegenerating}
                    className="h-8 gap-1.5 text-xs"
                  >
                    {isAnyRegenerating ? (
                      <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <IconBolt className="h-3.5 w-3.5" />
                    )}
                    Regenerate All
                  </Button>
                </div>
              </motion.div>

              {/* Tab content panels */}
              {insightConfig.map((config, idx) => (
                <TabsContent key={config.type} value={config.type} className="mt-0">
                  <motion.div
                    variants={fadeUp}
                    initial="hidden"
                    animate="show"
                  >
                    <InsightCard
                      meta={config}
                      insight={allInsights[idx]}
                      featured
                    />
                  </motion.div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

/* ─── Types ─── */

interface InsightHookReturn {
  content: string | null
  sections: InsightSection[] | null
  generatedAt: string | null
  fromCache: boolean
  stale: boolean
  isLoading: boolean
  isRegenerating: boolean
  error: string | null
  regenerate: () => void
}

/* ─── InsightCard ─── */

function InsightCard({
  meta,
  insight,
  featured = false,
}: {
  meta: InsightMeta
  insight: InsightHookReturn
  featured?: boolean
}) {
  const isWorking = insight.isLoading || insight.isRegenerating
  const Icon = meta.icon

  const isApiKeyError =
    insight.error &&
    /api.?key|openrouter|unauthorized|401/i.test(insight.error)

  return (
    <div className="space-y-4">
      {/* Compact header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meta.iconBg}`}
          >
            <Icon className={`h-[18px] w-[18px] ${meta.iconColor}`} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold leading-tight">{meta.title}</h3>
            <p className="text-xs text-muted-foreground leading-snug">
              {meta.description}
            </p>
          </div>
          {insight.generatedAt && (
            <div className="flex items-center gap-1">
              <IconClock className="h-3 w-3 text-muted-foreground/60" />
              <span className="text-[11px] text-muted-foreground/70">
                {relativeTime(insight.generatedAt)}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {insight.fromCache && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              Cached
            </span>
          )}
          {insight.stale && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
              <IconAlertTriangle className="h-3 w-3" />
              Stale
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={insight.regenerate}
            disabled={isWorking}
            className="h-8 shrink-0 gap-1 px-2.5 text-xs"
          >
            {isWorking ? (
              <IconRefresh className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <IconSparkles className="h-3.5 w-3.5" />
            )}
            <span>Regenerate</span>
          </Button>
        </div>
      </div>

      {/* Content — section cards or markdown directly, no wrapper container */}
      {insight.isLoading ? (
        <LoadingSkeleton featured={featured} />
      ) : insight.error && !insight.content ? (
        <ErrorState
          error={insight.error}
          isApiKeyError={!!isApiKeyError}
          onRetry={insight.regenerate}
        />
      ) : insight.content ? (
        <div className="space-y-3">
          {insight.isRegenerating && (
            <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
              <IconRefresh className="h-3.5 w-3.5 animate-spin text-primary" />
              <span className="text-xs font-medium text-primary">
                Regenerating with latest data...
              </span>
            </div>
          )}

          {insight.sections && insight.sections.length > 0 ? (
            <SectionRenderer sections={insight.sections} />
          ) : (
            <div className="prose-finance max-w-none">
              <MarkdownRenderer content={insight.content} />
            </div>
          )}
        </div>
      ) : (
        <EmptyState />
      )}
    </div>
  )
}

/* ─── Section Renderer ─── */

function SectionRenderer({ sections }: { sections: InsightSection[] }) {
  return (
    <div className="grid gap-3">
      {sections.map((section) => (
        <SectionCard key={section.id} section={section} />
      ))}
    </div>
  )
}

function SectionCard({ section }: { section: InsightSection }) {
  const style = getSeverityStyle(section.severity)
  const SeverityIcon = style.icon

  if (section.type === "highlight") {
    return (
      <div className={`rounded-xl border ${style.border} ${style.bg} p-4`}>
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${style.badge}`}>
            <IconCircleCheck className={`h-4 w-4 ${style.iconColor}`} />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {section.title}
            </p>
            <p
              className="text-sm font-medium leading-relaxed"
              dangerouslySetInnerHTML={{ __html: inlineMd(section.highlight || "") }}
            />
          </div>
        </div>
      </div>
    )
  }

  if (section.type === "summary") {
    return (
      <div className={`rounded-xl border ${style.border} ${style.bg} p-4`}>
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${style.badge}`}>
            <SeverityIcon className={`h-4 w-4 ${style.iconColor}`} />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {section.title}
            </p>
            <p
              className="text-sm leading-relaxed text-foreground/90"
              dangerouslySetInnerHTML={{ __html: inlineMd(section.text || "") }}
            />
          </div>
        </div>
      </div>
    )
  }

  // list or numbered_list
  const isNumbered = section.type === "numbered_list"
  return (
    <div className={`rounded-xl border ${style.border} ${style.bg} p-4`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${style.badge}`}>
          <SeverityIcon className={`h-4 w-4 ${style.iconColor}`} />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {section.title}
          </p>
          {section.text && (
            <p
              className="text-sm leading-relaxed text-foreground/90"
              dangerouslySetInnerHTML={{ __html: inlineMd(section.text) }}
            />
          )}
          {section.items && section.items.length > 0 && (
            <ul className="space-y-1.5">
              {section.items.map((item, i) => (
                <li key={i} className="flex gap-2 text-sm leading-relaxed">
                  <span className="mt-0.5 shrink-0 text-xs font-medium text-muted-foreground/70">
                    {isNumbered ? `${i + 1}.` : "\u2022"}
                  </span>
                  <span
                    className="text-foreground/90"
                    dangerouslySetInnerHTML={{ __html: inlineMd(item) }}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Loading skeleton ─── */

function LoadingSkeleton({ featured }: { featured?: boolean }) {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-2/5" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      {featured && (
        <>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </>
      )}
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-2/3" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-14 rounded-full" />
      </div>
    </div>
  )
}

/* ─── Error state ─── */

function ErrorState({
  error,
  isApiKeyError,
  onRetry,
}: {
  error: string
  isApiKeyError: boolean
  onRetry: () => void
}) {
  return (
    <div className="rounded-lg border border-rose-200/80 bg-rose-50/50 p-4 dark:border-rose-900/50 dark:bg-rose-950/30">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-900/50">
          <IconAlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
        </div>
        <div className="min-w-0 space-y-2">
          {isApiKeyError ? (
            <p className="text-sm font-medium text-rose-700 dark:text-rose-300">
              AI Insights requires an OpenRouter API key. Add{" "}
              <code className="rounded bg-rose-100 px-1.5 py-0.5 text-xs dark:bg-rose-900/50">
                OPENROUTER_API_KEY
              </code>{" "}
              to your environment variables.
            </p>
          ) : (
            <p className="text-sm font-medium text-rose-700 dark:text-rose-300">
              {error}
            </p>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="h-7 gap-1 text-xs"
          >
            <IconRefresh className="h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ─── Empty / waiting state ─── */

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
        <IconLoader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground/70">
        Generating insight...
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        This may take a moment
      </p>
    </div>
  )
}

/* ─── Markdown renderer (fallback for non-structured responses) ─── */

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
          <span className="shrink-0 text-muted-foreground">-</span>
          <span dangerouslySetInnerHTML={{ __html: inlineMd(trimmed.slice(2)) }} />
        </div>
      )
    } else if (/^\d+\.\s/.test(trimmed)) {
      const text = trimmed.replace(/^\d+\.\s/, "")
      const num = trimmed.match(/^(\d+)\./)?.[1]
      elements.push(
        <div key={key++} className="flex gap-2 pl-2">
          <span className="shrink-0 text-muted-foreground">{num}.</span>
          <span dangerouslySetInnerHTML={{ __html: inlineMd(text) }} />
        </div>
      )
    } else {
      elements.push(
        <p key={key++} dangerouslySetInnerHTML={{ __html: inlineMd(trimmed) }} />
      )
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
