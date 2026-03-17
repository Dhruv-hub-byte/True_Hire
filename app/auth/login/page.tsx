'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react'

/* =====================================================
   TYPES
===================================================== */

interface FormErrors {
  email?: string
  password?: string
}

/* =====================================================
   HELPERS
===================================================== */

function validateEmail(email: string): string | undefined {
  if (!email) return "Email is required"
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address"
}

function validatePassword(password: string): string | undefined {
  if (!password) return "Password is required"
  if (password.length < 1) return "Password is required"
}

/* =====================================================
   PAGE
===================================================== */

export default function LoginPage() {
  const router = useRouter()
  const { login, isLoading, error: authError } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  /* -------------------------
     Clear submit error when user starts editing
  -------------------------- */

  useEffect(() => {
    if (submitError) setSubmitError(null)
  }, [email, password])

  /* -------------------------
     Inline validation on blur
  -------------------------- */

  function handleBlur(field: "email" | "password") {
    setTouched((prev) => ({ ...prev, [field]: true }))

    setFieldErrors((prev) => ({
      ...prev,
      email: field === "email" ? validateEmail(email) : prev.email,
      password: field === "password" ? validatePassword(password) : prev.password,
    }))
  }

  /* -------------------------
     Submit
  -------------------------- */

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)

    // Mark all fields as touched to show any errors
    setTouched({ email: true, password: true })

    const errors: FormErrors = {
      email: validateEmail(email),
      password: validatePassword(password),
    }

    setFieldErrors(errors)

    if (errors.email || errors.password) return

    try {
      await login(email, password)
      router.push('/dashboard')
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Login failed. Please try again.")
    }
  }

  const displayError = submitError || authError

  return (
    <div className="relative flex items-center justify-center min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-6">

      {/* Background glow shapes */}
      <div className="absolute w-[600px] h-[600px] bg-indigo-600 rounded-full blur-[120px] opacity-10 -top-32 -left-32 pointer-events-none" />
      <div className="absolute w-[500px] h-[500px] bg-blue-600 rounded-full blur-[120px] opacity-10 bottom-0 right-0 pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

      {/* Card */}
      <Card className="relative w-full max-w-md bg-slate-900/80 backdrop-blur-2xl border border-slate-700/50 shadow-2xl rounded-2xl">

        <CardHeader className="text-center space-y-2 pb-2 pt-8">
          {/* Logo */}
          <div className="flex justify-center mb-1">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <span className="text-white font-black text-lg tracking-tight">T</span>
            </div>
          </div>

          <CardTitle className="text-2xl font-bold text-white tracking-tight">
            Welcome back
          </CardTitle>

          <CardDescription className="text-slate-400 text-sm">
            Sign in to your TrueHire account
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4 pb-8 px-8">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>

            {/* Submit / auth error */}
            {displayError && (
              <div className="flex items-start gap-2.5 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{displayError}</span>
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-300 text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => handleBlur("email")}
                disabled={isLoading}
                autoComplete="email"
                className={`h-11 rounded-xl bg-slate-800/60 border text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors ${
                  touched.email && fieldErrors.email
                    ? "border-red-500/60 focus:border-red-500 focus:ring-red-500/30"
                    : "border-slate-700"
                }`}
              />
              {touched.email && fieldErrors.email && (
                <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-slate-300 text-sm font-medium">
                  Password
                </Label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  tabIndex={-1}
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => handleBlur("password")}
                  disabled={isLoading}
                  autoComplete="current-password"
                  className={`h-11 rounded-xl bg-slate-800/60 border text-white placeholder:text-slate-500 pr-11 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors ${
                    touched.password && fieldErrors.password
                      ? "border-red-500/60 focus:border-red-500 focus:ring-red-500/30"
                      : "border-slate-700"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {touched.password && fieldErrors.password && (
                <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-11 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:scale-[1.01] active:scale-[0.99] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-slate-500">
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/register"
              className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}