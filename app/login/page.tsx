import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-64 w-[40rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />
      </div>
      <div className="relative z-10 w-full max-w-lg">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Finova</p>
          <h1 className="mt-3 text-3xl font-semibold">Secure access to your dashboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to view balance snapshots, trends, and budget controls.
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
