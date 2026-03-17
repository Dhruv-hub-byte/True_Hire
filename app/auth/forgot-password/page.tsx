"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Mail, Loader2, CheckCircle2, AlertCircle } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState("")
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) { setError("Email is required"); return }

    setError(null)
    setLoading(true)

    try {
      const res  = await fetch("/api/auth/forgot-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Something went wrong")
      setSent(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

      <Card className="relative w-full max-w-md bg-slate-900/80 border-slate-700/50 rounded-2xl shadow-2xl backdrop-blur-xl">
        <CardContent className="py-10 px-8 space-y-6">

          {/* Back to login */}
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to login
          </Link>

          {/* Icon + title */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Mail className="w-7 h-7 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Forgot password?</h1>
              <p className="text-slate-400 text-sm mt-1">
                Enter your email and we'll send you a reset link
              </p>
            </div>
          </div>

          {/* Success state */}
          {sent ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-green-400 font-medium text-sm">Check your inbox</p>
                  <p className="text-green-400/70 text-xs mt-0.5">
                    We sent a reset link to <strong>{email}</strong>. It expires in 1 hour.
                  </p>
                </div>
              </div>
              <p className="text-center text-xs text-slate-500">
                Didn't receive it? Check your spam folder or{" "}
                <button
                  onClick={() => { setSent(false); setError(null) }}
                  className="text-indigo-400 hover:text-indigo-300"
                >
                  try again
                </button>
              </p>
            </div>
          ) : (
            /* Form */
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-slate-300 text-sm">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null) }}
                  disabled={loading}
                  autoComplete="email"
                  autoFocus
                  className="h-11 rounded-xl bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-indigo-500/30"
                />
              </div>

              <Button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white gap-2 disabled:opacity-60"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Sending...</>
                  : <><Mail className="w-4 h-4" />Send reset link</>
                }
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}