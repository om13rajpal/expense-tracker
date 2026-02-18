/**
 * Hooks for reading and updating the Needs/Wants/Investments (NWI) budget allocation config.
 * @module hooks/use-nwi-config
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

interface NWIBucket {
  percentage: number
  categories: string[]
}

interface NWIConfig {
  needs: NWIBucket
  wants: NWIBucket
  investments: NWIBucket
  savings: NWIBucket
}

interface NWIConfigResponse {
  success: boolean
  config?: NWIConfig
  error?: string
}

/** Fetches the current NWI bucket percentages and category mappings. */
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

/** Updates NWI config and invalidates both `nwi-config` and `financial-health` caches. */
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
