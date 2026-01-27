"use client"

import * as React from "react"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { IconPlus, IconSearch, IconChevronLeft, IconChevronRight } from "@tabler/icons-react"

import { useTransactions } from "@/hooks/use-transactions"
import { useAuth } from "@/hooks/use-auth"
import { transformTransactionsForTable } from "@/lib/transform-transactions"
import { calculateDailyTrends } from "@/lib/analytics"
import { isCompletedStatus } from "@/lib/utils"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function TransactionsPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { transactions, isLoading: transactionsLoading } = useTransactions()

  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const matchesSearch =
        transaction.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.paymentMethod.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesFilter = filterType === "all" || transaction.type === filterType

      return matchesSearch && matchesFilter
    })
  }, [transactions, searchQuery, filterType])

  const tableData = useMemo(
    () => transformTransactionsForTable(filteredTransactions),
    [filteredTransactions]
  )

  const totalPages = Math.ceil(tableData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedData = tableData.slice(startIndex, startIndex + itemsPerPage)

  const isLoading = authLoading || transactionsLoading

  const incomeTotal = filteredTransactions
    .filter((t) => t.type === "income" && isCompletedStatus(t.status))
    .reduce((sum, t) => sum + t.amount, 0)
  const expenseTotal = filteredTransactions
    .filter((t) => t.type === "expense" && isCompletedStatus(t.status))
    .reduce((sum, t) => sum + t.amount, 0)
  const netTotal = incomeTotal - expenseTotal

  const dailyTrend = calculateDailyTrends(filteredTransactions)
    .slice(-14)
    .map((item) => ({
      date: new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      net: item.net,
      expenses: item.expenses,
    }))

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
          title="Transactions"
          subtitle="Filter, review, and export your activity"
        />
        <div className="flex flex-1 flex-col">
          {isLoading ? (
            <div className="flex items-center justify-center flex-1">
              <Skeleton className="h-96 w-full max-w-4xl mx-6" />
            </div>
          ) : (
            <div className="space-y-6 p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-semibold">Transaction Ledger</h1>
                  <p className="text-muted-foreground">Track every debit and credit</p>
                </div>
                <Button>
                  <IconPlus className="size-4 mr-2" />
                  Add Transaction
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Card className="border border-border/70">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Income</p>
                    <p className="text-2xl font-semibold text-emerald-600">{formatCurrency(incomeTotal)}</p>
                  </CardContent>
                </Card>
                <Card className="border border-border/70">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Expenses</p>
                    <p className="text-2xl font-semibold text-rose-600">{formatCurrency(expenseTotal)}</p>
                  </CardContent>
                </Card>
                <Card className="border border-border/70">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Net</p>
                    <p className="text-2xl font-semibold">{formatCurrency(netTotal)}</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="border border-border/70">
                <CardHeader>
                  <CardTitle>Daily Net Movement</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={dailyTrend}>
                      <defs>
                        <linearGradient id="netFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                      <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Area type="monotone" dataKey="net" stroke="#0ea5e9" fill="url(#netFill)" strokeWidth={3} strokeOpacity={0.95} isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="flex flex-wrap items-center gap-4">
                <div className="relative w-[260px]">
                  <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search description, category, payment"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="pl-9"
                  />
                </div>
                <div className="flex gap-2">
                  {(["all", "income", "expense"] as const).map((type) => (
                    <Button
                      key={type}
                      variant={filterType === type ? "default" : "outline"}
                      onClick={() => {
                        setFilterType(type)
                        setCurrentPage(1)
                      }}
                    >
                      {type === "all" ? "All" : type.charAt(0).toUpperCase() + type.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              <Card className="border border-border/70">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedData.length > 0 ? (
                        paginatedData.map((transaction) => (
                          <TableRow key={transaction.id} className="h-[60px]">
                            <TableCell className="font-medium">
                              {new Date(transaction.date).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </TableCell>
                            <TableCell>{transaction.description}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{transaction.category}</Badge>
                            </TableCell>
                            <TableCell>{transaction.paymentMethod}</TableCell>
                            <TableCell className="text-right">
                              <span
                                className={
                                  transaction.type === "income"
                                    ? "text-emerald-600 font-semibold"
                                    : "text-rose-600 font-semibold"
                                }
                              >
                                {transaction.type === "income" ? "+" : "-"}
                                {formatCurrency(transaction.amount)}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                            No transactions found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Rows</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => {
                      setItemsPerPage(Number(value))
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger className="h-9 w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[10, 20, 30].map((size) => (
                        <SelectItem key={size} value={size.toString()}>
                          {size} rows
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <IconChevronLeft className="size-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <IconChevronRight className="size-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
