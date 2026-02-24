/**
 * @module app/page
 * @description Root landing page for the Finova application.
 * Immediately redirects authenticated and unauthenticated visitors alike
 * to the `/dashboard` route using a server-side Next.js redirect.
 */
import { redirect } from "next/navigation"

/**
 * Root page component that performs an instant server-side redirect
 * to the dashboard. No UI is rendered at this route.
 * @returns Never renders -- always redirects to `/dashboard`.
 */
export default function Home() {
  redirect("/dashboard")
}
