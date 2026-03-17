"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import Loading from "@/components/common/loading"

import {
  ArrowLeft, Save, Loader2, Plus,
  X, AlertCircle, CheckCircle2,
} from "lucide-react"

/* =====================================================
   TYPES
===================================================== */

interface ReportForm {
  summary:         string
  strengths:       string[]
  weaknesses:      string[]
  recommendations: string[]
  overallScore:    number
}

/* =====================================================
   ARRAY FIELD — add/remove items
===================================================== */

function ArrayField({
  label,
  items,
  onChange,
  placeholder,
  color,
}: {
  label: string
  items: string[]
  onChange: (items: string[]) => void
  placeholder: string
  color: string
}) {
  function addItem() { onChange([...items, ""]) }
  function removeItem(i: number) { onChange(items.filter((_, idx) => idx !== i)) }
  function updateItem(i: number, val: string) {
    const copy = [...items]
    copy[i] = val
    onChange(copy)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className={`text-sm font-medium ${color}`}>{label}</Label>
        <button
          type="button"
          onClick={addItem}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
        >
          <Plus className="w-3 h-3" />
          Add
        </button>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={item}
              onChange={(e) => updateItem(i, e.target.value)}
              placeholder={placeholder}
              className="flex-1 h-9 rounded-xl bg-slate-800/60 border border-slate-700 text-white placeholder:text-slate-500 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
            />
            <button
              type="button"
              onClick={() => removeItem(i)}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors border border-slate-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-slate-600 text-xs italic">No items yet — click Add</p>
        )}
      </div>
    </div>
  )
}

/* =====================================================
   PAGE
===================================================== */

export default function WriteReportPage() {
  const { id: interviewId } = useParams() as { id: string }
  const router    = useRouter()
  const { accessToken, user } = useAuth()

  const [interview, setInterview] = useState<{ title: string; status: string } | null>(null)
  const [existing,  setExisting]  = useState(false)
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [success,   setSuccess]   = useState(false)

  const [form, setForm] = useState<ReportForm>({
    summary:         "",
    strengths:       [""],
    weaknesses:      [""],
    recommendations: [""],
    overallScore:    70,
  })

  /* -------------------------
     Fetch interview + existing report
  -------------------------- */

  const fetchData = useCallback(async () => {
    if (!accessToken) return
    try {
      setLoading(true)
      const res  = await fetch(`/api/interviews/${interviewId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Not found")

      const iv = json.data
      setInterview({ title: iv.title, status: iv.status })

      if (iv.report) {
        setExisting(true)
        setForm({
          summary:         iv.report.summary,
          strengths:       iv.report.strengths,
          weaknesses:      iv.report.weaknesses,
          recommendations: iv.report.recommendations,
          overallScore:    iv.report.overallScore,
        })
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [accessToken, interviewId])

  useEffect(() => { fetchData() }, [fetchData])

  /* -------------------------
     Redirect non-interviewers
  -------------------------- */

  useEffect(() => {
    if (user && user.role === "CANDIDATE") router.replace("/dashboard")
  }, [user, router])

  /* -------------------------
     Save report
  -------------------------- */

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.summary.trim()) { setError("Summary is required"); return }
    if (form.overallScore < 0 || form.overallScore > 100) { setError("Score must be 0-100"); return }

    const cleanedForm = {
      ...form,
      strengths:       form.strengths.filter((s) => s.trim()),
      weaknesses:      form.weaknesses.filter((s) => s.trim()),
      recommendations: form.recommendations.filter((s) => s.trim()),
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/interviews/${interviewId}/report`, {
        method:  existing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body:    JSON.stringify(cleanedForm),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to save report")

      setSuccess(true)
      setExisting(true)
      setTimeout(() => router.push(`/interview/${interviewId}/report`), 1500)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  /* =====================================================
     RENDER
  ===================================================== */

  if (user?.role === "CANDIDATE") return null
  if (loading) return <Loading text="Loading interview..." />

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6 px-4">

      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-300 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          {existing ? "Edit Report" : "Write Report"}
        </h1>
        {interview && (
          <p className="text-slate-400 text-sm mt-1">{interview.title}</p>
        )}
      </div>

      {success && (
        <div className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Report saved — redirecting to report view...
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">

        {/* Overall score */}
        <Card className="bg-slate-900/80 border-slate-700/50 rounded-2xl">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-white font-semibold">Overall Score</Label>
              <span className={`text-2xl font-bold ${
                form.overallScore >= 80 ? "text-green-400" :
                form.overallScore >= 60 ? "text-indigo-400" :
                form.overallScore >= 40 ? "text-yellow-400" : "text-red-400"
              }`}>
                {form.overallScore}/100
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={form.overallScore}
              onChange={(e) => setForm((f) => ({ ...f, overallScore: Number(e.target.value) }))}
              className="w-full accent-indigo-500"
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>Poor (0)</span>
              <span>Average (50)</span>
              <span>Excellent (100)</span>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="bg-slate-900/80 border-slate-700/50 rounded-2xl">
          <CardContent className="p-5 space-y-2">
            <Label className="text-white font-semibold">Summary</Label>
            <p className="text-slate-500 text-xs">2-3 sentences about the candidate overall</p>
            <textarea
              value={form.summary}
              onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
              placeholder="The candidate demonstrated strong fundamentals in..."
              rows={4}
              className="w-full rounded-xl bg-slate-800/60 border border-slate-700 text-white placeholder:text-slate-500 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors resize-none"
            />
          </CardContent>
        </Card>

        {/* Strengths / Weaknesses / Recommendations */}
        <Card className="bg-slate-900/80 border-slate-700/50 rounded-2xl">
          <CardContent className="p-5 space-y-5">
            <ArrayField
              label="Strengths"
              items={form.strengths}
              onChange={(v) => setForm((f) => ({ ...f, strengths: v }))}
              placeholder="e.g. Strong problem-solving skills"
              color="text-green-400"
            />
            <div className="border-t border-slate-800" />
            <ArrayField
              label="Weaknesses"
              items={form.weaknesses}
              onChange={(v) => setForm((f) => ({ ...f, weaknesses: v }))}
              placeholder="e.g. Needs improvement in system design"
              color="text-red-400"
            />
            <div className="border-t border-slate-800" />
            <ArrayField
              label="Recommendations"
              items={form.recommendations}
              onChange={(v) => setForm((f) => ({ ...f, recommendations: v }))}
              placeholder="e.g. Practice more data structure problems"
              color="text-indigo-400"
            />
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Submit */}
        <Button
          type="submit"
          disabled={saving || success}
          className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white gap-2 disabled:opacity-60"
        >
          {saving
            ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</>
            : <><Save className="w-4 h-4" />{existing ? "Update Report" : "Save Report"}</>
          }
        </Button>
      </form>
    </div>
  )
}