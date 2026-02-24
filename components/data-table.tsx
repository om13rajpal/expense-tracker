/**
 * Full-featured transaction data table with search, column filters,
 * sorting, pagination, and row selection. Built on TanStack Table.
 * @module components/data-table
 */
"use client"

import * as React from "react"
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconDotsVertical,
  IconFilter,
  IconSearch,
  IconX,
  IconArrowUpCircle,
  IconArrowDownCircle,
  IconEdit,
  IconTrash,
  IconCreditCard,
  IconCash,
  IconBuildingBank,
  IconWallet,
} from "@tabler/icons-react"
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"
import { z } from "zod"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

/** Zod schema validating the shape of a table transaction row. */
export const transactionSchema = z.object({
  id: z.string(),
  date: z.string(),
  description: z.string(),
  category: z.string(),
  amount: z.number(),
  type: z.enum(["income", "expense"]),
  paymentMethod: z.string(),
})

/** Inferred TypeScript type for a single transaction table row. */
export type Transaction = z.infer<typeof transactionSchema>

/** Sample transaction data used as a default when no real data is provided. */
export const mockTransactions: Transaction[] = [
  {
    id: "1",
    date: "2026-01-26",
    description: "Grocery Shopping - Fresh Mart",
    category: "Food & Dining",
    amount: 2450,
    type: "expense",
    paymentMethod: "UPI",
  },
  {
    id: "2",
    date: "2026-01-25",
    description: "Salary Credit",
    category: "Income",
    amount: 75000,
    type: "income",
    paymentMethod: "NEFT",
  },
  {
    id: "3",
    date: "2026-01-24",
    description: "Uber Ride",
    category: "Transport",
    amount: 385,
    type: "expense",
    paymentMethod: "UPI",
  },
  {
    id: "4",
    date: "2026-01-24",
    description: "Amazon Order",
    category: "Shopping",
    amount: 3200,
    type: "expense",
    paymentMethod: "Card",
  },
  {
    id: "5",
    date: "2026-01-23",
    description: "Electricity Bill",
    category: "Bills & Utilities",
    amount: 1850,
    type: "expense",
    paymentMethod: "UPI",
  },
  {
    id: "6",
    date: "2026-01-22",
    description: "Netflix Subscription",
    category: "Entertainment",
    amount: 649,
    type: "expense",
    paymentMethod: "Card",
  },
  {
    id: "7",
    date: "2026-01-21",
    description: "Restaurant - Pizza Hut",
    category: "Food & Dining",
    amount: 1250,
    type: "expense",
    paymentMethod: "UPI",
  },
  {
    id: "8",
    date: "2026-01-20",
    description: "Petrol",
    category: "Transport",
    amount: 2000,
    type: "expense",
    paymentMethod: "Cash",
  },
]

/** Formats a number as INR currency with no decimal places. */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

/** Tailwind badge colour classes keyed by transaction category name. */
const categoryColors: Record<string, string> = {
  "Food & Dining": "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  "Transport": "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  "Shopping": "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  "Bills & Utilities": "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
  "Entertainment": "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300",
  "Income": "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  "Healthcare": "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  "Education": "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  "Investment": "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
}

/**
 * Resolves a Tabler icon component for a payment method string.
 * Matches "card", "cash", "upi", "neft"/"imps"/"rtgs"; defaults to IconWallet.
 */
const getPaymentIcon = (method: string) => {
  const methodLower = method.toLowerCase()
  if (methodLower.includes('card')) return IconCreditCard
  if (methodLower.includes('cash')) return IconCash
  if (methodLower.includes('upi')) return IconWallet
  if (methodLower.includes('neft') || methodLower.includes('imps') || methodLower.includes('rtgs')) return IconBuildingBank
  return IconWallet
}

/** TanStack Table column definitions for the transaction table. */
const columns: ColumnDef<Transaction>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => null, // Hidden column for filtering only
    enableHiding: false,
    enableSorting: false,
  },
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => {
      const date = new Date(row.original.date)
      return (
        <div className="font-medium tabular-nums">
          {date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </div>
      )
    },
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => (
      <div className="max-w-64">
        <div className="font-medium truncate" title={row.original.description}>
          {row.original.description}
        </div>
        <div className="text-sm text-muted-foreground truncate">{row.original.category}</div>
      </div>
    ),
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => {
      const category = row.original.category
      const colorClass = categoryColors[category] || "bg-secondary text-secondary-foreground"
      return (
        <Badge
          variant="outline"
          className={`font-normal border-0 ${colorClass}`}
        >
          {category}
        </Badge>
      )
    },
  },
  {
    accessorKey: "paymentMethod",
    header: "Payment Method",
    cell: ({ row }) => {
      const PaymentIcon = getPaymentIcon(row.original.paymentMethod)
      return (
        <div className="flex items-center gap-2">
          <PaymentIcon className="size-4 text-muted-foreground" />
          <span className="text-sm">{row.original.paymentMethod}</span>
        </div>
      )
    },
  },
  {
    accessorKey: "amount",
    header: () => <div className="text-right">Amount</div>,
    cell: ({ row }) => {
      const isIncome = row.original.type === "income"
      const Icon = isIncome ? IconArrowUpCircle : IconArrowDownCircle
      return (
        <div className="flex items-center justify-end gap-2">
          <div
            className={`flex items-center gap-1.5 font-semibold tabular-nums px-3 py-1 rounded-full ${
              isIncome
                ? "bg-success/10 text-success"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            <Icon className="size-4" />
            <span>
              {isIncome ? "+" : "-"} {formatCurrency(row.original.amount)}
            </span>
          </div>
        </div>
      )
    },
  },
  {
    id: "actions",
    cell: () => (
      <div className="flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-primary hover:text-primary hover:bg-primary/10 transition-all duration-200 hover:scale-110"
        >
          <IconEdit className="size-4" />
          <span className="sr-only">Edit</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all duration-200 hover:scale-110"
        >
          <IconTrash className="size-4" />
          <span className="sr-only">Delete</span>
        </Button>
      </div>
    ),
  },
]

/**
 * Renders a filterable, sortable, paginated transaction table.
 * @param data - Array of transactions to display. Falls back to mock data.
 */
export function DataTable({
  data = mockTransactions,
}: {
  data?: Transaction[]
}) {
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "date", desc: true },
  ])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const [globalFilter, setGlobalFilter] = React.useState("")

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
      globalFilter,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  const categories = Array.from(
    new Set(data.map((t) => t.category))
  ).sort()

  const paymentMethods = Array.from(
    new Set(data.map((t) => t.paymentMethod))
  ).sort()

  const categoryFilter = columnFilters.find((f) => f.id === "category")?.value as string | undefined
  const paymentFilter = columnFilters.find((f) => f.id === "paymentMethod")?.value as string | undefined
  const typeFilter = columnFilters.find((f) => f.id === "type")?.value as string | undefined

  return (
    <div className="flex w-full flex-col gap-6 px-4 lg:px-6">
      {/* Enhanced Search and Filters */}
      <div className="flex flex-col gap-4 @lg/main:flex-row @lg/main:items-center @lg/main:justify-between">
        {/* Enhanced Search Bar */}
        <div className="relative flex-1 max-w-md">
          <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground transition-colors" />
          <Input
            placeholder="Search transactions..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-12 h-12 shadow-sm focus:shadow-md transition-all duration-200 focus:border-primary"
          />
          {globalFilter && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 size-8 hover:bg-muted/80 transition-all duration-200"
              onClick={() => setGlobalFilter("")}
            >
              <IconX className="size-4" />
            </Button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Type Filter Pills */}
          <div className="flex items-center gap-2">
            <Button
              variant={typeFilter === undefined ? "default" : "outline"}
              size="sm"
              onClick={() => table.getColumn("type")?.setFilterValue(undefined)}
              className={`rounded-full transition-all duration-200 ${
                typeFilter === undefined
                  ? "bg-gradient-primary text-primary-foreground shadow-md"
                  : "bg-secondary hover:bg-secondary/80"
              }`}
            >
              All
              <Badge variant="secondary" className="ml-2 rounded-full px-2 bg-background/20">
                {data.length}
              </Badge>
            </Button>
            <Button
              variant={typeFilter === "income" ? "default" : "outline"}
              size="sm"
              onClick={() => table.getColumn("type")?.setFilterValue("income")}
              className={`rounded-full transition-all duration-200 ${
                typeFilter === "income"
                  ? "bg-gradient-success text-success-foreground shadow-md"
                  : "bg-secondary hover:bg-secondary/80"
              }`}
            >
              Income
              <Badge variant="secondary" className="ml-2 rounded-full px-2 bg-background/20">
                {data.filter((t) => t.type === "income").length}
              </Badge>
            </Button>
            <Button
              variant={typeFilter === "expense" ? "default" : "outline"}
              size="sm"
              onClick={() => table.getColumn("type")?.setFilterValue("expense")}
              className={`rounded-full transition-all duration-200 ${
                typeFilter === "expense"
                  ? "bg-gradient-destructive text-destructive-foreground shadow-md"
                  : "bg-secondary hover:bg-secondary/80"
              }`}
            >
              Expense
              <Badge variant="secondary" className="ml-2 rounded-full px-2 bg-background/20">
                {data.filter((t) => t.type === "expense").length}
              </Badge>
            </Button>
          </div>

          {/* Category Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={`rounded-full transition-all duration-200 ${
                  categoryFilter
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-secondary hover:bg-secondary/80"
                }`}
              >
                <IconFilter className="size-4" />
                Category
                {categoryFilter && (
                  <Badge variant="secondary" className="ml-2 rounded-full px-2">
                    1
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {categoryFilter && (
                <>
                  <DropdownMenuItem
                    onClick={() => {
                      table.getColumn("category")?.setFilterValue(undefined)
                    }}
                  >
                    <IconX className="mr-2 size-4" />
                    Clear filter
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {categories.map((category) => (
                <DropdownMenuCheckboxItem
                  key={category}
                  checked={categoryFilter === category}
                  onCheckedChange={(checked) => {
                    table
                      .getColumn("category")
                      ?.setFilterValue(checked ? category : undefined)
                  }}
                >
                  {category}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Payment Method Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={`rounded-full transition-all duration-200 ${
                  paymentFilter
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-secondary hover:bg-secondary/80"
                }`}
              >
                <IconFilter className="size-4" />
                Payment
                {paymentFilter && (
                  <Badge variant="secondary" className="ml-2 rounded-full px-2">
                    1
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {paymentFilter && (
                <>
                  <DropdownMenuItem
                    onClick={() => {
                      table.getColumn("paymentMethod")?.setFilterValue(undefined)
                    }}
                  >
                    <IconX className="mr-2 size-4" />
                    Clear filter
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {paymentMethods.map((method) => (
                <DropdownMenuCheckboxItem
                  key={method}
                  checked={paymentFilter === method}
                  onCheckedChange={(checked) => {
                    table
                      .getColumn("paymentMethod")
                      ?.setFilterValue(checked ? method : undefined)
                  }}
                >
                  {method}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Column Visibility */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-full bg-secondary hover:bg-secondary/80 transition-all duration-200">
                <IconChevronDown className="size-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {table
                .getAllColumns()
                .filter(
                  (column) =>
                    typeof column.accessorFn !== "undefined" &&
                    column.getCanHide()
                )
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Enhanced Table Container */}
      <div className="overflow-hidden rounded-xl border bg-gradient-card shadow-elevation-medium animate-slide-up">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0 backdrop-blur-sm">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent border-b border-border/50">
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} colSpan={header.colSpan} className="font-semibold">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row, index) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={`
                    hover:bg-primary/5 transition-colors duration-150 border-b border-border/30
                    ${index % 2 === 1 ? "bg-muted/20" : ""}
                  `}
                  style={{
                    animation: `stagger-slide-up 0.4s ease-out ${index * 0.05}s both`,
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-4">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <IconSearch className="size-8 opacity-50" />
                    <p>No transactions found.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Enhanced Pagination */}
      <div className="flex items-center justify-between px-4">
        <div className="text-muted-foreground hidden flex-1 text-sm lg:flex items-center gap-2">
          <span className="font-medium">{table.getFilteredSelectedRowModel().rows.length}</span>
          <span>of</span>
          <span className="font-medium">{table.getFilteredRowModel().rows.length}</span>
          <span>row(s) selected</span>
        </div>
        <div className="flex w-full items-center gap-6 lg:w-fit">
          <div className="hidden items-center gap-3 lg:flex">
            <Label htmlFor="rows-per-page" className="text-sm font-medium whitespace-nowrap">
              Rows per page
            </Label>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value))
              }}
            >
              <SelectTrigger
                size="sm"
                className="w-20 transition-all duration-200 hover:border-primary"
                id="rows-per-page"
              >
                <SelectValue
                  placeholder={table.getState().pagination.pageSize}
                />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 40, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium tabular-nums">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-1.5 lg:ml-0">
            <Button
              variant="outline"
              className="hidden h-9 w-9 p-0 lg:flex transition-all duration-200 hover:shadow-md hover:border-primary disabled:opacity-50"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to first page</span>
              <IconChevronsLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              className="h-9 w-9 transition-all duration-200 hover:shadow-md hover:border-primary disabled:opacity-50"
              size="icon"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              <IconChevronLeft className="size-4" />
            </Button>

            {/* Page Number Buttons */}
            {Array.from({ length: Math.min(5, table.getPageCount()) }, (_, i) => {
              const pageIndex = table.getState().pagination.pageIndex
              const totalPages = table.getPageCount()
              let pageNum: number

              if (totalPages <= 5) {
                pageNum = i
              } else if (pageIndex < 3) {
                pageNum = i
              } else if (pageIndex > totalPages - 4) {
                pageNum = totalPages - 5 + i
              } else {
                pageNum = pageIndex - 2 + i
              }

              const isActive = pageNum === pageIndex

              return (
                <Button
                  key={pageNum}
                  variant={isActive ? "default" : "outline"}
                  className={`h-9 w-9 transition-all duration-200 hidden sm:flex ${
                    isActive
                      ? "bg-gradient-primary text-primary-foreground shadow-md"
                      : "hover:shadow-md hover:bg-secondary/50"
                  }`}
                  size="icon"
                  onClick={() => table.setPageIndex(pageNum)}
                >
                  {pageNum + 1}
                </Button>
              )
            })}

            <Button
              variant="outline"
              className="h-9 w-9 transition-all duration-200 hover:shadow-md hover:border-primary disabled:opacity-50"
              size="icon"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>
              <IconChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-9 w-9 p-0 lg:flex transition-all duration-200 hover:shadow-md hover:border-primary disabled:opacity-50"
              size="icon"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to last page</span>
              <IconChevronsRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
