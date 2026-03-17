"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  CheckCircle2, XCircle, Loader2,
  Mail, AlertCircle, ArrowRight,
} from "lucide-react"

/* =====================================================
   PAGE
   Handles three states from URL params:
   ?success=true     → verified successfully
   ?error=invalid    → bad/expired token
   ?error=missing    → token missing from URL
   (no params)       → show resend form
===================================================== */

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const router       = useRouter()

  const success = searchParams.get("success")
  const error   = searchParams.get("error")

  const [email,     setEmail]     = useState("")
  const [sending,   setSending]   = useState(false)
  const [sent,      setSent]      = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  // Auto-redirect to dashboard after success
  useEffect(() => {
    if (success === "true") {
      const timer = setTimeout(() => router.push("/auth/login"), 4000)
      return () => clearTimeout(timer)
    }
  }, [success, router])

  async function handleResend(e: React.FormEvent) {
    e.preventDefault()
    setSendError(null)
    setSending(true)

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email }),
      })

      const json = await res.json()

      if (!res.ok) throw new Error(json.error || "Failed to send email")

      setSent(true)
    } catch (err: unknown) {
      setSendError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSending(false)
    }
  }

  /* =====================================================
     SUCCESS STATE
  ===================================================== */

  if (success === "true") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <Card className="w-full max-w-md bg-slate-900/80 border-slate-700/50 rounded-2xl">
          <CardContent className="py-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <h1 className="text-xl font-bold text-white">Email verified!</h1>
            <p className="text-slate-400 text-sm">
              Your account is now active. Redirecting to login in a moment...
            </p>
            <Link href="/auth/login">
              <Button className="h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white gap-2 mt-2">
                Go to login
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  /* =====================================================
     ERROR STATE (invalid or expired token)
  ===================================================== */

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <Card className="w-full max-w-md bg-slate-900/80 border-slate-700/50 rounded-2xl">
          <CardContent className="py-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-xl font-bold text-white">Link expired</h1>
            <p className="text-slate-400 text-sm">
              This verification link is invalid or has expired. Request a new one below.
            </p>

            {/* Resend form */}
            {!sent ? (
              <form onSubmit={handleResend} className="space-y-3 text-left mt-4" noValidate>
                {sendError && (
                  <p className="text-red-400 text-xs flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />{sendError}
                  </p>
                )}
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-sm">Your email</Label>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={sending}
                    className="h-11 rounded-xl bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={sending || !email}
                  className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
                >
                  {sending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Sending...</>
                  ) : (
                    <><Mail className="w-4 h-4" />Resend verification email</>
                  )}
                </Button>
              </form>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm mt-4">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Email sent — check your inbox
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  /* =====================================================
     DEFAULT STATE — resend form
  ===================================================== */

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">

      {/* Background glow */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

      <Card className="relative w-full max-w-md bg-slate-900/80 border-slate-700/50 rounded-2xl shadow-2xl backdrop-blur-xl">
        <CardContent className="py-10 px-8 space-y-6">

          {/* Icon */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Mail className="w-7 h-7 text-indigo-400" />
            </div>
            <h1 className="text-xl font-bold text-white">Check your email</h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              We sent a verification link to your email when you registered.
              Click the link to activate your account.
            </p>
          </div>

          {/* Resend section */}
          {!sent ? (
            <form onSubmit={handleResend} className="space-y-4" noValidate>
              <p className="text-xs text-slate-500 text-center">
                Didn't receive it? Enter your email to resend.
              </p>

              {sendError && (
                <p className="text-red-400 text-xs flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />{sendError}
                </p>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-slate-300 text-sm">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={sending}
                  autoComplete="email"
                  className="h-11 rounded-xl bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-indigo-500/30"
                />
              </div>

              <Button
                type="submit"
                disabled={sending || !email}
                className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white gap-2 disabled:opacity-60"
              >
                {sending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Sending...</>
                ) : (
                  <><Mail className="w-4 h-4" />Resend verification email</>
                )}
              </Button>
            </form>
          ) : (
            <div className="flex items-center gap-2.5 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Sent! Check your inbox and spam folder.</span>
            </div>
          )}

          <p className="text-center text-xs text-slate-600">
            Already verified?{" "}
            <Link href="/auth/login" className="text-indigo-400 hover:text-indigo-300">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}