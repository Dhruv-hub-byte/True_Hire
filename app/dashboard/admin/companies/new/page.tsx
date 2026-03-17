"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, Loader2, Building2, ArrowLeft } from "lucide-react"
import Link from "next/link"

/* =====================================================
   TYPES
===================================================== */

interface FormData {
  name: string
  description: string
  website: string
  logo: string
}

interface FormErrors {
  name?: string
  website?: string
  logo?: string
  submit?: string
}

/* =====================================================
   HELPERS
===================================================== */

function validateField(field: keyof FormData, value: string): string | undefined {
  switch (field) {
    case "name":
      if (!value.trim()) return "Company name is required"
      if (value.trim().length < 2) return "Name must be at least 2 characters"
      if (value.trim().length > 100) return "Name must be under 100 characters"
      break
    case "website":
      if (value && !/^https?:\/\/.+\..+/.test(value))
        return "Enter a valid URL (e.g. https://example.com)"
      break
    case "logo":
      if (value && !/^https?:\/\/.+\..+/.test(value))
        return "Enter a valid URL (e.g. https://example.com/logo.png)"
      break
  }
}

/* =====================================================
   PAGE
===================================================== */

export default function NewCompanyPage() {
  const router = useRouter()
  const { accessToken, user } = useAuth()

  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    website: "",
    logo: "",
  })

  const [fieldErrors, setFieldErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  /* -------------------------
     Redirect non-admins
  -------------------------- */

  useEffect(() => {
    if (user && user.role !== "ADMIN") {
      router.replace("/dashboard")
    }
  }, [user, router])

  /* -------------------------
     Clear submit error on edit
  -------------------------- */

  useEffect(() => {
    if (submitError) setSubmitError(null)
  }, [formData.name, formData.website])

  /* -------------------------
     Field change + re-validate if touched
  -------------------------- */

  function handleChange(field: keyof FormData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }))

    if (touched[field]) {
      setFieldErrors((prev) => ({
        ...prev,
        [field]: validateField(field, value),
      }))
    }
  }

  function handleBlur(field: keyof FormData) {
    setTouched((prev) => ({ ...prev, [field]: true }))
    setFieldErrors((prev) => ({
      ...prev,
      [field]: validateField(field, formData[field]),
    }))
  }

  /* -------------------------
     Submit
  -------------------------- */

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)

    // Mark all fields touched
    setTouched({ name: true, website: true, logo: true })

    const errors: FormErrors = {
      name: validateField("name", formData.name),
      website: validateField("website", formData.website),
      logo: validateField("logo", formData.logo),
    }

    setFieldErrors(errors)
    if (Object.values(errors).some(Boolean)) return

    try {
      setLoading(true)

      const res = await fetch("/api/companies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          website: formData.website.trim() || undefined,
          logo: formData.logo.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || `Request failed (${res.status})`)
      }

      router.push("/dashboard/admin")
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to create company"
      )
    } finally {
      setLoading(false)
    }
  }

  if (user && user.role !== "ADMIN") return null

  return (
    <div className="max-w-lg mx-auto py-10 px-4">

      {/* Back link */}
      <Link
        href="/dashboard/admin"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-300 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to dashboard
      </Link>

      <Card className="bg-slate-900/80 border-slate-700/50 shadow-2xl rounded-2xl backdrop-blur-xl">

        <CardHeader className="pb-2 pt-7 px-7">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-white tracking-tight">
                Create Company
              </CardTitle>
              <CardDescription className="text-slate-400 text-sm">
                Add a new company to TrueHire
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-7 pb-7">
          <form onSubmit={handleSubmit} className="space-y-5 mt-4" noValidate>

            {/* Submit error */}
            {submitError && (
              <div className="flex items-start gap-2.5 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Company Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-slate-300 text-sm font-medium">
                Company Name <span className="text-red-400">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Acme Corporation"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                onBlur={() => handleBlur("name")}
                disabled={loading}
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

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-slate-300 text-sm font-medium">
                Description
                <span className="text-slate-500 font-normal ml-1">(optional)</span>
              </Label>
              <textarea
                id="description"
                placeholder="Brief description of the company..."
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                disabled={loading}
                rows={3}
                maxLength={1000}
                className="w-full rounded-xl bg-slate-800/60 border border-slate-700 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors px-3 py-2.5 text-sm resize-none disabled:opacity-50 outline-none"
              />
              <p className="text-xs text-slate-600 text-right">
                {formData.description.length}/1000
              </p>
            </div>

            {/* Website */}
            <div className="space-y-1.5">
              <Label htmlFor="website" className="text-slate-300 text-sm font-medium">
                Website
                <span className="text-slate-500 font-normal ml-1">(optional)</span>
              </Label>
              <Input
                id="website"
                type="url"
                placeholder="https://example.com"
                value={formData.website}
                onChange={(e) => handleChange("website", e.target.value)}
                onBlur={() => handleBlur("website")}
                disabled={loading}
                className={`h-11 rounded-xl bg-slate-800/60 border text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors ${
                  touched.website && fieldErrors.website
                    ? "border-red-500/60 focus:border-red-500 focus:ring-red-500/30"
                    : "border-slate-700"
                }`}
              />
              {touched.website && fieldErrors.website && (
                <p className="text-red-400 text-xs flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />{fieldErrors.website}
                </p>
              )}
            </div>

            {/* Logo URL */}
            <div className="space-y-1.5">
              <Label htmlFor="logo" className="text-slate-300 text-sm font-medium">
                Logo URL
                <span className="text-slate-500 font-normal ml-1">(optional)</span>
              </Label>
              <Input
                id="logo"
                type="url"
                placeholder="https://example.com/logo.png"
                value={formData.logo}
                onChange={(e) => handleChange("logo", e.target.value)}
                onBlur={() => handleBlur("logo")}
                disabled={loading}
                className={`h-11 rounded-xl bg-slate-800/60 border text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors ${
                  touched.logo && fieldErrors.logo
                    ? "border-red-500/60 focus:border-red-500 focus:ring-red-500/30"
                    : "border-slate-700"
                }`}
              />
              {touched.logo && fieldErrors.logo && (
                <p className="text-red-400 text-xs flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />{fieldErrors.logo}
                </p>
              )}
              {/* Logo preview */}
              {formData.logo && !fieldErrors.logo && (
                <div className="flex items-center gap-2 mt-1">
                  <img
                    src={formData.logo}
                    alt="Logo preview"
                    className="w-8 h-8 rounded-lg object-contain bg-slate-800 border border-slate-700 p-0.5"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none"
                    }}
                  />
                  <span className="text-xs text-slate-500">Preview</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 h-11 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:scale-[1.01] active:scale-[0.99] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Company"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => router.back()}
                className="h-11 px-5 rounded-xl border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}