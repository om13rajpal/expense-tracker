/**
 * Reusable skeleton loading placeholders for charts, metrics, dashboards,
 * and data tables. Used throughout the app while data is being fetched.
 * @module components/chart-skeleton
 */
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

/**
 * Skeleton for chart cards while data is loading.
 * Mimics the shape of a card with header + chart area.
 */
export function ChartSkeleton({
  height = 300,
  className,
}: {
  height?: number
  className?: string
}) {
  return (
    <Card className={`border border-border/70 ${className || ""}`}>
      <CardHeader className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-60" />
      </CardHeader>
      <CardContent>
        <div className="relative" style={{ height }}>
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between w-10">
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-3 w-6" />
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-3 w-6" />
          </div>
          {/* Chart area */}
          <div className="ml-12 h-full flex items-end gap-2 pb-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex-1 flex flex-col justify-end">
                <Skeleton
                  className="w-full rounded-t-md"
                  style={{
                    height: `${30 + Math.random() * 50}%`,
                  }}
                />
              </div>
            ))}
          </div>
          {/* X-axis labels */}
          <div className="absolute bottom-0 left-12 right-0 flex justify-between">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-8" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Grid of metric tile skeletons for loading states.
 */
export function MetricsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid gap-4 md:grid-cols-2 xl:grid-cols-${Math.min(count, 4)}`}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="border border-border/70">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-28" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/**
 * Full-page dashboard loading skeleton.
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <MetricsSkeleton count={2} />
      {/* Bridge skeleton */}
      <Card className="border border-border/70">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="text-center space-y-2">
                <Skeleton className="h-3 w-16 mx-auto" />
                <Skeleton className="h-6 w-20 mx-auto" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <MetricsSkeleton count={4} />
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartSkeleton className="lg:col-span-2" />
        <ChartSkeleton height={250} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartSkeleton height={280} />
        <ChartSkeleton height={280} />
      </div>
    </div>
  )
}

/**
 * Table skeleton for loading lists of data.
 */
export function TableSkeleton({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <Card className="border border-border/70">
      <CardContent className="p-0">
        <div className="border-b px-4 py-3 flex gap-8">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-20" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-8 px-4 py-3 border-b last:border-0">
            {Array.from({ length: cols }).map((_, j) => (
              <Skeleton key={j} className="h-4 w-16 flex-1" />
            ))}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
