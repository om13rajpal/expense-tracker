/**
 * Widget registry — types, size map, catalog, and default layout.
 * Central source of truth for the customizable dashboard widget system.
 * @module lib/widget-registry
 */

import type { ComponentType } from "react"

/* ─── Size Presets (12-column grid) ─── */

export type WidgetSize = "small" | "medium" | "large" | "full"

export interface GridDimensions {
  w: number
  h: number
}

export const WIDGET_SIZES: Record<WidgetSize, GridDimensions> = {
  small:  { w: 3, h: 3 },
  medium: { w: 6, h: 3 },
  large:  { w: 6, h: 6 },
  full:   { w: 12, h: 3 },
}

/* ─── Widget Component Props ─── */

export interface WidgetComponentProps {
  /** Current grid width of the widget */
  width: number
  /** Current grid height of the widget */
  height: number
  /** Whether the dashboard is in edit mode */
  isEditing: boolean
}

/* ─── Widget Definition ─── */

export interface WidgetDefinition {
  id: string
  name: string
  description: string
  category: "overview" | "spending" | "goals" | "investments" | "tools"
  defaultSize: WidgetSize
  /** Allowed sizes the user can pick from */
  allowedSizes: WidgetSize[]
  /** Lazy-loaded component */
  component: () => Promise<{ default: ComponentType<WidgetComponentProps> }>
  /** Icon name from @tabler/icons-react */
  icon: string
}

/* ─── Layout Item ─── */

export interface WidgetLayoutItem {
  i: string        // widget id (matches WidgetDefinition.id)
  x: number
  y: number
  w: number
  h: number
  size: WidgetSize  // current preset size label
}

/* ─── Persisted Layout ─── */

export interface DashboardLayout {
  version: number
  widgets: WidgetLayoutItem[]
  updatedAt: string
}

/* ─── Widget Catalog ─── */

export const WIDGET_REGISTRY: WidgetDefinition[] = [
  // ── Overview ──
  {
    id: "net-position",
    name: "Net Position",
    description: "Current balance with sparkline and income/expenses breakdown",
    category: "overview",
    defaultSize: "large",
    allowedSizes: ["medium", "large"],
    component: () => import("@/components/dashboard/widgets/net-position-widget"),
    icon: "IconWallet",
  },
  {
    id: "daily-budget",
    name: "Daily Budget",
    description: "Daily spend limit with ring progress",
    category: "overview",
    defaultSize: "small",
    allowedSizes: ["small", "medium"],
    component: () => import("@/components/dashboard/widgets/daily-budget-widget"),
    icon: "IconTarget",
  },
  {
    id: "month-progress",
    name: "Month Progress",
    description: "Days elapsed, savings rate, and month timeline",
    category: "overview",
    defaultSize: "small",
    allowedSizes: ["small", "medium"],
    component: () => import("@/components/dashboard/widgets/month-progress-widget"),
    icon: "IconCalendar",
  },
  {
    id: "ai-highlights",
    name: "AI Highlights",
    description: "AI-powered spending analysis and recommendations",
    category: "overview",
    defaultSize: "medium",
    allowedSizes: ["medium", "large", "full"],
    component: () => import("@/components/dashboard/widgets/ai-highlights-widget"),
    icon: "IconSparkles",
  },
  {
    id: "monthly-trend",
    name: "Monthly Trend",
    description: "6-month bar chart comparing income and expenses",
    category: "spending",
    defaultSize: "large",
    allowedSizes: ["medium", "large"],
    component: () => import("@/components/dashboard/widgets/monthly-trend-widget"),
    icon: "IconTrendingUp",
  },
  {
    id: "top-spending",
    name: "Top Spending",
    description: "Top expense categories with percentage bars",
    category: "spending",
    defaultSize: "medium",
    allowedSizes: ["small", "medium", "large"],
    component: () => import("@/components/dashboard/widgets/top-spending-widget"),
    icon: "IconReceipt2",
  },

  // ── Feature Tiles ──
  {
    id: "renewals",
    name: "Renewals",
    description: "Upcoming subscription renewals this week",
    category: "spending",
    defaultSize: "small",
    allowedSizes: ["small", "medium"],
    component: () => import("@/components/dashboard/widgets/renewals-widget"),
    icon: "IconRepeat",
  },
  {
    id: "bucket-list",
    name: "Bucket List",
    description: "Monthly allocation and item count for your goals",
    category: "goals",
    defaultSize: "small",
    allowedSizes: ["small", "medium"],
    component: () => import("@/components/dashboard/widgets/bucket-list-widget"),
    icon: "IconStar",
  },
  {
    id: "streak",
    name: "Streak",
    description: "Gamification level and current day streak",
    category: "goals",
    defaultSize: "small",
    allowedSizes: ["small", "medium"],
    component: () => import("@/components/dashboard/widgets/streak-widget"),
    icon: "IconFlame",
  },
  {
    id: "splits",
    name: "Splits",
    description: "Net balance across your split groups",
    category: "tools",
    defaultSize: "small",
    allowedSizes: ["small", "medium"],
    component: () => import("@/components/dashboard/widgets/splits-widget"),
    icon: "IconUsers",
  },

  // ── New Widgets ──
  {
    id: "investments-snapshot",
    name: "Investments",
    description: "Portfolio value with top holdings and P&L",
    category: "investments",
    defaultSize: "medium",
    allowedSizes: ["small", "medium", "large"],
    component: () => import("@/components/dashboard/widgets/investments-snapshot-widget"),
    icon: "IconTrendingUp",
  },
  {
    id: "upcoming-bills",
    name: "Upcoming Bills",
    description: "Next 5 bills with due dates and countdown",
    category: "spending",
    defaultSize: "medium",
    allowedSizes: ["small", "medium", "large"],
    component: () => import("@/components/dashboard/widgets/upcoming-bills-widget"),
    icon: "IconReceipt2",
  },
  {
    id: "cash-flow-forecast",
    name: "Cash Flow",
    description: "Projected income vs expenses for next 30 days",
    category: "overview",
    defaultSize: "medium",
    allowedSizes: ["medium", "large"],
    component: () => import("@/components/dashboard/widgets/cash-flow-forecast-widget"),
    icon: "IconTrendingUp",
  },
  {
    id: "recent-transactions",
    name: "Recent Txns",
    description: "Last 5 transactions with category and amount",
    category: "spending",
    defaultSize: "medium",
    allowedSizes: ["small", "medium", "large"],
    component: () => import("@/components/dashboard/widgets/recent-transactions-widget"),
    icon: "IconReceipt2",
  },
  {
    id: "tax-overview",
    name: "Tax Overview",
    description: "Tax bracket and estimated liability for the year",
    category: "tools",
    defaultSize: "medium",
    allowedSizes: ["small", "medium"],
    component: () => import("@/components/dashboard/widgets/tax-overview-widget"),
    icon: "IconReceipt2",
  },
  {
    id: "quick-expense",
    name: "Quick Expense",
    description: "Add an expense right from the dashboard",
    category: "tools",
    defaultSize: "small",
    allowedSizes: ["small", "medium"],
    component: () => import("@/components/dashboard/widgets/quick-expense-widget"),
    icon: "IconWallet",
  },
]

/* ─── Lookup helper ─── */

export function getWidgetDef(id: string): WidgetDefinition | undefined {
  return WIDGET_REGISTRY.find(w => w.id === id)
}

/* ─── Default Layout (matches current static dashboard) ─── */

export const DEFAULT_DASHBOARD_LAYOUT: WidgetLayoutItem[] = [
  // Row 0-1: hero + two small tiles + AI
  { i: "net-position",  x: 0,  y: 0, w: 6, h: 6, size: "large" },
  { i: "daily-budget",  x: 6,  y: 0, w: 3, h: 3, size: "small" },
  { i: "month-progress", x: 9, y: 0, w: 3, h: 3, size: "small" },
  { i: "ai-highlights", x: 6,  y: 3, w: 6, h: 3, size: "medium" },
  // Row 2-3: chart + categories + small tiles
  { i: "monthly-trend", x: 0,  y: 6, w: 6, h: 6, size: "large" },
  { i: "top-spending",  x: 6,  y: 6, w: 6, h: 3, size: "medium" },
  { i: "renewals",      x: 6,  y: 9, w: 3, h: 3, size: "small" },
  { i: "bucket-list",   x: 9,  y: 9, w: 3, h: 3, size: "small" },
  // Row 4: last two small tiles
  { i: "streak",        x: 0,  y: 12, w: 3, h: 3, size: "small" },
  { i: "splits",        x: 3,  y: 12, w: 3, h: 3, size: "small" },
]
