"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import Loading from "@/components/common/loading"
import ErrorComponent from "@/components/common/error"

import {
  ArrowLeft, Plus, Trash2, Pencil, Code,
  FileText, Building2, Globe, AlertCircle,
  CheckCircle2, Loader2, X, Save,
} from "lucide-react"

/* =====================================================
   TYPES
===================================================== */

interface Company {
  id: string
  name: string
  description: string | null
  website: string | null
  logo: string | null
  createdAt: string
}

interface Question {
  id: string
  text: string
  type: "GENERAL" | "CODE"
  codeTemplate: string | null
  createdAt: string
  usedInInterviews: number
}

/* =====================================================
   QUESTION FORM (inline)
===================================================== */

function QuestionForm({
  onSave,
  onCancel,
  initial,
  saving,
}: {
  onSave: (data: { text: string; type: string; codeTemplate?: string }) => void
  onCancel: () => void
  initial?: Question
  saving: boolean
}) {
  const [text, setText]               = useState(initial?.text ?? "")
  const [type, setType]               = useState<"GENERAL" | "CODE">(initial?.type ?? "GENERAL")
  const [codeTemplate, setCodeTemplate] = useState(initial?.codeTemplate ?? "")
  const [error, setError]             = useState<string | null>(null)

  function handleSave() {
    if (!text.trim()) { setError("Question text is required"); return }
    setError(null)
    onSave({ text: text.trim(), type, codeTemplate: type === "CODE" ? codeTemplate : undefined })
  }

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-3">
      {error && (
        <p className="text-red-400 text-xs flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />{error}
        </p>
      )}

      {/* Question text */}
      <div className="space-y-1.5">
        <Label className="text-slate-300 text-xs">Question</Label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your question here..."
          rows={3}
          disabled={saving}
          className="w-full rounded-xl bg-slate-900/60 border border-slate-700 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors px-3 py-2.5 text-sm resize-none outline-none disabled:opacity-50"
        />
      </div>

      {/* Type */}
      <div className="space-y-1.5">
        <Label className="text-slate-300 text-xs">Type</Label>
        <Select value={type} onValueChange={(v) => setType(v as "GENERAL" | "CODE")} disabled={saving}>
          <SelectTrigger className="h-9 rounded-xl bg-slate-900/60 border-slate-700 text-white text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700 rounded-xl">
            <SelectItem value="GENERAL" className="text-slate-200 focus:bg-slate-700 focus:text-white">
              General — text answer
            </SelectItem>
            <SelectItem value="CODE" className="text-slate-200 focus:bg-slate-700 focus:text-white">
              Code — coding question
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Code template — shown only for CODE type */}
      {type === "CODE" && (
        <div className="space-y-1.5">
          <Label className="text-slate-300 text-xs">Starter template (optional)</Label>
          <textarea
            value={codeTemplate}
            onChange={(e) => setCodeTemplate(e.target.value)}
            placeholder="// Write your starter code here..."
            rows={4}
            disabled={saving}
            className="w-full rounded-xl bg-slate-900/60 border border-slate-700 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors px-3 py-2.5 text-xs font-mono resize-none outline-none disabled:opacity-50"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving}
          className="h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs gap-1.5"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {initial ? "Save changes" : "Add question"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onCancel}
          disabled={saving}
          className="h-9 rounded-xl border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700 hover:text-white text-xs gap-1.5"
        >
          <X className="w-3.5 h-3.5" />
          Cancel
        </Button>
      </div>
    </div>
  )
}

/* =====================================================
   PAGE
===================================================== */

export default function CompanyDetailPage() {
  const { id: companyId } = useParams() as { id: string }
  const router = useRouter()
  const { accessToken, user } = useAuth()

  const [company,   setCompany]   = useState<Company | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)

  const [showAddForm,   setShowAddForm]   = useState(false)
  const [editingId,     setEditingId]     = useState<string | null>(null)
  const [savingId,      setSavingId]      = useState<string | null>(null)
  const [deletingId,    setDeletingId]    = useState<string | null>(null)
  const [searchQuery,   setSearchQuery]   = useState("")

  /* -------------------------
     Redirect non-admins
  -------------------------- */

  useEffect(() => {
    if (user && user.role === "CANDIDATE") router.replace("/dashboard")
  }, [user, router])

  /* -------------------------
     Fetch company + questions
  -------------------------- */

  const fetchData = useCallback(async () => {
    if (!accessToken) return

    try {
      setLoading(true)
      setError(null)

      const [companyRes, questionsRes] = await Promise.all([
        fetch(`/api/companies/${companyId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`/api/companies/${companyId}/questions`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ])

      if (!companyRes.ok) {
        throw new Error("Company not found")
      }

      const [companyJson, questionsJson] = await Promise.all([
        companyRes.json(),
        questionsRes.json(),
      ])

      setCompany(companyJson.data)
      setQuestions(questionsJson.data ?? [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load company")
    } finally {
      setLoading(false)
    }
  }, [accessToken, companyId])

  useEffect(() => { fetchData() }, [fetchData])

  /* -------------------------
     Add question
  -------------------------- */

  async function handleAdd(data: { text: string; type: string; codeTemplate?: string }) {
    setSavingId("new")
    try {
      const res = await fetch(`/api/companies/${companyId}/questions`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body:    JSON.stringify(data),
      })
      if (!res.ok) throw new Error("Failed to create question")
      const json = await res.json()
      setQuestions((prev) => [{ ...json.data, usedInInterviews: 0 }, ...prev])
      setShowAddForm(false)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to create question")
    } finally {
      setSavingId(null)
    }
  }

  /* -------------------------
     Edit question
  -------------------------- */

  async function handleEdit(id: string, data: { text: string; type: string; codeTemplate?: string }) {
    setSavingId(id)
    try {
      const res = await fetch(`/api/questions/${id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body:    JSON.stringify(data),
      })
      if (!res.ok) throw new Error("Failed to update question")
      const json = await res.json()
      setQuestions((prev) => prev.map((q) => q.id === id ? { ...q, ...json.data } : q))
      setEditingId(null)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update question")
    } finally {
      setSavingId(null)
    }
  }

  /* -------------------------
     Delete question
  -------------------------- */

  async function handleDelete(id: string) {
    if (!confirm("Delete this question? It will be removed from all interviews.")) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/questions/${id}`, {
        method:  "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error("Failed to delete question")
      setQuestions((prev) => prev.filter((q) => q.id !== id))
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete question")
    } finally {
      setDeletingId(null)
    }
  }

  /* =====================================================
     RENDER
  ===================================================== */

  if (user?.role === "CANDIDATE") return null
  if (loading) return <Loading text="Loading company..." />
  if (error || !company) return <ErrorComponent message={error || "Company not found"} onRetry={fetchData} />

  const filtered = questions.filter((q) =>
    q.text.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6 max-w-3xl mx-auto py-6 px-4">

      {/* Back */}
      <Link
        href="/dashboard/admin"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-300 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to dashboard
      </Link>

      {/* Company info card */}
      <Card className="bg-slate-900/80 border-slate-700/50 rounded-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            {company.logo ? (
              <img src={company.logo} alt={company.name} className="w-12 h-12 rounded-xl object-contain bg-slate-800 border border-slate-700 p-1" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
            )}
            <div>
              <CardTitle className="text-white text-lg">{company.name}</CardTitle>
              {company.website && (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 mt-0.5"
                >
                  <Globe className="w-3 h-3" />
                  {company.website}
                </a>
              )}
            </div>
          </div>
          {company.description && (
            <CardDescription className="text-slate-400 text-sm mt-2">
              {company.description}
            </CardDescription>
          )}
        </CardHeader>
      </Card>

      {/* Questions section */}
      <Card className="bg-slate-900/80 border-slate-700/50 rounded-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="text-white text-base">Question Bank</CardTitle>
              <CardDescription className="text-slate-400 text-xs mt-0.5">
                {questions.length} question{questions.length !== 1 ? "s" : ""} · used in interviews when scheduling
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => { setShowAddForm(true); setEditingId(null) }}
              disabled={showAddForm}
              className="h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add question
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 pb-6">

          {/* Add form */}
          {showAddForm && (
            <QuestionForm
              onSave={handleAdd}
              onCancel={() => setShowAddForm(false)}
              saving={savingId === "new"}
            />
          )}

          {/* Search */}
          {questions.length > 4 && (
            <div className="relative">
              <Input
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 rounded-xl bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500 text-sm"
              />
            </div>
          )}

          {/* Empty state */}
          {filtered.length === 0 && !showAddForm && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-slate-400 text-sm font-medium">
                {searchQuery ? "No questions match your search" : "No questions yet"}
              </p>
              {!searchQuery && (
                <p className="text-slate-500 text-xs mt-1">
                  Add questions that will be assigned to interviews for this company
                </p>
              )}
            </div>
          )}

          {/* Question list */}
          <div className="space-y-2">
            {filtered.map((q) => (
              <div key={q.id}>
                {editingId === q.id ? (
                  <QuestionForm
                    initial={q}
                    onSave={(data) => handleEdit(q.id, data)}
                    onCancel={() => setEditingId(null)}
                    saving={savingId === q.id}
                  />
                ) : (
                  <div className="flex items-start gap-3 p-3.5 bg-slate-800/40 border border-slate-700/50 rounded-xl hover:border-slate-600/50 transition-colors group">

                    {/* Type icon */}
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      q.type === "CODE"
                        ? "bg-violet-500/10 border border-violet-500/20"
                        : "bg-slate-700/50 border border-slate-600/50"
                    }`}>
                      {q.type === "CODE"
                        ? <Code className="w-3.5 h-3.5 text-violet-400" />
                        : <FileText className="w-3.5 h-3.5 text-slate-400" />
                      }
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white leading-relaxed">{q.text}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`text-xs ${q.type === "CODE" ? "text-violet-400" : "text-slate-500"}`}>
                          {q.type === "CODE" ? "Coding" : "General"}
                        </span>
                        {q.usedInInterviews > 0 && (
                          <span className="flex items-center gap-1 text-xs text-green-400">
                            <CheckCircle2 className="w-3 h-3" />
                            Used in {q.usedInInterviews} interview{q.usedInInterviews !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions — shown on hover */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => { setEditingId(q.id); setShowAddForm(false) }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                        title="Edit question"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {user?.role === "ADMIN" && (
                        <button
                          onClick={() => handleDelete(q.id)}
                          disabled={deletingId === q.id}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                          title="Delete question"
                        >
                          {deletingId === q.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />
                          }
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}