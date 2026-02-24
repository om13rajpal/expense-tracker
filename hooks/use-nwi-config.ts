/**
 * Hooks for reading and updating the Needs/Wants/Investments (NWI) budget allocation config.
 * The NWI framework divides spending into four buckets (needs, wants, investments, savings),
 * each with a target percentage and a list of transaction categories that map to it.
 * @module hooks/use-nwi-config
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

/**
 * A single NWI budget bucket with its target allocation and mapped categories.
 * @property percentage - Target percentage of total income allocated to this bucket (0-100)
 * @property categories - Transaction category names that fall under this bucket
 */
interface NWIBucket {
  percentage: number
  categories: string[]
}

/**
 * Full NWI budget configuration containing all four allocation buckets.
 * The percentages across all buckets should sum to 100.
 * @property needs - Essential expenses bucket (rent, groceries, utilities, etc.)
 * @property wants - Discretionary spending bucket (dining out, entertainment, etc.)
 * @property investments - Investment contributions bucket (stocks, mutual funds, etc.)
 * @property savings - Savings contributions bucket (emergency fund, fixed deposits, etc.)
 */
interface NWIConfig {
  needs: NWIBucket
  wants: NWIBucket
  investments: NWIBucket
  savings: NWIBucket
}

/**
 * API response shape when fetching the NWI configuration.
 * @property success - Whether the API call succeeded
 * @property config - The full NWI bucket configuration, if available
 * @property error - Optional error message from the server
 */
interface NWIConfigResponse {
  success: boolean
  config?: NWIConfig
  error?: string
}

/**
 * Fetches the current NWI bucket percentages and category mappings from `GET /api/nwi-config`.
 * Uses React Query with default stale time for automatic background refetching.
 * @returns A React Query result containing the NWI configuration response
 */
export function useNWIConfig() {
  return useQuery<NWIConfigResponse>({
    queryKey: ["nwi-config"],
    queryFn: async () => {
      const res = await fetch("/api/nwi-config")
      if (!res.ok) throw new Error("Failed to fetch NWI config")
      return res.json()
    },
  })
}

/**
 * Updates the NWI budget allocation config via `PUT /api/nwi-config`.
 * Accepts a partial config so individual buckets can be updated independently.
 * On success, invalidates both the `nwi-config` and `financial-health` query caches,
 * since changes to NWI allocations affect the financial health score calculation.
 * @returns A React Query mutation object with `mutate` and `mutateAsync` for submitting config updates
 */
export function useUpdateNWIConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (config: Partial<NWIConfig>) => {
      const res = await fetch("/api/nwi-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })
      if (!res.ok) throw new Error("Failed to update NWI config")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nwi-config"] })
      queryClient.invalidateQueries({ queryKey: ["financial-health"] })
    },
  })
}
