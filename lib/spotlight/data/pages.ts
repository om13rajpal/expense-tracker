import {
  IconDashboard,
  IconReceipt,
  IconChartBar,
  IconPigMoney,
  IconCalculator,
  IconFileInvoice,
  IconRepeat,
  IconTrendingUp,
  IconHeartbeat,
  IconTargetArrow,
  IconBrain,
  IconRobot,
  IconSchool,
  IconPlus,
  IconCoinRupee,
  IconMessageChatbot,
  IconRefresh,
  IconUsers,
  IconTrophy,
  IconSettings,
} from "@tabler/icons-react"
import type { ComponentType } from "react"

export interface PageEntry {
  label: string
  url: string
  icon: ComponentType<{ className?: string }>
  keywords: string[]
}

export const pages: PageEntry[] = [
  { label: "Dashboard", url: "/dashboard", icon: IconDashboard, keywords: ["home", "overview", "summary"] },
  { label: "Transactions", url: "/transactions", icon: IconReceipt, keywords: ["payments", "expenses", "income", "history"] },
  { label: "Analytics", url: "/analytics", icon: IconChartBar, keywords: ["charts", "graphs", "reports", "statistics"] },
  { label: "Budget", url: "/budget", icon: IconPigMoney, keywords: ["spending", "limits", "categories"] },
  { label: "Finance Planner", url: "/planner", icon: IconCalculator, keywords: ["plan", "projection", "forecast"] },
  { label: "Tax Planner", url: "/tax", icon: IconFileInvoice, keywords: ["tax", "deductions", "80c", "regime"] },
  { label: "Subscriptions", url: "/subscriptions", icon: IconRepeat, keywords: ["recurring", "monthly", "services"] },
  { label: "Investments", url: "/investments", icon: IconTrendingUp, keywords: ["stocks", "mutual funds", "portfolio", "sip"] },
  { label: "Financial Health", url: "/financial-health", icon: IconHeartbeat, keywords: ["score", "wellness", "assessment"] },
  { label: "Goals", url: "/goals", icon: IconTargetArrow, keywords: ["savings", "targets", "milestones"] },
  { label: "AI Insights", url: "/ai-insights", icon: IconBrain, keywords: ["analysis", "recommendations", "ai"] },
  { label: "Finance Agent", url: "/agent", icon: IconRobot, keywords: ["chat", "assistant", "ask", "ai agent"] },
  { label: "Learn", url: "/learn", icon: IconSchool, keywords: ["education", "articles", "tips", "knowledge"] },
  { label: "Split Expenses", url: "/splits", icon: IconUsers, keywords: ["splits", "splitwise", "share", "group", "owe", "settle"] },
  { label: "Rewards", url: "/gamification", icon: IconTrophy, keywords: ["gamification", "badges", "streak", "xp", "challenges", "achievements"] },
  { label: "Settings", url: "/settings", icon: IconSettings, keywords: ["preferences", "telegram", "config", "hourly rate"] },
]

export const actions: PageEntry[] = [
  { label: "Add transaction", url: "/transactions?action=add", icon: IconPlus, keywords: ["new", "create", "expense", "income"] },
  { label: "Set budget", url: "/budget?action=add", icon: IconCoinRupee, keywords: ["new", "create", "limit", "category"] },
  { label: "Ask AI agent", url: "/agent", icon: IconMessageChatbot, keywords: ["chat", "question", "help", "assistant"] },
  { label: "Sync data", url: "/dashboard?sync=true", icon: IconRefresh, keywords: ["refresh", "update", "import", "sheets"] },
]
