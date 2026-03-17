'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AlertCircle, Loader2, Eye, EyeOff, Check, X } from 'lucide-react'

/* =====================================================
   TYPES
===================================================== */

interface FormData {
  name: string
  email: string
  password: string
  confirmPassword: string
  role: string
}

interface FormErrors {
  name?: string
  email?: string
  password?: string
  confirmPassword?: string
  submit?: string
}

interface PasswordStrength {
  score: number
  checks: { label: string; passed: boolean }[]
}

/* =====================================================
   HELPERS
===================================================== */

const PASSWORD_REQUIREMENTS = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter",  test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter",  test: (p: string) => /[a-z]/.test(p) },
  { label: "One number",            test: (p: string) => /[0-9]/.test(p) },
  { label: "One special character", test: (p: string) => /[!@#$%^&*]/.test(p) },
]

function getPasswordStrength(password: string): PasswordStrength {
  const checks = PASSWORD_REQUIREMENTS.map((r) => ({
    label: r.label,
    passed: r.test(password),
  }))
  return { score: checks.filter((c) => c.passed).length, checks }
}

function getStrengthLabel(score: number): { label: string; color: string } {
  if (score <= 1) return { label: "Very weak",  color: "bg-red-500" }
  if (score === 2) return { label: "Weak",       color: "bg-orange-500" }
  if (score === 3) return { label: "Fair",       color: "bg-yellow-500" }
  if (score === 4) return { label: "Good",       color: "bg-blue-500" }
  return               { label: "Strong",      color: "bg-green-500" }
}

function validateField(field: keyof FormData, value: string, formData: FormData): string | undefined {
  switch (field) {
    case "name":
      if (!value.trim()) return "Name is required"
      if (value.trim().length < 2) return "Name must be at least 2 characters"
      break
    case "email":
      if (!value) return "Email is required"
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Enter a valid email address"
      break
    case "password":
      if (!value) return "Password is required"
      if (getPasswordStrength(value).score < 5) return "Password does not meet all requirements"
      break
    case "confirmPassword":
      if (!value) return "Please confirm your password"
      if (value !== formData.password) return "Passwords do not match"
      break
  }
}

/* =====================================================
   PAGE
===================================================== */

export default function RegisterPage() {
  const router = useRouter()
  const { register, isLoading, error: authError } = useAuth()

  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'CANDIDATE',
  })

  const [fieldErrors, setFieldErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const passwordStrength = getPasswordStrength(formData.password)
  const strengthMeta = getStrengthLabel(passwordStrength.score)

  /* -------------------------
     Clear submit error when user edits
  -------------------------- */

  useEffect(() => {
    if (submitError) setSubmitError(null)
  }, [formData.email, formData.password])

  /* -------------------------
     Update field + re-validate if already touched
  -------------------------- */

  function handleChange(field: keyof FormData, value: string) {
    const updated = { ...formData, [field]: value }
    setFormData(updated)

    if (touched[field]) {
      setFieldErrors((prev) => ({
        ...prev,
        [field]: validateField(field, value, updated),
      }))
    }

    // Re-validate confirmPassword live when password changes
    if (field === "password" && touched.confirmPassword) {
      setFieldErrors((prev) => ({
        ...prev,
        confirmPassword: validateField("confirmPassword", updated.confirmPassword, updated),
      }))
    }
  }

  /* -------------------------
     Blur validation
  -------------------------- */

  function handleBlur(field: keyof FormData) {
    setTouched((prev) => ({ ...prev, [field]: true }))
    setFieldErrors((prev) => ({
      ...prev,
      [field]: validateField(field, formData[field], formData),
    }))
  }

  /* -------------------------
     Submit
  -------------------------- */

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)

    // Mark all fields touched
    const allTouched = Object.keys(formData).reduce(
      (acc, k) => ({ ...acc, [k]: true }),
      {} as Record<string, boolean>
    )
    setTouched(allTouched)

    const errors: FormErrors = {}
    ;(["name", "email", "password", "confirmPassword"] as (keyof FormData)[]).forEach(
      (field) => {
        const err = validateField(field, formData[field], formData)
        if (err) errors[field] = err
      }
    )

    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    try {
      await register(formData.email, formData.password, formData.name, formData.role)
      router.push('/dashboard')
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Registration failed. Please try again.")
    }
  }

  const displayError = submitError || authError

  return (
    <div className="relative flex items-center justify-center min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-6 py-12">

      {/* Background glow */}
      <div className="absolute w-[600px] h-[600px] bg-indigo-600 rounded-full blur-[120px] opacity-10 -top-32 -left-32 pointer-events-none" />
      <div className="absolute w-[500px] h-[500px] bg-blue-600 rounded-full blur-[120px] opacity-10 bottom-0 right-0 pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

      {/* Card */}
      <Card className="relative w-full max-w-lg bg-slate-900/80 backdrop-blur-2xl border border-slate-700/50 shadow-2xl rounded-2xl">

        <CardHeader className="text-center space-y-2 pb-2 pt-8">
          <div className="flex justify-center mb-1">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <span className="text-white font-black text-lg tracking-tight">T</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-white tracking-tight">
            Create your account
          </CardTitle>
          <CardDescription className="text-slate-400 text-sm">
            Join TrueHire today
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

            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-slate-300 text-sm font-medium">
                Full Name
              </Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                onBlur={() => handleBlur("name")}
                disabled={isLoading}
                autoComplete="name"
                className={`h-11 rounded-xl bg-slate-800/60 border text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors ${
                  touched.name && fieldErrors.name
                    ? "border-red-500/60 focus:border-red-500 focus:ring-red-500/30"
                    : "border-slate-700"
                }`}
              />
              {touched.name && fieldErrors.name && (
                <p className="text-red-400 text-xs flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />{fieldErrors.name}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-300 text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
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
                <p className="text-red-400 text-xs flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />{fieldErrors.email}
                </p>
              )}
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <Label htmlFor="role" className="text-slate-300 text-sm font-medium">
                I am a
              </Label>
              <Select
                value={formData.role}
                onValueChange={(role) => handleChange("role", role)}
                disabled={isLoading}
              >
                <SelectTrigger className="h-11 rounded-xl bg-slate-800/60 border border-slate-700 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent className="rounded-xl bg-slate-800 border border-slate-700 shadow-xl">
                  <SelectItem value="CANDIDATE" className="text-slate-200 focus:bg-slate-700 focus:text-white rounded-lg cursor-pointer py-2.5">
                    👤 Candidate
                  </SelectItem>
                  <SelectItem value="INTERVIEWER" className="text-slate-200 focus:bg-slate-700 focus:text-white rounded-lg cursor-pointer py-2.5">
                    🎤 Interviewer
                  </SelectItem>
                  <SelectItem value="ADMIN" className="text-slate-200 focus:bg-slate-700 focus:text-white rounded-lg cursor-pointer py-2.5">
                    🛠 Admin
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-slate-300 text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  onBlur={() => handleBlur("password")}
                  disabled={isLoading}
                  autoComplete="new-password"
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

              {/* Strength meter — shown once user starts typing */}
              {formData.password && (
                <div className="space-y-2 pt-1">
                  {/* Bar */}
                  <div className="flex gap-1 items-center">
                    <div className="flex gap-1 flex-1">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                            i < passwordStrength.score
                              ? strengthMeta.color
                              : "bg-slate-700"
                          }`}
                        />
                      ))}
                    </div>
                    <span className={`text-xs font-medium ml-2 ${
                      passwordStrength.score === 5 ? "text-green-400" :
                      passwordStrength.score >= 3 ? "text-yellow-400" : "text-red-400"
                    }`}>
                      {strengthMeta.label}
                    </span>
                  </div>

                  {/* Checklist */}
                  <ul className="space-y-1">
                    {passwordStrength.checks.map((check) => (
                      <li key={check.label} className="flex items-center gap-2 text-xs">
                        {check.passed
                          ? <Check className="w-3 h-3 text-green-400 shrink-0" />
                          : <X className="w-3 h-3 text-slate-500 shrink-0" />
                        }
                        <span className={check.passed ? "text-slate-400" : "text-slate-500"}>
                          {check.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {touched.password && fieldErrors.password && !formData.password && (
                <p className="text-red-400 text-xs flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />{fieldErrors.password}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-slate-300 text-sm font-medium">
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange("confirmPassword", e.target.value)}
                  onBlur={() => handleBlur("confirmPassword")}
                  disabled={isLoading}
                  autoComplete="new-password"
                  className={`h-11 rounded-xl bg-slate-800/60 border text-white placeholder:text-slate-500 pr-11 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors ${
                    touched.confirmPassword && fieldErrors.confirmPassword
                      ? "border-red-500/60 focus:border-red-500 focus:ring-red-500/30"
                      : formData.confirmPassword && !fieldErrors.confirmPassword && touched.confirmPassword
                      ? "border-green-500/50"
                      : "border-slate-700"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {touched.confirmPassword && fieldErrors.confirmPassword && (
                <p className="text-red-400 text-xs flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />{fieldErrors.confirmPassword}
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
                  Creating account...
                </>
              ) : (
                "Create account"
              )}
            </Button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}