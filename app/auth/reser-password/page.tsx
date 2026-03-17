"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Lock, Loader2, CheckCircle2,
  AlertCircle, Eye, EyeOff, XCircle,
} from "lucide-react"

/* =====================================================
   PASSWORD REQUIREMENTS
===================================================== */

const REQUIREMENTS = [
  { label: "At least 8 characters",     test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter",       test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter",       test: (p: string) => /[a-z]/.test(p) },
  { label: "One number",                 test: (p: string) => /[0-9]/.test(p) },
]

/* =====================================================
   PAGE
===================================================== */

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const router       = useRouter()

  const token = searchParams.get("token") ?? ""
  const email = searchParams.get("email") ?? ""

  const [password,  setPassword]  = useState("")
  const [confirm,   setConfirm]   = useState("")
  const [showPass,  setShowPass]  = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [success,   setSuccess]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  // Redirect to login after success
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => router.push("/auth/login"), 3000)
      return () => clearTimeout(t)
    }
  }, [success, router])

  // Redirect if no token
  useEffect(() => {
    if (!token || !email) {
      router.replace("/auth/forgot-password")
    }
  }, [token, email, router])

  const checks   = REQUIREMENTS.map((r) => ({ ...r, passed: r.test(password) }))
  const allPassed = checks.every((c) => c.passed)
  const matches   = password === confirm && confirm.length > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!allPassed) { setError("Password does not meet all requirements"); return }
    if (!matches)   { setError("Passwords do not match"); return }

    setLoading(true)
    try {
      const res  = await fetch("/api/auth/reset-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token, email, password }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to reset password")
      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to reset password")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

      <Card className="relative w-full max-w-md bg-slate-900/80 border-slate-700/50 rounded-2xl shadow-2xl backdrop-blur-xl">
        <CardContent className="py-10 px-8 space-y-6">

          {/* Icon + title */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Lock className="w-7 h-7 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Set new password</h1>
              <p className="text-slate-400 text-sm mt-1">
                Choose a strong password for your account
              </p>
            </div>
          </div>

          {/* Success */}
          {success ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-green-400 font-medium text-sm">Password reset successfully</p>
                  <p className="text-green-400/70 text-xs mt-0.5">
                    Redirecting you to login...
                  </p>
                </div>
              </div>
              <Link href="/auth/login">
                <Button className="w-full h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm">
                  Go to login
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* New password */}
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">New password</Label>
                <div className="relative">
                  <Input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(null) }}
                    disabled={loading}
                    autoComplete="new-password"
                    autoFocus
                    className="h-11 rounded-xl bg-slate-800/60 border-slate-700 text-white pr-10 focus:border-indigo-500 focus:ring-indigo-500/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Requirements */}
                {password.length > 0 && (
                  <div className="grid grid-cols-2 gap-1 pt-1">
                    {checks.map((c) => (
                      <div key={c.label} className={`flex items-center gap-1.5 text-xs ${
                        c.passed ? "text-green-400" : "text-slate-500"
                      }`}>
                        {c.passed
                          ? <CheckCircle2 className="w-3 h-3 shrink-0" />
                          : <XCircle className="w-3 h-3 shrink-0" />
                        }
                        {c.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Confirm password</Label>
                <Input
                  type="password"
                  value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); setError(null) }}
                  disabled={loading}
                  autoComplete="new-password"
                  className={`h-11 rounded-xl bg-slate-800/60 text-white transition-colors ${
                    confirm && !matches
                      ? "border-red-500/50 focus:border-red-500"
                      : confirm && matches
                      ? "border-green-500/30 focus:border-green-500"
                      : "border-slate-700 focus:border-indigo-500"
                  }`}
                />
                {confirm && !matches && (
                  <p className="text-red-400 text-xs flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    Passwords do not match
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading || !allPassed || !matches}
                className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white gap-2 disabled:opacity-60"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Resetting...</>
                  : <><Lock className="w-4 h-4" />Reset password</>
                }
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}