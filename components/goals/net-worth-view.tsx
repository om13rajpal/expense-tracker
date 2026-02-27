/**
 * Net Worth tracker view — displays total assets, total debts, and net
 * worth with a timeline area chart, debt management CRUD, asset pie
 * chart, and hero metric display. Supports adding/editing/deleting debts
 * and shows an auto-calculated net worth timeline from transaction history.
 * @module components/goals/net-worth-view
 */
"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { motion } from "motion/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  IconShieldCheck,
  IconArrowUpRight,
  IconArrowDownRight,
  IconChartLine,
  IconWallet,
  IconCreditCard,
  IconPlus,
  IconPencil,
  IconTrash,
  IconBuildingBank,
} from "@tabler/icons-react"
import { toast } from "sonner"

import { useFinancialHealth, type FinancialHealthMetrics } from "@/hooks/use-financial-health"
import { InfoTooltip } from "@/components/info-tooltip"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatINR as formatCurrency, formatCompact, formatCompactAxis } from "@/lib/format"
import { stagger, fadeUp, numberPop } from "@/lib/motion"

// ---------------------------------------------------------------------------
/**
 * A single debt/liability tracked by the user.
 * @property id               - Unique debt identifier.
 * @property name             - Human-readable label (e.g. "Home Loan SBI").
 * @property type             - Debt category (home_loan, car_loan, etc.).
 * @property principal        - Original loan amount in INR.
 * @property interestRate     - Annual interest rate as a percentage.
 * @property emiAmount        - Monthly EMI amount in INR.
 * @property tenure           - Loan tenure in months.
 * @property startDate        - ISO date when the loan started.
 * @property paidEMIs         - Number of EMIs already paid.
 * @property remainingBalance - Outstanding balance in INR.
 * @property status           - Whether the debt is active or closed.
 * @property notes            - Optional free-text notes.
 */
interface Debt {
  id: string
  name: string
  type: string
  principal: number
  interestRate: number
  emiAmount: number
  tenure: number
  startDate: string
  paidEMIs: number
  remainingBalance: number
  status: "active" | "closed"
  notes?: string
}

/** Available debt type options for the add/edit debt form. */
const DEBT_TYPES = [
  { value: "home_loan", label: "Home Loan" },
  { value: "car_loan", label: "Car Loan" },
  { value: "personal_loan", label: "Personal Loan" },
  { value: "education_loan", label: "Education Loan" },
  { value: "credit_card", label: "Credit Card" },
  { value: "other", label: "Other" },
] as const

const DEBT_TYPE_LABELS: Record<string, string> = {
  home_loan: "Home Loan",
  car_loan: "Car Loan",
  personal_loan: "Personal Loan",
  education_loan: "Education Loan",
  credit_card: "Credit Card",
  other: "Other",
}

const EMPTY_DEBT_FORM = {
  name: "",
  type: "",
  principal: "",
  interestRate: "",
  emiAmount: "",
  tenure: "",
  startDate: "",
  paidEMIs: "0",
  remainingBalance: "",
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function calculateNextDueDate(startDate: string, paidEMIs: number): Date {
  const start = new Date(startDate)
  const next = new Date(start)
  next.setMonth(next.getMonth() + paidEMIs + 1)
  return next
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  })
}

// ---------------------------------------------------------------------------
// Chart Tooltips
// ---------------------------------------------------------------------------

function NetWorthTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ value: number; dataKey: string; color: string }>
  label?: string
}) {
  if (!active || !payload) return null
  return (
    <div className="rounded-xl border border-border bg-card/95 backdrop-blur-xl px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
      <p className="text-xs font-semibold text-foreground mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2.5 text-sm py-0.5">
          <div
            className="h-2.5 w-2.5 rounded-full ring-2 ring-offset-1 ring-offset-card"
            style={{ backgroundColor: entry.color, boxShadow: `0 0 6px ${entry.color}40` }}
          />
          <span className="text-muted-foreground">
            {entry.dataKey === "bankBalance" ? "Bank" : "Investments"}
          </span>
          <span className="font-black tracking-tight tabular-nums ml-auto">
            {formatCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

function AssetPieTooltip({ active, payload }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; payload: { color: string } }>
}) {
  if (!active || !payload || !payload[0]) return null
  const entry = payload[0]
  return (
    <div className="rounded-xl border border-border bg-card/95 backdrop-blur-xl px-3 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
      <div className="flex items-center gap-2 text-sm">
        <div
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: entry.payload.color }}
        />
        <span className="text-muted-foreground">{entry.name}</span>
        <span className="font-black tracking-tight tabular-nums ml-auto">{formatCurrency(entry.value)}</span>
      </div>
    </div>
  )
}

/**
 * Hero section displaying the net worth headline, total assets, total
 * debts, and an asset allocation pie chart with interactive tooltip.
 */
function NetWorthHero({
  metrics,
  totalDebts,
}: {
  metrics: FinancialHealthMetrics
  totalDebts: number
}) {
  const latestPoint = metrics.netWorthTimeline.at(-1)
  const prevPoint = metrics.netWorthTimeline.at(-2)

  const bankBalance = latestPoint?.bankBalance || 0
  const investmentValue = latestPoint?.investmentValue || 0
  const totalNetWorth = bankBalance + investmentValue - totalDebts

  const prevNetWorth = prevPoint
    ? (prevPoint.bankBalance + prevPoint.investmentValue - totalDebts)
    : 0
  const netWorthChange = prevPoint ? totalNetWorth - prevNetWorth : 0
  const netWorthChangePct = prevNetWorth > 0 ? (netWorthChange / prevNetWorth) * 100 : 0

  const isPositiveChange = netWorthChange >= 0

  const assetData = [
    { name: "Bank", value: bankBalance, color: "var(--chart-4)" },
    { name: "Investments", value: investmentValue, color: "var(--chart-1)" },
  ].filter((d) => d.value > 0)

  if (totalDebts > 0) {
    assetData.push({ name: "Debts", value: totalDebts, color: "var(--chart-5)" })
  }

  const totalAssets = bankBalance + investmentValue

  return (
    <motion.div variants={fadeUp}>
      <div className="card-elevated rounded-2xl border border-border bg-card relative overflow-hidden p-5 md:p-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <div className="flex items-center gap-2 mb-5">
          <div className="flex items-center justify-center size-8 rounded-xl bg-muted/80 dark:bg-muted">
            <IconBuildingBank className="h-4 w-4 text-foreground/70" />
          </div>
          <h3 className="text-sm font-semibold">Net Worth</h3>
          <InfoTooltip text="Total net worth = Bank Balance + Investment Value - Outstanding Debts." />
        </div>

        <div className="grid gap-5 md:grid-cols-[1fr_auto]">
          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest mb-1">
                Total Net Worth
              </p>
              <motion.p
                variants={numberPop}
                className="text-3xl md:text-4xl font-extrabold tabular-nums tracking-tight"
              >
                {formatCurrency(totalNetWorth)}
              </motion.p>
              {prevPoint && (
                <div className="flex items-center gap-2 mt-1.5">
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md ${
                      isPositiveChange
                        ? "bg-lime-500/10 text-lime-600 dark:text-lime-400"
                        : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {isPositiveChange ? (
                      <IconArrowUpRight className="h-3 w-3" />
                    ) : (
                      <IconArrowDownRight className="h-3 w-3" />
                    )}
                    {isPositiveChange ? "+" : ""}
                    {formatCompact(netWorthChange)}
                  </span>
                  <span className={`text-xs font-medium tabular-nums ${
                    isPositiveChange ? "text-lime-600 dark:text-lime-400" : "text-destructive"
                  }`}>
                    {isPositiveChange ? "+" : ""}{netWorthChangePct.toFixed(1)}% vs last month
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-border bg-card p-3">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">Bank</p>
                <p className="text-sm font-black tracking-tight tabular-nums">{formatCurrency(bankBalance)}</p>
                {totalAssets > 0 && (
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    {((bankBalance / totalAssets) * 100).toFixed(0)}% of assets
                  </p>
                )}
              </div>
              <div className="rounded-xl border border-border bg-card p-3">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">Investments</p>
                <p className="text-sm font-black tracking-tight tabular-nums text-lime-600 dark:text-lime-400">{formatCurrency(investmentValue)}</p>
                {totalAssets > 0 && (
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    {((investmentValue / totalAssets) * 100).toFixed(0)}% of assets
                  </p>
                )}
              </div>
              {totalDebts > 0 && (
                <div className="rounded-xl border border-border bg-card p-3">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">Debts</p>
                  <p className="text-sm font-black tracking-tight tabular-nums text-destructive">-{formatCurrency(totalDebts)}</p>
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    {totalAssets > 0 ? ((totalDebts / totalAssets) * 100).toFixed(0) : 0}% of assets
                  </p>
                </div>
              )}
            </div>
          </div>

          {assetData.length > 0 && (
            <div className="flex flex-col items-center justify-center">
              <PieChart width={140} height={140}>
                <Pie
                  data={assetData}
                  cx={70}
                  cy={70}
                  innerRadius={40}
                  outerRadius={62}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {assetData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<AssetPieTooltip />} />
              </PieChart>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 justify-center">
                {assetData.map((item) => (
                  <div key={item.name} className="flex items-center gap-1.5">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-[11px] text-muted-foreground">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/**
 * Dialog form for adding or editing a debt/liability.
 * Collects name, type, principal, interest rate, EMI, tenure,
 * start date, and notes. Reused for both create and edit flows.
 */
function DebtFormDialog({
  open,
  onOpenChange,
  editingDebt,
  onSubmit,
  isSubmitting,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingDebt: Debt | null
  onSubmit: (form: typeof EMPTY_DEBT_FORM) => void
  isSubmitting: boolean
}) {
  const [form, setForm] = useState({ ...EMPTY_DEBT_FORM })

  useEffect(() => {
    if (editingDebt) {
      setForm({
        name: editingDebt.name,
        type: editingDebt.type,
        principal: String(editingDebt.principal),
        interestRate: String(editingDebt.interestRate),
        emiAmount: String(editingDebt.emiAmount),
        tenure: String(editingDebt.tenure),
        startDate: editingDebt.startDate,
        paidEMIs: String(editingDebt.paidEMIs),
        remainingBalance: String(editingDebt.remainingBalance),
      })
    } else {
      setForm({ ...EMPTY_DEBT_FORM })
    }
  }, [editingDebt, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(form)
  }

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{editingDebt ? "Edit Debt" : "Add Debt"}</DialogTitle>
          <DialogDescription>
            {editingDebt
              ? "Update the details for this debt entry."
              : "Enter the details for your new debt or loan."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-medium">Name</Label>
              <Input
                placeholder="e.g. Home Loan SBI"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Type</Label>
              <Select value={form.type} onValueChange={(v) => updateField("type", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {DEBT_TYPES.map((dt) => (
                    <SelectItem key={dt.value} value={dt.value}>
                      {dt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Start Date</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => updateField("startDate", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Principal Amount</Label>
              <Input
                type="number"
                placeholder="500000"
                value={form.principal}
                onChange={(e) => updateField("principal", e.target.value)}
                min={1}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Interest Rate (%)</Label>
              <Input
                type="number"
                placeholder="8.5"
                step="0.01"
                value={form.interestRate}
                onChange={(e) => updateField("interestRate", e.target.value)}
                min={0}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">EMI Amount</Label>
              <Input
                type="number"
                placeholder="15000"
                value={form.emiAmount}
                onChange={(e) => updateField("emiAmount", e.target.value)}
                min={1}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Tenure (months)</Label>
              <Input
                type="number"
                placeholder="240"
                value={form.tenure}
                onChange={(e) => updateField("tenure", e.target.value)}
                min={1}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Paid EMIs</Label>
              <Input
                type="number"
                placeholder="0"
                value={form.paidEMIs}
                onChange={(e) => updateField("paidEMIs", e.target.value)}
                min={0}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Remaining Balance</Label>
              <Input
                type="number"
                placeholder="Leave blank for principal"
                value={form.remainingBalance}
                onChange={(e) => updateField("remainingBalance", e.target.value)}
                min={0}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : editingDebt ? "Update" : "Add Debt"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Debt Tracker section with CRUD operations, progress bars per debt,
 * total outstanding summary, and status filtering. Uses TanStack
 * Query mutations with optimistic invalidation.
 */
// ---------------------------------------------------------------------------

function DebtTrackerSection() {
  const queryClient = useQueryClient()
  const [showAddDebt, setShowAddDebt] = useState(false)
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data: debtsData, isLoading: debtsLoading } = useQuery<{
    success: boolean
    debts: Debt[]
  }>({
    queryKey: ["debts"],
    queryFn: async () => {
      const res = await fetch("/api/debts")
      if (!res.ok) throw new Error("Failed to fetch debts")
      return res.json()
    },
  })

  const debts = debtsData?.debts || []
  const activeDebts = debts.filter((d) => d.status === "active")
  const totalOutstanding = activeDebts.reduce((sum, d) => sum + d.remainingBalance, 0)
  const monthlyEMITotal = activeDebts.reduce((sum, d) => sum + d.emiAmount, 0)

  const createMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch("/api/debts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || "Failed to create debt")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debts"] })
      setShowAddDebt(false)
      toast.success("Debt added successfully")
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch("/api/debts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || "Failed to update debt")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debts"] })
      setEditingDebt(null)
      toast.success("Debt updated successfully")
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/debts?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete debt")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debts"] })
      setDeletingId(null)
      toast.success("Debt deleted")
    },
    onError: (err: Error) => {
      toast.error(err.message)
      setDeletingId(null)
    },
  })

  const handleFormSubmit = (form: typeof EMPTY_DEBT_FORM) => {
    const payload: Record<string, unknown> = {
      name: form.name,
      type: form.type,
      principal: Number(form.principal),
      interestRate: Number(form.interestRate),
      emiAmount: Number(form.emiAmount),
      tenure: Number(form.tenure),
      startDate: form.startDate,
      paidEMIs: Number(form.paidEMIs) || 0,
      remainingBalance: form.remainingBalance ? Number(form.remainingBalance) : Number(form.principal),
    }

    if (editingDebt) {
      updateMutation.mutate({ id: editingDebt.id, ...payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const handleDelete = (id: string) => {
    setDeletingId(id)
    deleteMutation.mutate(id)
  }

  if (debtsLoading) {
    return (
      <motion.div variants={fadeUp}>
        <div className="card-elevated rounded-2xl border border-border bg-card relative overflow-hidden p-5">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          <div className="flex items-center gap-2.5 mb-5">
            <Skeleton className="size-8 rounded-xl" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="grid grid-cols-3 gap-3 mb-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <>
      <motion.div variants={fadeUp}>
        <div className="card-elevated rounded-2xl border border-border bg-card relative overflow-hidden p-5">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center size-8 rounded-xl bg-destructive/10">
                <IconCreditCard className="h-4 w-4 text-destructive" />
              </div>
              <h3 className="text-sm font-semibold">Debt Tracker</h3>
              <InfoTooltip text="Track all your loans and credit card debts. Monitor EMI payments and remaining balances." />
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowAddDebt(true)}>
              <IconPlus className="h-4 w-4 mr-1" /> Add Debt
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                Total Outstanding
              </p>
              <p className="text-lg font-black tracking-tight tabular-nums text-destructive">
                {formatCurrency(totalOutstanding)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                Active Debts
              </p>
              <p className="text-lg font-black tracking-tight tabular-nums">
                {activeDebts.length}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                Monthly EMI
              </p>
              <p className="text-lg font-black tracking-tight tabular-nums">
                {formatCurrency(monthlyEMITotal)}
              </p>
            </div>
          </div>

          {debts.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 px-6 bg-gradient-to-br from-muted/20 via-transparent to-muted/10">
              <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-lime-500/10 to-lime-500/5 mb-4">
                <IconShieldCheck className="h-7 w-7 text-lime-500" />
              </div>
              <h4 className="text-sm font-semibold text-foreground mb-1">Debt Free!</h4>
              <p className="text-xs text-muted-foreground text-center max-w-xs mb-4">
                No debts tracked. If you have any loans or credit card balances, add them here to monitor your payoff progress.
              </p>
              <Button size="sm" variant="outline" onClick={() => setShowAddDebt(true)} className="gap-1.5">
                <IconPlus className="h-3.5 w-3.5" />
                Track a Debt
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {debts.map((debt) => {
                const progressPct =
                  debt.tenure > 0 ? (debt.paidEMIs / debt.tenure) * 100 : 0
                const monthsRemaining = Math.max(0, debt.tenure - debt.paidEMIs)
                const nextDue = calculateNextDueDate(debt.startDate, debt.paidEMIs)
                const isClosed = debt.status === "closed"

                return (
                  <div
                    key={debt.id}
                    className={`rounded-xl border p-4 transition-colors hover:bg-muted/20 ${
                      isClosed ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-semibold truncate">{debt.name}</h4>
                          <Badge variant="outline" className="text-[11px] shrink-0">
                            {DEBT_TYPE_LABELS[debt.type] || debt.type}
                          </Badge>
                          {isClosed && (
                            <Badge variant="secondary" className="text-[11px] shrink-0">
                              Closed
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(debt.remainingBalance)}{" "}
                          <span className="text-muted-foreground/60">
                            of {formatCurrency(debt.principal)}
                          </span>
                          {debt.interestRate > 0 && (
                            <span className="ml-2 text-muted-foreground/60">
                              @ {debt.interestRate}% p.a.
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => setEditingDebt(debt)}
                        >
                          <IconPencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(debt.id)}
                          disabled={deletingId === debt.id}
                        >
                          <IconTrash className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <Progress value={progressPct} className="h-1.5 mb-2" />

                    <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        EMI: <span className="font-medium text-foreground">{formatCurrency(debt.emiAmount)}</span>/mo
                      </span>
                      <span>
                        Paid: <span className="font-medium text-foreground">{debt.paidEMIs}</span>/{debt.tenure} EMIs
                      </span>
                      {!isClosed && monthsRemaining > 0 && (
                        <span>{monthsRemaining} months left</span>
                      )}
                      {!isClosed && (
                        <span>
                          Next due: <span className="font-medium text-foreground">{formatDate(nextDue)}</span>
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </motion.div>

      <DebtFormDialog
        open={showAddDebt}
        onOpenChange={setShowAddDebt}
        editingDebt={null}
        onSubmit={handleFormSubmit}
        isSubmitting={createMutation.isPending}
      />
      <DebtFormDialog
        open={!!editingDebt}
        onOpenChange={(open) => { if (!open) setEditingDebt(null) }}
        editingDebt={editingDebt}
        onSubmit={handleFormSubmit}
        isSubmitting={updateMutation.isPending}
      />
    </>
  )
}

/**
 * Stacked area chart showing the net worth timeline over the last
 * several months. Plots bank balance + investment value as separate
 * gradient areas with a custom tooltip.
 */
function NetWorthTimeline({ metrics }: { metrics: FinancialHealthMetrics }) {
  return (
    <motion.div variants={fadeUp} className="card-elevated rounded-2xl border border-border bg-card relative overflow-hidden p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <IconWallet className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Net Worth Timeline</h3>
          <InfoTooltip text="Bank balance is the running balance from your bank statement at each month-end. Investment value is the current total of stocks, mutual funds, and SIPs." />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "var(--chart-1)" }} />
            <span className="text-[11px] text-muted-foreground">Bank</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "var(--chart-2)" }} />
            <span className="text-[11px] text-muted-foreground">Investments</span>
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-4">Bank balance and investment value over time</p>

      {metrics.netWorthTimeline.length > 0 ? (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={metrics.netWorthTimeline} margin={{ left: 0, right: 5, top: 5, bottom: 0 }}>
            <defs>
              <linearGradient id="nwBankGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="nwInvestGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.4} strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickFormatter={formatCompactAxis}
              width={55}
            />
            <Tooltip
              content={<NetWorthTooltip />}
              cursor={{ stroke: "var(--border)", strokeDasharray: "4 4" }}
            />
            <Area
              dataKey="bankBalance"
              type="monotone"
              stroke="var(--chart-1)"
              strokeWidth={2.5}
              fill="url(#nwBankGradient)"
              dot={false}
              isAnimationActive={false}
            />
            <Area
              dataKey="investmentValue"
              type="monotone"
              stroke="var(--chart-2)"
              strokeWidth={2.5}
              fill="url(#nwInvestGradient)"
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-[260px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-gradient-to-br from-muted/20 via-transparent to-muted/10">
          <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-muted/40 mb-3">
            <IconChartLine className="h-6 w-6 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">No net worth data yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1 text-center max-w-xs">
            Your net worth timeline will appear here once you have transaction history across multiple months.
          </p>
        </div>
      )}
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Loading Skeleton
// ---------------------------------------------------------------------------

function NetWorthViewSkeleton() {
  return (
    <div className="space-y-5">
      {/* Net Worth Hero */}
      <div className="card-elevated rounded-2xl border border-border p-6">
        <div className="flex items-center gap-2 mb-5">
          <Skeleton className="size-8 rounded-xl" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="grid gap-5 md:grid-cols-[1fr_auto]">
          <div className="space-y-4">
            <div>
              <Skeleton className="h-3 w-24 mb-2" />
              <Skeleton className="h-9 w-48" />
              <Skeleton className="h-5 w-36 mt-2" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          </div>
          <Skeleton className="h-[140px] w-[140px] rounded-full hidden md:block" />
        </div>
      </div>
      {/* Debt tracker */}
      <div className="card-elevated rounded-2xl border border-border p-5">
        <div className="flex items-center gap-2.5 mb-5">
          <Skeleton className="size-8 rounded-xl" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="grid grid-cols-3 gap-3 mb-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
      {/* Timeline chart */}
      <div className="card-elevated rounded-2xl border border-border p-6">
        <Skeleton className="h-5 w-36 mb-3" />
        <Skeleton className="h-[260px] w-full rounded-xl" />
      </div>
    </div>
  )
}

/**
 * Top-level Net Worth page exported for the `/goals` route's "Net Worth" tab.
 * Composes the hero section (assets vs debts), debt tracker with full CRUD,
 * and net worth timeline chart. Shows skeleton during loading.
 */

export function NetWorthView() {
  const { data, isLoading, error: queryError } = useFinancialHealth()
  const metrics = data?.metrics ?? null

  const { data: debtsData } = useQuery<{ success: boolean; debts: Debt[] }>({
    queryKey: ["debts"],
    queryFn: async () => {
      const res = await fetch("/api/debts")
      if (!res.ok) throw new Error("Failed to fetch debts")
      return res.json()
    },
  })

  const totalDebts =
    debtsData?.debts
      ?.filter((d) => d.status === "active")
      ?.reduce((sum, d) => sum + d.remainingBalance, 0) || 0

  if (isLoading) return <NetWorthViewSkeleton />

  if (queryError || !metrics) {
    return (
      <div className="card-elevated rounded-2xl border border-border flex h-40 items-center justify-center">
        <p className="text-sm text-muted-foreground">
          {queryError ? "Failed to load financial data" : "No financial data available"}
        </p>
      </div>
    )
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-5">
      <NetWorthHero metrics={metrics} totalDebts={totalDebts} />
      <DebtTrackerSection />
      <NetWorthTimeline metrics={metrics} />
    </motion.div>
  )
}
