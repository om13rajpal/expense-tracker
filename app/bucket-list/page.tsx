"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * Redirect page — Bucket List now lives inside the Goals page as a tab.
 * This redirect ensures old bookmarks and links still work.
 */
export default function BucketListRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/goals?tab=bucket-list")
  }, [router])

  return null
}
