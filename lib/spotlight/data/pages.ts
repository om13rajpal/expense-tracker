/**
 * Page navigation entries and quick actions for the Spotlight overlay.
 *
 * Defines the searchable pages and actions with their icons, URLs, and
 * keyword associations for fuzzy matching in the navigation provider.
 *
 * @module lib/spotlight/data/pages
 */

import {
  IconDashboard,
  IconReceipt2,
  IconPigMoney,
  IconTargetArrow,
  IconTrendingUp,
  IconFileInvoice,
  IconSparkles,
  IconPlus,
  IconCoinRupee,
  IconMessageChatbot,
  IconRefresh,
  IconTrophy,
  IconSettings,
} from "@tabler/icons-react"
import type { ComponentType } from "react"

/** A navigable page or action entry in the Spotlight search index. */
export interface PageEntry {
  label: string
  url: string
  icon: ComponentType<{ className?: string }>
  keywords: string[]
}

/** All navigable pages in the Finova application with search keywords. */
export const pages: PageEntry[] = [
  { label: "Dashboard", url: "/dashboard", icon: IconDashboard, keywords: ["home", "overview", "summary"] },
  { label: "Money", url: "/money", icon: IconReceipt2, keywords: ["transactions", "payments", "expenses", "income", "history", "analytics", "charts", "graphs", "reports", "statistics"] },
  { label: "Budget", url: "/budget", icon: IconPigMoney, keywords: ["spending", "limits", "categories", "planner", "plan", "projection", "forecast", "allocate", "what-if"] },
  { label: "Goals", url: "/goals", icon: IconTargetArrow, keywords: ["savings", "targets", "milestones", "financial health", "score", "wellness", "assessment", "fire", "retire", "net worth", "debt"] },
  { label: "Investments", url: "/investments", icon: IconTrendingUp, keywords: ["stocks", "mutual funds", "portfolio", "sip"] },
  { label: "Tax & Bills", url: "/bills", icon: IconFileInvoice, keywords: ["tax", "deductions", "80c", "regime", "subscriptions", "recurring", "monthly", "services", "splits", "splitwise", "share", "group", "owe", "settle"] },
  { label: "AI Assistant", url: "/ai", icon: IconSparkles, keywords: ["ai", "chat", "assistant", "agent", "insights", "analysis", "recommendations", "learn", "education", "articles", "tips", "knowledge"] },
  { label: "Rewards", url: "/gamification", icon: IconTrophy, keywords: ["gamification", "badges", "streak", "xp", "challenges", "achievements"] },
  { label: "Settings", url: "/settings", icon: IconSettings, keywords: ["preferences", "telegram", "config", "hourly rate"] },
]

/** Quick actions accessible from the Spotlight overlay. */
export const actions: PageEntry[] = [
  { label: "Add transaction", url: "/money?tab=transactions&action=add", icon: IconPlus, keywords: ["new", "create", "expense", "income"] },
  { label: "Set budget", url: "/budget?action=add", icon: IconCoinRupee, keywords: ["new", "create", "limit", "category"] },
  { label: "Ask AI assistant", url: "/ai?tab=chat", icon: IconMessageChatbot, keywords: ["chat", "question", "help", "assistant", "agent"] },
  { label: "Sync data", url: "/dashboard?sync=true", icon: IconRefresh, keywords: ["refresh", "update", "import", "sheets"] },
]
