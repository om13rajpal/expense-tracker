/**
 * Login form card with username/password fields.
 * Submits credentials to `POST /api/auth/login` and redirects to dashboard on success.
 * @module components/login-form
 */
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Mail, Lock } from "lucide-react"
import { IconBrandOpenai } from "@tabler/icons-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

/** Renders the login card with username and password inputs. */
export function LoginForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast.success("Login successful! Redirecting...")
        router.push("/dashboard")
      } else {
        toast.error(data.message || "Invalid credentials")
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Title removed, rendered in page.tsx */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
                className="pl-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl transition-all hover:bg-white/10 focus-visible:ring-1 focus-visible:ring-lime-400/50 focus-visible:border-lime-400/50 focus-visible:bg-white/10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="pl-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl transition-all hover:bg-white/10 focus-visible:ring-1 focus-visible:ring-lime-400/50 focus-visible:border-lime-400/50 focus-visible:bg-white/10"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 rounded-xl bg-lime-400 text-black hover:bg-lime-300 font-bold tracking-wide transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(163,230,53,0.2)] mt-6"
          >
            {isLoading ? "Authenticating..." : "Sign In"}
          </Button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-black px-3 text-white/30 uppercase tracking-widest font-semibold">or</span>
            </div>
          </div>

          {/* ChatGPT Connect — directs to Settings after login */}
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              toast.info("Log in first, then connect ChatGPT from Settings", {
                description: "Your ChatGPT Plus/Pro subscription can power all AI features.",
              })
            }}
            className="w-full h-12 rounded-xl border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white font-medium tracking-wide transition-all"
          >
            <IconBrandOpenai className="h-5 w-5 mr-2 text-emerald-400" />
            Sign in with ChatGPT
          </Button>

          <p className="text-xs text-white/30 text-center mt-6 uppercase tracking-widest font-semibold">
            Protected Workspace
          </p>
        </form>
    </div>
  )
}
