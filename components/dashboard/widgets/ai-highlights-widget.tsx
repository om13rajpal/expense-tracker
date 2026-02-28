"use client"

import Link from "next/link"
import { IconSparkles } from "@tabler/icons-react"
import { AiInsightsWidget } from "@/components/ai-insights-widget"
import type { WidgetComponentProps } from "@/lib/widget-registry"

export default function AiHighlightsWidget({}: WidgetComponentProps) {
  return (
    <div className="p-6 bg-gradient-to-br from-primary/[0.04] to-transparent">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <IconSparkles className="size-4 text-primary" />
          AI Highlights
        </h3>
        <Link href="/ai?tab=reports" className="text-[11px] text-primary hover:underline font-medium">
          View all &rarr;
        </Link>
      </div>
      <AiInsightsWidget compact />
    </div>
  )
}
