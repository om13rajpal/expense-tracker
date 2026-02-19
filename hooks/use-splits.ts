"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

// ─── Types ───────────────────────────────────────────────────────────

export interface Contact {
  _id: string
  name: string
  phone: string
  email: string
  createdAt: string
}

export interface Group {
  _id: string
  name: string
  members: string[]
  description: string
  isArchived: boolean
  createdAt: string
  updatedAt: string
}

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

export interface BalanceItem {
  person: string
  netBalance: number
  youOwe: number
  theyOwe: number
}

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

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" })
  const data = await res.json()
  if (!data.success) throw new Error(data.message || "Request failed")
  return data
}

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

async function deleteJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { method: "DELETE", credentials: "include" })
  const data = await res.json()
  if (!data.success) throw new Error(data.message || "Request failed")
  return data
}

// ─── Hooks ──────────────────────────────────────────────────────────

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

export interface AutoSettleResult {
  settlementsCreated: number
  settlements: Array<{
    person: string
    amount: number
    txnDescription: string
    txnDate: string
  }>
}

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
