"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { IconStar } from "@tabler/icons-react"
import { Skeleton } from "@/components/ui/skeleton"
import type { WidgetComponentProps } from "@/lib/widget-registry"

interface BucketData { monthlyAllocation: number; count: number }

export default function BucketListWidget({}: WidgetComponentProps) {
  const [bucket, setBucket] = useState<BucketData | null>(null)

  useEffect(() => {
    fetch("/api/bucket-list").then(r => r.ok ? r.json() : null).then(data => {
      if (!data?.success) return
      const items = data.items || []
      setBucket({ monthlyAllocation: items.reduce((sum: number, it: Record<string, unknown>) => sum + ((it.monthlyAllocation as number) || 0), 0), count: items.length })
    }).catch(() => {})
  }, [])

  const fmt = (v: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v)

  return (
    <Link href="/goals?tab=bucket-list" className="block p-5 h-full">
      <div className="flex items-center justify-center size-9 rounded-lg bg-neutral-100 mb-2">
        <IconStar className="size-4 text-neutral-600" />
      </div>
      <p className="text-[13px] font-medium text-neutral-500 mb-1">Bucket List</p>
      {bucket ? (
        <>
          <p className="text-sm font-black tracking-tight tabular-nums truncate">{fmt(bucket.monthlyAllocation)}/mo</p>
          <p className="text-[10px] text-muted-foreground">{bucket.count} item{bucket.count !== 1 ? "s" : ""}</p>
        </>
      ) : <Skeleton className="h-4 w-16" />}
    </Link>
  )
}
