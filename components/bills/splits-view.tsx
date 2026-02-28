/**
 * Bill Splits view — manage shared expenses, contacts, groups,
 * settlements, and real-time balance tracking. Supports adding
 * contacts, creating groups, logging split expenses, recording
 * settlements, auto-settle via smart matching, shareable payment
 * links, and a live activity feed.
 * @module components/bills/splits-view
 */
"use client"

import * as React from "react"
import { motion, AnimatePresence } from "motion/react"
import {
  IconArrowRight,
  IconArrowsExchange,
  IconBolt,
  IconCash,
  IconCheck,
  IconChevronLeft,
  IconCopy,
  IconLink,
  IconLoader2,
  IconMail,
  IconPlus,
  IconReceipt,
  IconScale,
  IconShare,
  IconTrash,
  IconUserPlus,
  IconUsers,
  IconUsersGroup,
  IconWallet,
  IconX,
} from "@tabler/icons-react"
import { toast } from "sonner"

import { stagger, fadeUp, fadeUpSmall, listItem, spring } from "@/lib/motion"
import { useAuth } from "@/hooks/use-auth"
import { formatINR } from "@/lib/format"
import { cn } from "@/lib/utils"
import {
  useContacts,
  useGroups,
  useSplitExpenses,
  useSettlements,
  useBalances,
  useActivity,
  useShareToken,
  useAutoSettle,
} from "@/hooks/use-splits"
import type { Group, ActivityItem } from "@/hooks/use-splits"

import { MetricTile } from "@/components/metric-tile"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"

/* --- Helper: Avatar initials --- */
function PersonAvatar({
  name,
  size = "md",
  className,
}: {
  name: string
  size?: "sm" | "md" | "lg"
  className?: string
}) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const colors = [
    "bg-blue-500/15 text-blue-600 dark:text-blue-400",
    "bg-lime-500/15 text-lime-600 dark:text-lime-400",
    "bg-muted/80 dark:bg-muted text-foreground/70",
    "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    "bg-pink-500/15 text-pink-600 dark:text-pink-400",
    "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
    "bg-orange-500/15 text-orange-600 dark:text-orange-400",
    "bg-destructive/15 text-destructive",
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  const color = colors[Math.abs(hash) % colors.length]

  const sizeClass =
    size === "sm"
      ? "h-7 w-7 text-[10px]"
      : size === "lg"
        ? "h-11 w-11 text-sm"
        : "h-9 w-9 text-xs"

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full font-semibold shrink-0",
        color,
        sizeClass,
        className
      )}
    >
      {initials}
    </div>
  )
}

/* --- Helper: Section heading --- */
function SectionHeading({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  count,
  action,
}: {
  icon: React.ComponentType<any>
  iconBg: string
  iconColor: string
  title: string
  count?: number
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div
          className={cn(
            "flex items-center justify-center h-7 w-7 rounded-lg",
            iconBg
          )}
        >
          <Icon className={cn("h-4 w-4", iconColor)} strokeWidth={1.8} />
        </div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {typeof count === "number" && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {count}
          </Badge>
        )}
      </div>
      {action}
    </div>
  )
}

/* --- Helper: Empty state --- */
function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<any>
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="card-elevated rounded-xl bg-card overflow-hidden">
      <div className="bg-gradient-to-b from-primary/[0.04] to-transparent">
        <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
          <div className="relative mb-5">
            <div className="absolute inset-0 rounded-full bg-primary/5 blur-xl scale-150" />
            <div className="relative rounded-2xl bg-primary/[0.06] border border-primary/10 p-4">
              <Icon className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-xs">
            {description}
          </p>
          {action && <div className="mt-4">{action}</div>}
        </div>
      </div>
    </div>
  )
}

/* --- Add Contact Dialog --- */
function AddContactDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const { createContact, isCreating } = useContacts()
  const [name, setName] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [email, setEmail] = React.useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    try {
      await createContact({ name: name.trim(), phone, email })
      toast.success("Contact added")
      setName("")
      setPhone("")
      setEmail("")
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add contact")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-muted/80 dark:bg-muted">
              <IconUserPlus className="h-5 w-5 text-muted-foreground" strokeWidth={1.8} />
            </div>
            <div>
              <DialogTitle>Add Contact</DialogTitle>
              <DialogDescription className="mt-0.5">
                Add a person to split expenses with.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="contact-name">Name *</Label>
            <Input
              id="contact-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="contact-phone">Phone</Label>
              <Input
                id="contact-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-email">Email</Label>
              <Input
                id="contact-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating || !name.trim()} className="gap-1.5">
              <IconUserPlus className="h-4 w-4" />
              {isCreating ? "Adding..." : "Add Contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* --- Create Group Dialog --- */
function CreateGroupDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const { contacts } = useContacts()
  const { createGroup, isCreating } = useGroups()
  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [selectedMembers, setSelectedMembers] = React.useState<string[]>([])

  function toggleMember(m: string) {
    setSelectedMembers((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || selectedMembers.length === 0) return
    try {
      await createGroup({ name: name.trim(), members: ["Me", ...selectedMembers], description })
      toast.success("Group created")
      setName("")
      setDescription("")
      setSelectedMembers([])
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create group")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-muted/80 dark:bg-muted">
              <IconUsersGroup className="h-5 w-5 text-foreground/70" strokeWidth={1.8} />
            </div>
            <div>
              <DialogTitle>Create Group</DialogTitle>
              <DialogDescription className="mt-0.5">
                Create a group to track shared expenses.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="group-name">Group Name *</Label>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Weekend Trip"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="group-desc">Description</Label>
            <Input
              id="group-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Goa trip expenses"
            />
          </div>
          <div className="space-y-2.5">
            <Label>Members *</Label>
            <p className="text-xs text-muted-foreground -mt-1">You are included automatically</p>
            {contacts.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-center">
                <IconUserPlus className="h-5 w-5 text-muted-foreground/40 mx-auto mb-1.5" />
                <p className="text-sm text-muted-foreground">
                  No contacts yet. Add contacts first.
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {contacts.map((c) => (
                  <button
                    key={c._id}
                    type="button"
                    onClick={() => toggleMember(c.name)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-all duration-200",
                      selectedMembers.includes(c.name)
                        ? "border-primary bg-primary/10 text-primary shadow-sm shadow-primary/10"
                        : "border-border text-muted-foreground hover:border-primary/50 hover:bg-accent/50"
                    )}
                  >
                    <PersonAvatar name={c.name} size="sm" className="h-5 w-5 text-[8px]" />
                    {c.name}
                    {selectedMembers.includes(c.name) && (
                      <IconCheck className="h-3.5 w-3.5" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating || !name.trim() || selectedMembers.length === 0}
              className="gap-1.5"
            >
              <IconUsersGroup className="h-4 w-4" />
              {isCreating ? "Creating..." : "Create Group"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* --- Add Expense Dialog --- */
function AddExpenseDialog({
  open,
  onOpenChange,
  groupId,
  members,
  contacts,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  groupId?: string | null
  members: string[]
  contacts?: Array<{ _id: string; name: string; email: string }>
}) {
  const { createExpense, isCreating } = useSplitExpenses(groupId)
  const [description, setDescription] = React.useState("")
  const [amount, setAmount] = React.useState("")
  const [paidBy, setPaidBy] = React.useState("Me")
  const [splitType, setSplitType] = React.useState<"equal" | "exact" | "percentage">("equal")
  const [splitAmounts, setSplitAmounts] = React.useState<Record<string, string>>({})
  const [selectedPeople, setSelectedPeople] = React.useState<string[]>(members)
  const [date, setDate] = React.useState(new Date().toISOString().split("T")[0])
  const [notifyEmail, setNotifyEmail] = React.useState(false)

  // Check if any participant (non-Me) has an email address
  const hasEmailContacts = React.useMemo(() => {
    if (!contacts) return false
    return contacts.some((c) => c.email && members.includes(c.name) && c.name !== "Me")
  }, [contacts, members])

  React.useEffect(() => {
    setSelectedPeople(members)
    const init: Record<string, string> = {}
    members.forEach((m) => { init[m] = "" })
    setSplitAmounts(init)
  }, [members])

  function togglePerson(p: string) {
    setSelectedPeople((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!description.trim() || isNaN(amt) || amt <= 0) return

    let splits: { person: string; amount: number }[]

    if (splitType === "equal") {
      splits = selectedPeople.map((p) => ({ person: p, amount: 0 }))
    } else if (splitType === "percentage") {
      splits = selectedPeople.map((p) => ({
        person: p,
        amount: parseFloat(splitAmounts[p] || "0"),
      }))
    } else {
      splits = selectedPeople.map((p) => ({
        person: p,
        amount: parseFloat(splitAmounts[p] || "0"),
      }))
    }

    try {
      const result = await createExpense({
        groupId: groupId || undefined,
        description: description.trim(),
        amount: amt,
        paidBy,
        splitType,
        splits,
        date,
      })
      toast.success("Expense added")

      // Send email notifications if checked
      if (notifyEmail && contacts && result?.expense?._id) {
        const expenseId = result.expense._id
        const participantsToNotify = contacts.filter(
          (c) => c.email && selectedPeople.includes(c.name) && c.name !== "Me"
        )
        for (const contact of participantsToNotify) {
          try {
            const res = await fetch("/api/splits/notify", {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contactId: contact._id,
                type: "split_created",
                expenseId,
              }),
            })
            const data = await res.json()
            if (data.success) {
              toast.success(`Notification sent to ${contact.name}`)
            } else {
              toast.error(`Failed to notify ${contact.name}`)
            }
          } catch {
            toast.error(`Failed to send to ${contact.name}`)
          }
        }
      }

      setDescription("")
      setAmount("")
      setPaidBy("Me")
      setSplitType("equal")
      setNotifyEmail(false)
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add expense")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-lime-500/15 to-cyan-500/15">
              <IconReceipt className="h-5 w-5 text-lime-500" strokeWidth={1.8} />
            </div>
            <div>
              <DialogTitle>Add Expense</DialogTitle>
              <DialogDescription className="mt-0.5">
                Record a shared expense.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Description *</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Dinner at restaurant"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Amount *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1500"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Paid By</Label>
            <Select value={paidBy} onValueChange={setPaidBy}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2.5">
            <Label>Split Type</Label>
            <div className="flex gap-2">
              {(["equal", "exact", "percentage"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSplitType(t)}
                  className={cn(
                    "rounded-lg border px-3.5 py-1.5 text-sm capitalize transition-all duration-200",
                    splitType === t
                      ? "border-primary bg-primary/10 text-primary shadow-sm shadow-primary/10"
                      : "border-border text-muted-foreground hover:border-primary/50 hover:bg-accent/50"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {splitType === "equal" && (
            <div className="space-y-2.5">
              <Label>Split Among</Label>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => togglePerson(m)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-all duration-200",
                      selectedPeople.includes(m)
                        ? "border-primary bg-primary/10 text-primary shadow-sm shadow-primary/10"
                        : "border-border text-muted-foreground hover:border-primary/50 hover:bg-accent/50"
                    )}
                  >
                    {m}
                    {selectedPeople.includes(m) && (
                      <IconCheck className="h-3.5 w-3.5" />
                    )}
                  </button>
                ))}
              </div>
              {selectedPeople.length > 0 && amount && (
                <div className="rounded-lg bg-accent/50 px-3 py-2">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {formatINR(parseFloat(amount) / selectedPeople.length)}
                    </span>{" "}
                    per person ({selectedPeople.length} people)
                  </p>
                </div>
              )}
            </div>
          )}

          {(splitType === "exact" || splitType === "percentage") && (
            <div className="space-y-2.5">
              <Label>
                {splitType === "percentage" ? "Percentage per person" : "Amount per person"}
              </Label>
              <div className="space-y-2 rounded-lg border p-3">
                {members.map((m) => (
                  <div key={m} className="flex items-center gap-3">
                    <PersonAvatar name={m} size="sm" />
                    <span className="w-20 truncate text-sm font-medium">{m}</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className="flex-1"
                      placeholder={splitType === "percentage" ? "%" : "Amount"}
                      value={splitAmounts[m] || ""}
                      onChange={(e) =>
                        setSplitAmounts((prev) => ({ ...prev, [m]: e.target.value }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notify via email */}
          {hasEmailContacts && (
            <div className="flex items-center gap-2.5 rounded-lg border border-lime-500/15 bg-lime-500/5 px-3 py-2.5">
              <Checkbox
                id="notify-email"
                checked={notifyEmail}
                onCheckedChange={(v) => setNotifyEmail(v === true)}
              />
              <div className="flex items-center gap-1.5">
                <IconMail className="h-3.5 w-3.5 text-lime-600 dark:text-lime-400" strokeWidth={1.8} />
                <Label
                  htmlFor="notify-email"
                  className="text-sm font-medium cursor-pointer text-lime-700 dark:text-lime-300"
                >
                  Notify via email
                </Label>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating} className="gap-1.5">
              <IconPlus className="h-4 w-4" />
              {isCreating ? "Adding..." : "Add Expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* --- Settle Dialog (with pre-fill support) --- */
function SettleDialog({
  open,
  onOpenChange,
  groupId,
  members,
  defaultPaidBy,
  defaultPaidTo,
  defaultAmount,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  groupId?: string | null
  members: string[]
  defaultPaidBy?: string
  defaultPaidTo?: string
  defaultAmount?: number
}) {
  const { createSettlement, isCreating } = useSettlements(groupId)
  const [paidBy, setPaidBy] = React.useState("Me")
  const [paidTo, setPaidTo] = React.useState("")
  const [amount, setAmount] = React.useState("")
  const [date, setDate] = React.useState(new Date().toISOString().split("T")[0])
  const [notes, setNotes] = React.useState("")

  // Apply defaults when dialog opens
  React.useEffect(() => {
    if (open) {
      setPaidBy(defaultPaidBy || "Me")
      setPaidTo(defaultPaidTo || members.find((m) => m !== (defaultPaidBy || "Me")) || "")
      setAmount(defaultAmount ? String(Math.round(defaultAmount * 100) / 100) : "")
      setDate(new Date().toISOString().split("T")[0])
      setNotes("")
    }
  }, [open, defaultPaidBy, defaultPaidTo, defaultAmount, members])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!paidBy || !paidTo || isNaN(amt) || amt <= 0) return
    try {
      await createSettlement({
        groupId: groupId || undefined,
        paidBy,
        paidTo,
        amount: amt,
        date,
        notes,
      })
      toast.success("Settlement recorded")
      setAmount("")
      setNotes("")
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record settlement")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/15">
              <IconCash className="h-5 w-5 text-amber-500" strokeWidth={1.8} />
            </div>
            <div>
              <DialogTitle>Record Settlement</DialogTitle>
              <DialogDescription className="mt-0.5">
                Record a payment between two people.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* From -> To visual */}
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-2">
              <Label>From</Label>
              <Select value={paidBy} onValueChange={setPaidBy}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-center h-9 w-9 shrink-0 rounded-full bg-accent mb-0.5">
              <IconArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 space-y-2">
              <Label>To</Label>
              <Select value={paidTo} onValueChange={setPaidTo}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {members.filter((m) => m !== paidBy).map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Pre-filled amount hint */}
          {defaultAmount && defaultAmount > 0 && (
            <div className="rounded-lg bg-amber-500/5 border border-amber-500/15 px-3 py-2">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Outstanding balance: <span className="font-semibold">{formatINR(defaultAmount)}</span>
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Amount *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="500"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="GPay transfer"
            />
          </div>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating} className="gap-1.5">
              <IconCash className="h-4 w-4" />
              {isCreating ? "Recording..." : "Record Settlement"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* --- Share Dialog --- */
function ShareDialog({
  open,
  onOpenChange,
  groupId,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  groupId?: string | null
}) {
  const { generateShareLink, isGenerating, shareData } = useShareToken()

  async function handleGenerate() {
    try {
      await generateShareLink({ groupId })
      toast.success("Share link generated")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate link")
    }
  }

  function handleCopy() {
    if (shareData?.url) {
      navigator.clipboard.writeText(shareData.url)
      toast.success("Link copied to clipboard")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500/15 to-pink-500/10">
              <IconShare className="h-5 w-5 text-pink-500" strokeWidth={1.8} />
            </div>
            <div>
              <DialogTitle>Share Balances</DialogTitle>
              <DialogDescription className="mt-0.5">
                Generate a read-only link to share balances. Links expire in 7 days.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {!shareData ? (
            <div className="rounded-xl border border-dashed p-6 text-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-pink-500/10 mx-auto mb-3">
                <IconLink className="h-5 w-5 text-pink-500" />
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Anyone with the link can view balances
              </p>
              <Button onClick={handleGenerate} disabled={isGenerating} className="gap-1.5">
                <IconLink className="h-4 w-4" />
                {isGenerating ? "Generating..." : "Generate Share Link"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl border bg-accent/30 p-4 space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={shareData.url}
                    readOnly
                    className="flex-1 text-xs bg-background"
                  />
                  <Button variant="outline" size="icon" onClick={handleCopy} className="shrink-0">
                    <IconCopy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Expires: {new Date(shareData.expiresAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* --- Balance Card --- */
function BalanceSummaryCard({
  person,
  netBalance,
  index,
  onSettle,
  onRemind,
  isReminding,
  hasEmail,
}: {
  person: string
  netBalance: number
  index: number
  onSettle?: () => void
  onRemind?: () => void
  isReminding?: boolean
  hasEmail?: boolean
}) {
  const isPositive = netBalance > 0
  return (
    <motion.div
      {...listItem(index)}
      className={cn(
        "card-elevated rounded-xl p-4 transition-all duration-300 hover:scale-[1.01]",
        isPositive
          ? "bg-gradient-to-br from-lime-500/5 to-lime-500/[0.02] hover:shadow-lime-500/10 hover:shadow-lg border border-lime-500/10"
          : "bg-gradient-to-br from-red-500/5 to-red-500/[0.02] hover:shadow-red-500/10 hover:shadow-lg border border-red-500/10"
      )}
    >
      <div className="flex items-center gap-3">
        <PersonAvatar name={person} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{person}</p>
          <p
            className={cn(
              "text-xs font-medium",
              isPositive
                ? "text-lime-600 dark:text-lime-400"
                : "text-destructive"
            )}
          >
            {isPositive ? "owes you" : "you owe"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p
              className={cn(
                "text-lg font-black tracking-tight tabular-nums",
                isPositive
                  ? "text-lime-600 dark:text-lime-400"
                  : "text-destructive"
              )}
            >
              {formatINR(Math.abs(netBalance))}
            </p>
            <div
              className={cn(
                "mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                isPositive
                  ? "bg-lime-500/10 text-lime-600 dark:text-lime-400"
                  : "bg-destructive/10 text-destructive"
              )}
            >
              {isPositive ? (
                <IconArrowRight className="h-2.5 w-2.5 -rotate-45" />
              ) : (
                <IconArrowRight className="h-2.5 w-2.5 rotate-45" />
              )}
              {isPositive ? "incoming" : "outgoing"}
            </div>
          </div>
          <div className="flex flex-col gap-1.5 shrink-0">
            {onSettle && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5"
                onClick={(e) => {
                  e.stopPropagation()
                  onSettle()
                }}
              >
                <IconCash className="h-3.5 w-3.5" />
                Settle
              </Button>
            )}
            {isPositive && hasEmail && onRemind && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5 border-lime-500/20 text-lime-600 dark:text-lime-400 hover:bg-lime-500/10"
                disabled={isReminding}
                onClick={(e) => {
                  e.stopPropagation()
                  onRemind()
                }}
              >
                {isReminding ? (
                  <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <IconMail className="h-3.5 w-3.5" />
                )}
                {isReminding ? "Sending..." : "Remind"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* --- Activity Feed Item --- */
function ActivityFeedItem({ item, index }: { item: ActivityItem; index: number }) {
  const isExpense = item.type === "expense"
  const isAutoSettled = item.notes?.startsWith("Auto-settled from:")
  return (
    <motion.div
      {...listItem(index)}
      className="flex items-start gap-3 relative"
    >
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            isAutoSettled
              ? "bg-gradient-to-br from-amber-500/15 to-yellow-500/15"
              : isExpense
                ? "bg-muted/80 dark:bg-muted"
                : "bg-gradient-to-br from-lime-500/15 to-cyan-500/15"
          )}
        >
          {isAutoSettled ? (
            <IconBolt className="h-4 w-4 text-amber-500" strokeWidth={1.8} />
          ) : isExpense ? (
            <IconReceipt className="h-4 w-4 text-muted-foreground" strokeWidth={1.8} />
          ) : (
            <IconArrowsExchange className="h-4 w-4 text-lime-500" strokeWidth={1.8} />
          )}
        </div>
      </div>
      <div className="flex-1 min-w-0 card-elevated rounded-xl bg-card p-3.5 transition-all duration-200 hover:shadow-md">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate">{item.description}</p>
              {isAutoSettled && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-500/20 shrink-0">
                  Auto
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isExpense ? `Paid by ${item.paidBy}` : `${item.paidBy} paid ${item.paidTo}`}
              {" \u00b7 "}
              {new Date(item.date).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
          <span
            className={cn(
              "text-sm font-black tracking-tight tabular-nums shrink-0",
              isExpense ? "text-foreground" : "text-lime-600 dark:text-lime-400"
            )}
          >
            {formatINR(item.amount)}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

/* --- Group Detail View --- */
function GroupDetailView({
  group,
  onBack,
}: {
  group: Group
  onBack: () => void
}) {
  const { contacts } = useContacts()
  const { expenses, deleteExpense } = useSplitExpenses(group._id)
  const { balances } = useBalances(group._id)
  const { activity } = useActivity(group._id)
  const [showExpenseDialog, setShowExpenseDialog] = React.useState(false)
  const [showSettleDialog, setShowSettleDialog] = React.useState(false)
  const [showShareDialog, setShowShareDialog] = React.useState(false)
  const [settleDefaults, setSettleDefaults] = React.useState<{
    paidBy: string
    paidTo: string
    amount: number
  } | null>(null)
  const [remindingContact, setRemindingContact] = React.useState<string | null>(null)

  // Filter out zero balances
  const activeBalances = React.useMemo(
    () => balances.filter((b) => Math.abs(b.netBalance) >= 1),
    [balances]
  )

  const handleSettleWith = (person: string, netBalance: number) => {
    if (netBalance > 0) {
      setSettleDefaults({ paidBy: person, paidTo: "Me", amount: netBalance })
    } else {
      setSettleDefaults({ paidBy: "Me", paidTo: person, amount: Math.abs(netBalance) })
    }
    setShowSettleDialog(true)
  }

  /** Send a payment reminder email for a group member who owes money. */
  async function handleRemind(personName: string) {
    const contact = contacts.find((c) => c.name === personName)
    if (!contact || !contact.email) {
      toast.error(`${personName} has no email address`)
      return
    }
    setRemindingContact(personName)
    try {
      const res = await fetch("/api/splits/notify", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: contact._id, type: "reminder" }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Reminder sent to ${personName}`)
      } else {
        toast.error(data.message || `Failed to send reminder to ${personName}`)
      }
    } catch {
      toast.error(`Failed to send reminder to ${personName}`)
    } finally {
      setRemindingContact(null)
    }
  }

  function contactHasEmail(personName: string): boolean {
    const contact = contacts.find((c) => c.name === personName)
    return !!contact?.email
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring.smooth}
      className="flex flex-col gap-5"
    >
      {/* Header card */}
      <div className="card-elevated rounded-xl bg-card p-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 -ml-1">
            <IconChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-muted/80 dark:bg-muted shrink-0">
            <IconUsersGroup className="h-5 w-5 text-foreground/70" strokeWidth={1.8} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold truncate">{group.name}</h2>
            {group.description && (
              <p className="text-xs text-muted-foreground truncate">{group.description}</p>
            )}
          </div>
          <Badge variant="secondary" className="shrink-0">
            {group.members.length} members
          </Badge>
        </div>
        {/* Members row */}
        <div className="mt-4 flex items-center gap-1.5">
          <div className="flex -space-x-2">
            {group.members.slice(0, 5).map((m) => (
              <PersonAvatar key={m} name={m} size="sm" className="ring-2 ring-card" />
            ))}
            {group.members.length > 5 && (
              <div className="flex items-center justify-center h-7 w-7 rounded-full bg-accent text-[10px] font-semibold ring-2 ring-card">
                +{group.members.length - 5}
              </div>
            )}
          </div>
          <span className="text-xs text-muted-foreground ml-2 truncate">
            {group.members.join(", ")}
          </span>
        </div>
        {/* Actions */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setShowExpenseDialog(true)} className="gap-1.5">
            <IconPlus className="h-4 w-4" /> Add Expense
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSettleDefaults(null)
              setShowSettleDialog(true)
            }}
            className="gap-1.5"
          >
            <IconCash className="h-4 w-4" /> Settle Up
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowShareDialog(true)}
            className="gap-1.5"
          >
            <IconShare className="h-4 w-4" /> Share
          </Button>
        </div>
      </div>

      {/* Balances */}
      {activeBalances.length > 0 ? (
        <div className="space-y-3">
          <SectionHeading
            icon={IconScale}
            iconBg="bg-gradient-to-br from-lime-500/15 to-cyan-500/15"
            iconColor="text-lime-500"
            title="Balances"
            count={activeBalances.length}
          />
          <div className="grid gap-2.5 sm:grid-cols-2">
            {activeBalances.map((b, i) => (
              <BalanceSummaryCard
                key={b.person}
                person={b.person}
                netBalance={b.netBalance}
                index={i}
                onSettle={() => handleSettleWith(b.person, b.netBalance)}
                onRemind={() => handleRemind(b.person)}
                isReminding={remindingContact === b.person}
                hasEmail={contactHasEmail(b.person)}
              />
            ))}
          </div>
        </div>
      ) : balances.length > 0 ? (
        <div className="card-elevated rounded-xl bg-card overflow-hidden">
          <div className="bg-gradient-to-b from-primary/[0.04] to-transparent">
            <div className="flex flex-col items-center justify-center py-8 px-6 text-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-primary/[0.08] border border-primary/10 mb-3">
                <IconCheck className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-base font-bold">All Settled!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Everyone in this group is square.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Expenses */}
      <div className="space-y-3">
        <SectionHeading
          icon={IconReceipt}
          iconBg="bg-muted/80 dark:bg-muted"
          iconColor="text-muted-foreground"
          title="Expenses"
          count={expenses.length}
        />
        {expenses.length === 0 ? (
          <EmptyState
            icon={IconReceipt}
            title="No expenses yet"
            description="Add your first shared expense to start tracking."
            action={
              <Button
                size="sm"
                onClick={() => setShowExpenseDialog(true)}
                className="gap-1.5"
              >
                <IconPlus className="h-4 w-4" /> Add Expense
              </Button>
            }
          />
        ) : (
          <div className="space-y-2">
            {expenses.map((exp, i) => (
              <motion.div
                key={exp._id}
                {...listItem(i)}
                className="card-elevated rounded-xl bg-card p-4 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/80 dark:bg-muted">
                    <IconReceipt className="h-4.5 w-4.5 text-muted-foreground" strokeWidth={1.8} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{exp.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Paid by <span className="font-medium text-foreground">{exp.paidBy}</span>
                      {" \u00b7 "}
                      <span className="capitalize">{exp.splitType}</span> split
                      {" \u00b7 "}
                      {new Date(exp.date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  </div>
                  <span className="text-sm font-black tracking-tight tabular-nums">{formatINR(exp.amount)}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={async () => {
                      try {
                        await deleteExpense(exp._id)
                        toast.success("Expense deleted")
                      } catch {
                        toast.error("Failed to delete expense")
                      }
                    }}
                  >
                    <IconTrash className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      {activity.length > 0 && (
        <div className="space-y-3">
          <SectionHeading
            icon={IconArrowsExchange}
            iconBg="bg-gradient-to-br from-amber-500/15 to-orange-500/15"
            iconColor="text-amber-500"
            title="Activity"
            count={activity.length}
          />
          <div className="space-y-2.5">
            {activity.map((item, i) => (
              <ActivityFeedItem key={item._id} item={item} index={i} />
            ))}
          </div>
        </div>
      )}

      <AddExpenseDialog
        open={showExpenseDialog}
        onOpenChange={setShowExpenseDialog}
        groupId={group._id}
        members={group.members}
        contacts={contacts}
      />
      <SettleDialog
        open={showSettleDialog}
        onOpenChange={(v) => {
          setShowSettleDialog(v)
          if (!v) setSettleDefaults(null)
        }}
        groupId={group._id}
        members={group.members}
        defaultPaidBy={settleDefaults?.paidBy}
        defaultPaidTo={settleDefaults?.paidTo}
        defaultAmount={settleDefaults?.amount}
      />
      <ShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        groupId={group._id}
      />
    </motion.div>
  )
}

/* --- Overview Tab --- */
function OverviewTab() {
  const { contacts } = useContacts()
  const { balances, totalOwed, totalOwing, isLoading } = useBalances()
  const { autoSettle, result: autoSettleResult } = useAutoSettle()
  const [showContactDialog, setShowContactDialog] = React.useState(false)
  const [showExpenseDialog, setShowExpenseDialog] = React.useState(false)
  const [showSettleDialog, setShowSettleDialog] = React.useState(false)
  const [settleDefaults, setSettleDefaults] = React.useState<{
    paidBy: string
    paidTo: string
    amount: number
  } | null>(null)
  const [autoSettleRan, setAutoSettleRan] = React.useState(false)
  const [showAutoSettleBanner, setShowAutoSettleBanner] = React.useState(true)
  const [remindingContact, setRemindingContact] = React.useState<string | null>(null)

  /** Send a payment reminder email for a specific contact who owes money. */
  async function handleRemind(personName: string) {
    const contact = contacts.find((c) => c.name === personName)
    if (!contact || !contact.email) {
      toast.error(`${personName} has no email address`)
      return
    }
    setRemindingContact(personName)
    try {
      const res = await fetch("/api/splits/notify", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: contact._id, type: "reminder" }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Reminder sent to ${personName}`)
      } else {
        toast.error(data.message || `Failed to send reminder to ${personName}`)
      }
    } catch {
      toast.error(`Failed to send reminder to ${personName}`)
    } finally {
      setRemindingContact(null)
    }
  }

  /** Look up whether a contact has an email on file by person name. */
  function contactHasEmail(personName: string): boolean {
    const contact = contacts.find((c) => c.name === personName)
    return !!contact?.email
  }

  const allMembers = React.useMemo(
    () => ["Me", ...contacts.map((c) => c.name)],
    [contacts]
  )

  // Filter out zero balances
  const activeBalances = React.useMemo(
    () => balances.filter((b) => Math.abs(b.netBalance) >= 1),
    [balances]
  )

  // Run auto-settle once on mount when data is ready
  React.useEffect(() => {
    if (!autoSettleRan && !isLoading && contacts.length > 0) {
      autoSettle()
        .then(() => setAutoSettleRan(true))
        .catch(() => setAutoSettleRan(true))
    }
  }, [autoSettleRan, isLoading, contacts.length, autoSettle])

  const handleSettleWith = (person: string, netBalance: number) => {
    if (netBalance > 0) {
      setSettleDefaults({ paidBy: person, paidTo: "Me", amount: netBalance })
    } else {
      setSettleDefaults({ paidBy: "Me", paidTo: person, amount: Math.abs(netBalance) })
    }
    setShowSettleDialog(true)
  }

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-10 w-64 rounded-lg" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  const netBalance = totalOwed - totalOwing

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={spring.smooth}
      className="flex flex-col gap-5"
    >
      {/* Summary Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring.smooth}
        className="grid grid-cols-1 sm:grid-cols-3 gap-3"
      >
        <MetricTile
          label="You are owed"
          value={formatINR(totalOwed)}
          tone="positive"
          icon={<IconArrowRight className="h-5 w-5 -rotate-45" />}
          iconBg="bg-lime-500/10 dark:bg-lime-500/15"
          iconColor="text-lime-600 dark:text-lime-400"
        />
        <MetricTile
          label="You owe"
          value={formatINR(totalOwing)}
          tone="negative"
          icon={<IconArrowRight className="h-5 w-5 rotate-45" />}
          iconBg="bg-destructive/10 dark:bg-destructive/15"
          iconColor="text-destructive"
        />
        <MetricTile
          label="Net Balance"
          value={`${netBalance >= 0 ? "+" : ""}${formatINR(netBalance)}`}
          tone={netBalance >= 0 ? "positive" : "negative"}
          trendLabel={netBalance >= 0 ? "in your favor" : "you need to settle"}
          icon={<IconScale className="h-5 w-5" />}
          iconBg="bg-muted/80 dark:bg-muted"
          iconColor="text-muted-foreground"
        />
      </motion.div>

      {/* Auto-settle banner */}
      <AnimatePresence>
        {autoSettleResult &&
          autoSettleResult.settlementsCreated > 0 &&
          showAutoSettleBanner && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={spring.fast}
              className="rounded-xl border border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-yellow-500/5 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-amber-500/10 shrink-0 mt-0.5">
                    <IconBolt className="h-4 w-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                      Auto-settled {autoSettleResult.settlementsCreated} transaction
                      {autoSettleResult.settlementsCreated !== 1 ? "s" : ""}
                    </p>
                    <div className="mt-1.5 space-y-1">
                      {autoSettleResult.settlements.map((s, i) => (
                        <p key={i} className="text-xs text-muted-foreground">
                          {formatINR(s.amount)} with{" "}
                          <span className="font-medium text-foreground">{s.person}</span>
                          {" \u2014 "}
                          {s.txnDescription}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowAutoSettleBanner(false)}
                >
                  <IconX className="h-3.5 w-3.5" />
                </Button>
              </div>
            </motion.div>
          )}
      </AnimatePresence>

      {/* Quick Actions + Contacts */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring.smooth, delay: 0.1 }}
        className="flex items-center gap-2 flex-wrap"
      >
        <Button size="sm" onClick={() => setShowExpenseDialog(true)} className="gap-1.5">
          <IconPlus className="h-4 w-4" /> Add Expense
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setSettleDefaults(null)
            setShowSettleDialog(true)
          }}
          className="gap-1.5"
        >
          <IconCash className="h-4 w-4" /> Settle Up
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowContactDialog(true)}
          className="gap-1.5"
        >
          <IconUserPlus className="h-4 w-4" /> Add Contact
        </Button>
        {contacts.length > 0 && (
          <div className="ml-auto flex items-center gap-1">
            <div className="flex -space-x-1.5">
              {contacts.slice(0, 4).map((c) => (
                <PersonAvatar key={c._id} name={c.name} size="sm" className="ring-2 ring-background" />
              ))}
            </div>
            {contacts.length > 4 && (
              <span className="text-xs text-muted-foreground ml-1">+{contacts.length - 4}</span>
            )}
          </div>
        )}
      </motion.div>

      {/* Per-Person Balances */}
      {activeBalances.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring.smooth, delay: 0.15 }}
          className="space-y-3"
        >
          <SectionHeading
            icon={IconScale}
            iconBg="bg-gradient-to-br from-lime-500/15 to-cyan-500/15"
            iconColor="text-lime-500"
            title="Balances"
            count={activeBalances.length}
          />
          <div className="grid gap-2.5 sm:grid-cols-2">
            {activeBalances.map((b, i) => (
              <BalanceSummaryCard
                key={b.person}
                person={b.person}
                netBalance={b.netBalance}
                index={i}
                onSettle={() => handleSettleWith(b.person, b.netBalance)}
                onRemind={() => handleRemind(b.person)}
                isReminding={remindingContact === b.person}
                hasEmail={contactHasEmail(b.person)}
              />
            ))}
          </div>
        </motion.div>
      ) : contacts.length > 0 ? (
        /* All Settled state */
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={spring.smooth}
          className="card-elevated rounded-xl bg-card overflow-hidden"
        >
          <div className="bg-gradient-to-b from-primary/[0.04] to-transparent">
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="relative mb-5">
                <div className="absolute inset-0 rounded-full bg-primary/5 blur-xl scale-150" />
                <div className="relative flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/[0.08] border border-primary/10">
                  <IconCheck className="h-7 w-7 text-primary" />
                </div>
              </div>
              <h3 className="text-lg font-bold">All Settled!</h3>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-xs">
                No outstanding balances. You&apos;re all square with everyone.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-4 gap-1.5"
                onClick={() => setShowExpenseDialog(true)}
              >
                <IconPlus className="h-4 w-4" /> Add Expense
              </Button>
            </div>
          </div>
        </motion.div>
      ) : (
        /* No contacts empty state */
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring.smooth}
        >
          <EmptyState
            icon={IconWallet}
            title="No splits yet"
            description="Add contacts and start splitting expenses with friends and family."
            action={
              <Button
                size="sm"
                onClick={() => setShowContactDialog(true)}
                className="gap-1.5"
              >
                <IconUserPlus className="h-4 w-4" /> Add Your First Contact
              </Button>
            }
          />
        </motion.div>
      )}

      <AddContactDialog open={showContactDialog} onOpenChange={setShowContactDialog} />
      <AddExpenseDialog
        open={showExpenseDialog}
        onOpenChange={setShowExpenseDialog}
        members={allMembers}
        contacts={contacts}
      />
      <SettleDialog
        open={showSettleDialog}
        onOpenChange={(v) => {
          setShowSettleDialog(v)
          if (!v) setSettleDefaults(null)
        }}
        members={allMembers}
        defaultPaidBy={settleDefaults?.paidBy}
        defaultPaidTo={settleDefaults?.paidTo}
        defaultAmount={settleDefaults?.amount}
      />
    </motion.div>
  )
}

/* --- Groups Tab --- */
function GroupsTab() {
  const { groups, isLoading } = useGroups()
  const [showCreateDialog, setShowCreateDialog] = React.useState(false)
  const [selectedGroup, setSelectedGroup] = React.useState<Group | null>(null)

  if (selectedGroup) {
    return (
      <GroupDetailView group={selectedGroup} onBack={() => setSelectedGroup(null)} />
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-8 w-28" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  const activeGroups = groups.filter((g) => !g.isArchived)
  const archivedGroups = groups.filter((g) => g.isArchived)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={spring.smooth}
      className="flex flex-col gap-5"
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring.smooth}
        className="flex items-center justify-between"
      >
        <SectionHeading
          icon={IconUsersGroup}
          iconBg="bg-muted/80 dark:bg-muted"
          iconColor="text-foreground/70"
          title="Your Groups"
          count={activeGroups.length}
        />
        <Button size="sm" onClick={() => setShowCreateDialog(true)} className="gap-1.5">
          <IconPlus className="h-4 w-4" /> Create Group
        </Button>
      </motion.div>

      {activeGroups.length === 0 && archivedGroups.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring.smooth}
        >
          <EmptyState
            icon={IconUsersGroup}
            title="No groups yet"
            description="Create a group to start tracking shared expenses with friends, family, or roommates."
            action={
              <Button
                size="sm"
                onClick={() => setShowCreateDialog(true)}
                className="gap-1.5"
              >
                <IconPlus className="h-4 w-4" /> Create Your First Group
              </Button>
            }
          />
        </motion.div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {activeGroups.map((g, i) => (
              <motion.button
                key={g._id}
                {...listItem(i)}
                onClick={() => setSelectedGroup(g)}
                className="card-elevated rounded-xl bg-card p-5 text-left transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 hover:scale-[1.01]"
              >
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-muted/80 dark:bg-muted shrink-0">
                    <IconUsersGroup className="h-5 w-5 text-foreground/70" strokeWidth={1.8} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-semibold truncate">{g.name}</h4>
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {g.members.length} members
                      </Badge>
                    </div>
                    {g.description && (
                      <p className="mt-1 text-xs text-muted-foreground truncate">
                        {g.description}
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-1">
                      <div className="flex -space-x-1.5">
                        {g.members.slice(0, 4).map((m) => (
                          <PersonAvatar
                            key={m}
                            name={m}
                            size="sm"
                            className="ring-2 ring-card h-6 w-6 text-[8px]"
                          />
                        ))}
                        {g.members.length > 4 && (
                          <div className="flex items-center justify-center h-6 w-6 rounded-full bg-accent text-[9px] font-semibold ring-2 ring-card">
                            +{g.members.length - 4}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>

          {archivedGroups.length > 0 && (
            <div className="space-y-3">
              <SectionHeading
                icon={IconUsersGroup}
                iconBg="bg-gradient-to-br from-slate-500/15 to-gray-500/15"
                iconColor="text-slate-400"
                title="Archived"
                count={archivedGroups.length}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                {archivedGroups.map((g, i) => (
                  <motion.button
                    key={g._id}
                    {...listItem(i)}
                    onClick={() => setSelectedGroup(g)}
                    className="card-elevated rounded-xl bg-card p-4 text-left opacity-60 transition-all duration-200 hover:opacity-80"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-slate-500/10 shrink-0">
                        <IconUsersGroup className="h-4 w-4 text-slate-400" strokeWidth={1.8} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold truncate">{g.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {g.members.length} members
                        </p>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <CreateGroupDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
    </motion.div>
  )
}

/* --- Activity Tab --- */
function ActivityTab() {
  const { activity, isLoading } = useActivity(null, 50)

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
            <Skeleton className="h-16 flex-1 rounded-xl" />
          </div>
        ))}
      </div>
    )
  }

  if (activity.length === 0) {
    return (
      <EmptyState
        icon={IconReceipt}
        title="No activity yet"
        description="Split expenses and settlements will appear here as a timeline."
      />
    )
  }

  // Group activities by date
  const grouped = activity.reduce<Record<string, ActivityItem[]>>((acc, item) => {
    const dateKey = new Date(item.date).toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    })
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(item)
    return acc
  }, {})

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={spring.smooth}
      className="flex flex-col gap-5"
    >
      {Object.entries(grouped).map(([month, items]) => (
        <div key={month} className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-border/60" />
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-2">
              {month}
            </span>
            <div className="h-px flex-1 bg-border/60" />
          </div>
          <div className="space-y-2.5">
            {items.map((item, i) => (
              <ActivityFeedItem key={item._id} item={item} index={i} />
            ))}
          </div>
        </div>
      ))}
    </motion.div>
  )
}

/**
 * Top-level Bill Splits page exported for the `/bills` route's "Splits" tab.
 * Renders metric tiles (total owed/owing, pending), tabbed views for
 * Balances, Groups, Expenses, Settlements, and Activity, plus dialogs
 * for adding contacts, groups, expenses, and settlements.
 */
export function SplitsView() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-5 p-4 md:p-6">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-1">
            <TabsTrigger value="overview" className="gap-2">
              <IconWallet className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="groups" className="gap-2">
              <IconUsersGroup className="h-4 w-4" />
              Groups
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-2">
              <IconReceipt className="h-4 w-4" />
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <OverviewTab />
          </TabsContent>
          <TabsContent value="groups" className="mt-4">
            <GroupsTab />
          </TabsContent>
          <TabsContent value="activity" className="mt-4">
            <ActivityTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
