/**
 * React Query hooks for the bill-splitting / shared expenses feature.
 * Manages contacts, groups, split expenses, settlements, balances,
 * activity feeds, shareable links, and automatic settlement detection.
 * @module hooks/use-splits
 */
"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

// ─── Types ───────────────────────────────────────────────────────────

/**
 * A person in the user's contact list used for bill splitting.
 * @property _id - MongoDB document identifier
 * @property name - Display name of the contact
 * @property phone - Phone number of the contact
 * @property email - Email address of the contact
 * @property createdAt - ISO timestamp of when the contact was added
 */
export interface Contact {
  _id: string
  name: string
  phone: string
  email: string
  createdAt: string
}

/**
 * A group of people who frequently split expenses together (e.g. "Roommates", "Trip to Goa").
 * @property _id - MongoDB document identifier
 * @property name - Display name of the group
 * @property members - Array of member names participating in the group
 * @property description - Optional description or purpose of the group
 * @property isArchived - Whether the group has been archived (hidden from active view)
 * @property createdAt - ISO timestamp of when the group was created
 * @property updatedAt - ISO timestamp of the most recent update
 */
export interface Group {
  _id: string
  name: string
  members: string[]
  description: string
  isArchived: boolean
  createdAt: string
  updatedAt: string
}

/**
 * A shared expense that has been split among multiple people.
 * @property _id - MongoDB document identifier
 * @property groupId - The group this expense belongs to, or null for ungrouped expenses
 * @property description - What the expense was for (e.g. "Dinner at restaurant")
 * @property amount - Total expense amount in the user's currency
 * @property paidBy - Name of the person who paid the full amount upfront
 * @property splitType - How the expense is divided: equally, by exact amounts, or by percentages
 * @property splits - Per-person breakdown of the amount each person owes
 * @property date - ISO date string of when the expense occurred
 * @property category - Optional spending category for the expense
 * @property createdAt - ISO timestamp of when the expense record was created
 */
export interface SplitExpenseItem {
  _id: string
  groupId: string | null
  description: string
  amount: number
  paidBy: string
  splitType: "equal" | "exact" | "percentage"
  splits: { person: string; amount: number }[]
  date: string
  category: string
  createdAt: string
}

/**
 * A payment made by one person to another to settle outstanding balances.
 * @property _id - MongoDB document identifier
 * @property groupId - The group this settlement belongs to, or null for ungrouped settlements
 * @property paidBy - Name of the person making the payment
 * @property paidTo - Name of the person receiving the payment
 * @property amount - Settlement amount in the user's currency
 * @property date - ISO date string of when the settlement was made
 * @property notes - Optional notes about the settlement (e.g. payment method)
 * @property createdAt - ISO timestamp of when the settlement record was created
 */
export interface SettlementItem {
  _id: string
  groupId: string | null
  paidBy: string
  paidTo: string
  amount: number
  date: string
  notes: string
  createdAt: string
}

/**
 * Net balance summary for a single person across all shared expenses and settlements.
 * @property person - Name of the person
 * @property netBalance - Net amount: positive means they owe the user, negative means the user owes them
 * @property youOwe - Total amount the user owes this person
 * @property theyOwe - Total amount this person owes the user
 */
export interface BalanceItem {
  person: string
  netBalance: number
  youOwe: number
  theyOwe: number
}

/**
 * A single entry in the combined activity feed, representing either an expense or a settlement.
 * @property _id - MongoDB document identifier
 * @property type - Whether this activity is an expense or a settlement
 * @property description - Description of the expense, or settlement notes
 * @property amount - The monetary amount involved
 * @property paidBy - Name of the person who paid
 * @property paidTo - Name of the person who received payment (settlements only)
 * @property splits - Per-person split amounts (expenses only)
 * @property splitType - How the expense was divided (expenses only)
 * @property groupId - The group this activity belongs to, or null
 * @property date - ISO date string of when the activity occurred
 * @property notes - Optional notes (settlements only)
 * @property createdAt - ISO timestamp of when the record was created
 */
export interface ActivityItem {
  _id: string
  type: "expense" | "settlement"
  description: string
  amount: number
  paidBy: string
  paidTo?: string
  splits?: { person: string; amount: number }[]
  splitType?: string
  groupId: string | null
  date: string
  notes?: string
  createdAt: string
}

// ─── Fetchers ────────────────────────────────────────────────────────

/**
 * Generic authenticated GET request that parses JSON and checks for success.
 * @template T - Expected response type
 * @param url - The API endpoint URL
 * @returns The parsed JSON response
 * @throws {Error} If the response indicates failure
 */
async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" })
  const data = await res.json()
  if (!data.success) throw new Error(data.message || "Request failed")
  return data
}

/**
 * Generic authenticated POST request that sends JSON and checks for success.
 * @template T - Expected response type
 * @param url - The API endpoint URL
 * @param body - The request body to serialize as JSON
 * @returns The parsed JSON response
 * @throws {Error} If the response indicates failure
 */
async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!data.success) throw new Error(data.message || "Request failed")
  return data
}

/**
 * Generic authenticated PATCH request that sends JSON and checks for success.
 * @template T - Expected response type
 * @param url - The API endpoint URL
 * @param body - The partial update payload to serialize as JSON
 * @returns The parsed JSON response
 * @throws {Error} If the response indicates failure
 */
async function patchJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!data.success) throw new Error(data.message || "Request failed")
  return data
}

/**
 * Generic authenticated DELETE request that checks for success.
 * @template T - Expected response type
 * @param url - The API endpoint URL (typically includes the ID as a query parameter)
 * @returns The parsed JSON response
 * @throws {Error} If the response indicates failure
 */
async function deleteJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { method: "DELETE", credentials: "include" })
  const data = await res.json()
  if (!data.success) throw new Error(data.message || "Request failed")
  return data
}

// ─── Hooks ──────────────────────────────────────────────────────────

/**
 * Manages the user's contact list for bill splitting.
 * Provides CRUD operations for contacts with automatic cache invalidation.
 *
 * @returns An object containing:
 *   - `contacts` - Array of contact objects (defaults to empty array)
 *   - `isLoading` - True during initial fetch
 *   - `error` - Error message string, or null
 *   - `createContact(body)` - Async function to add a new contact
 *   - `updateContact(body)` - Async function to update an existing contact
 *   - `deleteContact(id)` - Async function to remove a contact by ID
 *   - `isCreating` - True while a create mutation is in flight
 */
export function useContacts() {
  const qc = useQueryClient()
  const key = ["splits", "contacts"]

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchJSON<{ contacts: Contact[] }>("/api/splits/contacts"),
    staleTime: 30_000,
  })

  const createMutation = useMutation({
    mutationFn: (body: { name: string; phone?: string; email?: string }) =>
      postJSON<{ contact: Contact }>("/api/splits/contacts", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  })

  const updateMutation = useMutation({
    mutationFn: (body: { id: string; name?: string; phone?: string; email?: string }) =>
      patchJSON("/api/splits/contacts", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteJSON(`/api/splits/contacts?id=${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  })

  return {
    contacts: query.data?.contacts ?? [],
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    createContact: createMutation.mutateAsync,
    updateContact: updateMutation.mutateAsync,
    deleteContact: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
  }
}

/**
 * Manages expense-splitting groups (e.g. "Roommates", "Office Lunch").
 * Provides create and update operations with automatic cache invalidation.
 *
 * @returns An object containing:
 *   - `groups` - Array of group objects (defaults to empty array)
 *   - `isLoading` - True during initial fetch
 *   - `error` - Error message string, or null
 *   - `createGroup(body)` - Async function to create a new group with members
 *   - `updateGroup(body)` - Async function to update group name, members, or archive status
 *   - `isCreating` - True while a create mutation is in flight
 */
export function useGroups() {
  const qc = useQueryClient()
  const key = ["splits", "groups"]

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchJSON<{ groups: Group[] }>("/api/splits/groups"),
    staleTime: 30_000,
  })

  const createMutation = useMutation({
    mutationFn: (body: { name: string; members: string[]; description?: string }) =>
      postJSON<{ group: Group }>("/api/splits/groups", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  })

  const updateMutation = useMutation({
    mutationFn: (body: { id: string; name?: string; members?: string[]; description?: string; isArchived?: boolean }) =>
      patchJSON("/api/splits/groups", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  })

  return {
    groups: query.data?.groups ?? [],
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    createGroup: createMutation.mutateAsync,
    updateGroup: updateMutation.mutateAsync,
    isCreating: createMutation.isPending,
  }
}

/**
 * Fetches and manages split expenses, optionally filtered by group.
 * On create or delete, invalidates expenses, balances, and activity caches
 * to keep the entire splits UI consistent.
 *
 * @param groupId - Optional group ID to filter expenses; pass null or omit for all expenses
 * @returns An object containing:
 *   - `expenses` - Array of split expense objects (defaults to empty array)
 *   - `isLoading` - True during initial fetch
 *   - `error` - Error message string, or null
 *   - `createExpense(body)` - Async function to record a new shared expense
 *   - `deleteExpense(id)` - Async function to remove a split expense by ID
 *   - `isCreating` - True while a create mutation is in flight
 */
export function useSplitExpenses(groupId?: string | null) {
  const qc = useQueryClient()
  const url = groupId ? `/api/splits/expenses?groupId=${groupId}` : "/api/splits/expenses"
  const key = ["splits", "expenses", groupId ?? "all"]

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchJSON<{ expenses: SplitExpenseItem[] }>(url),
    staleTime: 30_000,
  })

  const createMutation = useMutation({
    mutationFn: (body: {
      groupId?: string | null
      description: string
      amount: number
      paidBy: string
      splitType: string
      splits: { person: string; amount: number }[]
      date: string
      category?: string
    }) => postJSON<{ expense: SplitExpenseItem }>("/api/splits/expenses", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["splits", "expenses"] })
      qc.invalidateQueries({ queryKey: ["splits", "balances"] })
      qc.invalidateQueries({ queryKey: ["splits", "activity"] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteJSON(`/api/splits/expenses?id=${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["splits", "expenses"] })
      qc.invalidateQueries({ queryKey: ["splits", "balances"] })
      qc.invalidateQueries({ queryKey: ["splits", "activity"] })
    },
  })

  return {
    expenses: query.data?.expenses ?? [],
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    createExpense: createMutation.mutateAsync,
    deleteExpense: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
  }
}

/**
 * Fetches and manages settlement payments, optionally filtered by group.
 * On create, invalidates settlements, balances, and activity caches.
 *
 * @param groupId - Optional group ID to filter settlements; pass null or omit for all settlements
 * @returns An object containing:
 *   - `settlements` - Array of settlement objects (defaults to empty array)
 *   - `isLoading` - True during initial fetch
 *   - `error` - Error message string, or null
 *   - `createSettlement(body)` - Async function to record a new settlement payment
 *   - `isCreating` - True while a create mutation is in flight
 */
export function useSettlements(groupId?: string | null) {
  const qc = useQueryClient()
  const url = groupId ? `/api/splits/settle?groupId=${groupId}` : "/api/splits/settle"
  const key = ["splits", "settlements", groupId ?? "all"]

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchJSON<{ settlements: SettlementItem[] }>(url),
    staleTime: 30_000,
  })

  const createMutation = useMutation({
    mutationFn: (body: {
      groupId?: string | null
      paidBy: string
      paidTo: string
      amount: number
      date: string
      notes?: string
    }) => postJSON<{ settlement: SettlementItem }>("/api/splits/settle", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["splits", "settlements"] })
      qc.invalidateQueries({ queryKey: ["splits", "balances"] })
      qc.invalidateQueries({ queryKey: ["splits", "activity"] })
    },
  })

  return {
    settlements: query.data?.settlements ?? [],
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    createSettlement: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
  }
}

/**
 * Fetches net balance summaries for all people the user splits expenses with,
 * optionally filtered by group. Shows who owes whom and how much.
 *
 * @param groupId - Optional group ID to scope balances; pass null or omit for global balances
 * @returns An object containing:
 *   - `balances` - Array of per-person balance summaries (defaults to empty array)
 *   - `totalOwed` - Total amount others owe the user
 *   - `totalOwing` - Total amount the user owes others
 *   - `isLoading` - True during initial fetch
 *   - `error` - Error message string, or null
 */
export function useBalances(groupId?: string | null) {
  const url = groupId ? `/api/splits/balances?groupId=${groupId}` : "/api/splits/balances"
  const key = ["splits", "balances", groupId ?? "all"]

  const query = useQuery({
    queryKey: key,
    queryFn: () =>
      fetchJSON<{ balances: BalanceItem[]; totalOwed: number; totalOwing: number }>(url),
    staleTime: 30_000,
  })

  return {
    balances: query.data?.balances ?? [],
    totalOwed: query.data?.totalOwed ?? 0,
    totalOwing: query.data?.totalOwing ?? 0,
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
  }
}

/**
 * Fetches the combined activity feed of expenses and settlements,
 * optionally filtered by group and limited to a maximum number of entries.
 *
 * @param groupId - Optional group ID to filter activity; pass null or omit for all activity
 * @param limit - Maximum number of activity entries to return (default: 20)
 * @returns An object containing:
 *   - `activity` - Array of activity items sorted by date descending (defaults to empty array)
 *   - `isLoading` - True during initial fetch
 *   - `error` - Error message string, or null
 */
export function useActivity(groupId?: string | null, limit = 20) {
  const url = groupId
    ? `/api/splits/activity?groupId=${groupId}&limit=${limit}`
    : `/api/splits/activity?limit=${limit}`
  const key = ["splits", "activity", groupId ?? "all", limit]

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchJSON<{ activity: ActivityItem[] }>(url),
    staleTime: 30_000,
  })

  return {
    activity: query.data?.activity ?? [],
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
  }
}

/**
 * Mutation hook to generate a shareable link for viewing split balances or activity.
 * The link contains a time-limited token so non-authenticated users can view the data.
 *
 * @returns An object containing:
 *   - `generateShareLink(body)` - Async function accepting optional groupId and personFilter
 *   - `isGenerating` - True while the share token is being created
 *   - `shareData` - The generated token, URL, and expiration, or null
 */
export function useShareToken() {
  const mutation = useMutation({
    mutationFn: (body: { groupId?: string | null; personFilter?: string | null }) =>
      postJSON<{ token: string; url: string; expiresAt: string }>("/api/splits/share", body),
  })

  return {
    generateShareLink: mutation.mutateAsync,
    isGenerating: mutation.isPending,
    shareData: mutation.data ?? null,
  }
}

/**
 * Result of the automatic settlement detection process.
 * @property settlementsCreated - Number of new settlement records auto-generated
 * @property settlements - Details of each auto-detected settlement including matched transaction info
 */
export interface AutoSettleResult {
  settlementsCreated: number
  settlements: Array<{
    /** Name of the person who made the settlement payment */
    person: string
    /** Amount of the settlement */
    amount: number
    /** Description of the matching transaction that triggered auto-settlement */
    txnDescription: string
    /** ISO date string of the matching transaction */
    txnDate: string
  }>
}

/**
 * Mutation hook that scans recent transactions for payments that look like
 * settlements (e.g. UPI transfers to known contacts) and automatically
 * creates settlement records. Invalidates balances, settlements, and activity
 * caches when new settlements are detected.
 *
 * @returns An object containing:
 *   - `autoSettle()` - Async function to trigger automatic settlement detection
 *   - `isSettling` - True while the auto-settle scan is running
 *   - `result` - The auto-settle result with count and details, or null
 */
export function useAutoSettle() {
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: () =>
      postJSON<AutoSettleResult>("/api/splits/auto-settle", {}),
    onSuccess: (data) => {
      if (data.settlementsCreated > 0) {
        qc.invalidateQueries({ queryKey: ["splits", "balances"] })
        qc.invalidateQueries({ queryKey: ["splits", "settlements"] })
        qc.invalidateQueries({ queryKey: ["splits", "activity"] })
      }
    },
  })

  return {
    autoSettle: mutation.mutateAsync,
    isSettling: mutation.isPending,
    result: mutation.data ?? null,
  }
}
