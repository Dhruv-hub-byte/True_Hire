"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"

import { Button }   from "@/components/ui/button"
import { Input }    from "@/components/ui/input"
import { Label }    from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select"
import Loading from "@/components/common/loading"

import {
  AlertCircle, Loader2, ArrowLeft,
  CheckCircle2, Plus, X, Code, FileText,
} from "lucide-react"

/* =====================================================
   TYPES
===================================================== */

interface User {
  id:           string
  name:         string
  email:        string
  profileImage: string | null
}

interface Company {
  id:   string
  name: string
  logo: string | null
}

interface Question {
  id:           string
  text:         string
  type:         string
  codeTemplate: string | null
}

/* =====================================================
   PAGE
===================================================== */

export default function NewInterviewPage() {
  const { accessToken, user } = useAuth()
  const router = useRouter()

  // Form fields
  const [title,        setTitle]        = useState("")
  const [description,  setDescription]  = useState("")
  const [duration,     setDuration]     = useState("60")
  const [startTime,    setStartTime]    = useState("")
  const [candidateId,  setCandidateId]  = useState("")
  const [interviewerId,setInterviewerId]= useState("")
  const [companyId,    setCompanyId]    = useState("")
  const [selectedQIds, setSelectedQIds] = useState<string[]>([])

  // Data
  const [candidates,   setCandidates]   = useState<User[]>([])
  const [interviewers, setInterviewers] = useState<User[]>([])
  const [companies,    setCompanies]    = useState<Company[]>([])
  const [questions,    setQuestions]    = useState<Question[]>([])

  // UI state
  const [loadingData,  setLoadingData]  = useState(true)
  const [loadingQ,     setLoadingQ]     = useState(false)
  const [submitting,   setSubmitting]   = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [fieldErrors,  setFieldErrors]  = useState<Record<string, string>>({})

  /* -------------------------
     Redirect non-admins
  -------------------------- */

  useEffect(() => {
    if (user && user.role !== "ADMIN") router.replace("/dashboard")
  }, [user, router])

  /* -------------------------
     Fetch candidates, interviewers, companies
  -------------------------- */

  const fetchData = useCallback(async () => {
    if (!accessToken) return
    try {
      setLoadingData(true)
      const [candidatesRes, interviewersRes, companiesRes] = await Promise.all([
        fetch("/api/users?role=CANDIDATE&limit=100", { headers: { Authorization: `Bearer ${accessToken}` } }),
        fetch("/api/users?role=INTERVIEWER&limit=100", { headers: { Authorization: `Bearer ${accessToken}` } }),
        fetch("/api/companies?limit=100", { headers: { Authorization: `Bearer ${accessToken}` } }),
      ])

      const [c, i, co] = await Promise.all([
        candidatesRes.json(),
        interviewersRes.json(),
        companiesRes.json(),
      ])

      setCandidates(c.data  ?? [])
      setInterviewers(i.data ?? [])
      setCompanies(co.data  ?? [])
    } catch {
      setError("Failed to load form data")
    } finally {
      setLoadingData(false)
    }
  }, [accessToken])

  useEffect(() => { fetchData() }, [fetchData])

  /* -------------------------
     Fetch questions when company changes
  -------------------------- */

  useEffect(() => {
    if (!companyId || !accessToken) {
      setQuestions([])
      setSelectedQIds([])
      return
    }

    const fetchQuestions = async () => {
      setLoadingQ(true)
      try {
        const res  = await fetch(`/api/companies/${companyId}/questions`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        const json = await res.json()
        setQuestions(json.data ?? [])
        setSelectedQIds([]) // reset selection on company change
      } catch {
        setQuestions([])
      } finally {
        setLoadingQ(false)
      }
    }

    fetchQuestions()
  }, [companyId, accessToken])

  /* -------------------------
     Auto-calculate end time
  -------------------------- */

  useEffect(() => {
    if (!startTime || !duration) return
    const start = new Date(startTime)
    const end   = new Date(start.getTime() + Number(duration) * 60 * 1000)
    // Format as datetime-local value
    const pad = (n: number) => String(n).padStart(2, "0")
    const local = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`
    // Store for submission only — not shown in form
    ;(window as any).__endTime = local
  }, [startTime, duration])

  /* -------------------------
     Toggle question selection
  -------------------------- */

  function toggleQuestion(id: string) {
    setSelectedQIds((prev) =>
      prev.includes(id) ? prev.filter((q) => q !== id) : [...prev, id]
    )
  }

  /* -------------------------
     Validate
  -------------------------- */

  function validate(): boolean {
    const errors: Record<string, string> = {}
    if (!title.trim())      errors.title       = "Title is required"
    if (!duration || Number(duration) <= 0) errors.duration = "Duration must be positive"
    if (!startTime)         errors.startTime   = "Start time is required"
    if (new Date(startTime) < new Date(Date.now() - 5 * 60 * 1000)) errors.startTime = "Start time cannot be in the past"
    if (!candidateId)       errors.candidateId = "Please select a candidate"
    if (!companyId)         errors.companyId   = "Please select a company"
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  /* -------------------------
     Submit
  -------------------------- */

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    setError(null)

    try {
      const start   = new Date(startTime)
      const end     = new Date(start.getTime() + Number(duration) * 60 * 1000)

      // 1. Create interview
      const res = await fetch("/api/interviews", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body:    JSON.stringify({
          title:        title.trim(),
          description:  description.trim() || null,
          duration:     Number(duration),
          startTime:    start.toISOString(),
          endTime:      end.toISOString(),
          candidateId: candidateId !== "none" ? candidateId : "",
          interviewerId: (interviewerId && interviewerId !== "none") ? interviewerId : null,
          companyId: companyId !== "none" ? companyId : "",
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to create interview")

      const interviewId = json.data.id

      // 2. Assign questions if selected
      if (selectedQIds.length > 0) {
        await fetch(`/api/interviews/${interviewId}/questions`, {
          method:  "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
          body:    JSON.stringify({ questionIds: selectedQIds }),
        })
      }

      router.push("/dashboard/admin/interviews")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create interview")
    } finally {
      setSubmitting(false)
    }
  }

  /* =====================================================
     RENDER
  ===================================================== */

  if (user?.role !== "ADMIN") return null
  if (loadingData) return <Loading text="Loading form data..." />

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6 px-4">

      {/* Back */}
      <Link
        href="/dashboard/admin/interviews"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-300 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to interviews
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">New Interview</h1>
        <p className="text-slate-400 text-sm mt-1">Schedule an interview and assign questions</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>

        {/* ── SECTION 1: Basic info ── */}
        <Card className="bg-slate-900/80 border-slate-700/50 rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm font-semibold">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pb-6">

            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Interview Title <span className="text-red-400">*</span></Label>
              <Input
                placeholder="e.g. Frontend Engineer Interview"
                value={title}
                onChange={(e) => { setTitle(e.target.value); setFieldErrors((p) => ({ ...p, title: "" })) }}
                disabled={submitting}
                className={`h-11 rounded-xl bg-slate-800/60 text-white placeholder:text-slate-500 ${
                  fieldErrors.title ? "border-red-500/50" : "border-slate-700"
                }`}
              />
              {fieldErrors.title && <p className="text-red-400 text-xs">{fieldErrors.title}</p>}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">
                Description <span className="text-slate-500 font-normal">(optional)</span>
              </Label>
              <textarea
                placeholder="What will this interview cover?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={submitting}
                rows={2}
                className="w-full rounded-xl bg-slate-800/60 border border-slate-700 text-white placeholder:text-slate-500 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 resize-none transition-colors"
              />
            </div>

            {/* Duration + Start time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Duration (minutes) <span className="text-red-400">*</span></Label>
                <Select value={duration} onValueChange={setDuration} disabled={submitting}>
                  <SelectTrigger className={`h-11 rounded-xl bg-slate-800/60 text-white ${
                    fieldErrors.duration ? "border-red-500/50" : "border-slate-700"
                  }`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 rounded-xl">
                    {[15, 30, 45, 60, 90, 120].map((d) => (
                      <SelectItem key={d} value={String(d)} className="text-slate-200 focus:bg-slate-700 focus:text-white">
                        {d} minutes
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.duration && <p className="text-red-400 text-xs">{fieldErrors.duration}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Start Time <span className="text-red-400">*</span></Label>
                <Input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => { setStartTime(e.target.value); setFieldErrors((p) => ({ ...p, startTime: "" })) }}
                  disabled={submitting}
                  className={`h-11 rounded-xl bg-slate-800/60 text-white ${
                    fieldErrors.startTime ? "border-red-500/50" : "border-slate-700"
                  }`}
                />
                {fieldErrors.startTime && <p className="text-red-400 text-xs">{fieldErrors.startTime}</p>}
              </div>
            </div>

            {/* End time preview */}
            {startTime && duration && (
              <p className="text-xs text-slate-500">
                Interview ends at{" "}
                <span className="text-slate-300">
                  {new Date(new Date(startTime).getTime() + Number(duration) * 60000).toLocaleString("en-US", {
                    month: "short", day: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              </p>
            )}
          </CardContent>
        </Card>

        {/* ── SECTION 2: People ── */}
        <Card className="bg-slate-900/80 border-slate-700/50 rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm font-semibold">Participants</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pb-6">

            {/* Company */}
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Company <span className="text-red-400">*</span></Label>
              <Select value={companyId} onValueChange={setCompanyId} disabled={submitting}>
                <SelectTrigger className={`h-11 rounded-xl bg-slate-800/60 text-white ${
                  fieldErrors.companyId ? "border-red-500/50" : "border-slate-700"
                }`}>
                  <SelectValue placeholder="Select company..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 rounded-xl">
                  {companies.length === 0
                    ? <SelectItem value="none" disabled className="text-slate-500">No companies found</SelectItem>
                    : companies.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-slate-200 focus:bg-slate-700 focus:text-white">
                        {c.name}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
              {fieldErrors.companyId && <p className="text-red-400 text-xs">{fieldErrors.companyId}</p>}
            </div>

            {/* Candidate */}
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Candidate <span className="text-red-400">*</span></Label>
              <Select value={candidateId} onValueChange={(v) => { setCandidateId(v); setFieldErrors((p) => ({ ...p, candidateId: "" })) }} disabled={submitting}>
                <SelectTrigger className={`h-11 rounded-xl bg-slate-800/60 text-white ${
                  fieldErrors.candidateId ? "border-red-500/50" : "border-slate-700"
                }`}>
                  <SelectValue placeholder="Select candidate..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 rounded-xl max-h-48">
                  {candidates.length === 0
                    ? <SelectItem value="none" disabled className="text-slate-500">No candidates found</SelectItem>
                    : candidates.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-slate-200 focus:bg-slate-700 focus:text-white">
                        <div className="flex flex-col">
                          <span>{c.name}</span>
                          <span className="text-xs text-slate-400">{c.email}</span>
                        </div>
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
              {fieldErrors.candidateId && <p className="text-red-400 text-xs">{fieldErrors.candidateId}</p>}
            </div>

            {/* Interviewer */}
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">
                Interviewer <span className="text-slate-500 font-normal">(optional — can assign later)</span>
              </Label>
              <Select value={interviewerId} onValueChange={setInterviewerId} disabled={submitting}>
                <SelectTrigger className="h-11 rounded-xl bg-slate-800/60 border-slate-700 text-white">
                  <SelectValue placeholder="Select interviewer..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 rounded-xl max-h-48">
                  <SelectItem value="none" className="text-slate-400 focus:bg-slate-700 focus:text-white">
                    No interviewer (assign later)
                  </SelectItem>
                  {interviewers.map((i) => (
                    <SelectItem key={i.id} value={i.id} className="text-slate-200 focus:bg-slate-700 focus:text-white">
                      <div className="flex flex-col">
                        <span>{i.name}</span>
                        <span className="text-xs text-slate-400">{i.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* ── SECTION 3: Questions ── */}
        <Card className="bg-slate-900/80 border-slate-700/50 rounded-2xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white text-sm font-semibold">Questions</CardTitle>
                <CardDescription className="text-slate-400 text-xs mt-0.5">
                  {companyId
                    ? `${selectedQIds.length} of ${questions.length} selected`
                    : "Select a company first to load questions"
                  }
                </CardDescription>
              </div>
              {questions.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    selectedQIds.length === questions.length
                      ? setSelectedQIds([])
                      : setSelectedQIds(questions.map((q) => q.id))
                  }
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  {selectedQIds.length === questions.length ? "Deselect all" : "Select all"}
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pb-5">
            {!companyId ? (
              <p className="text-slate-600 text-sm text-center py-4 italic">
                Select a company above to see its question bank
              </p>
            ) : loadingQ ? (
              <div className="flex items-center justify-center py-6 gap-2">
                <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />
                <span className="text-slate-500 text-sm">Loading questions...</span>
              </div>
            ) : questions.length === 0 ? (
              <div className="text-center py-6 space-y-2">
                <FileText className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-slate-500 text-sm">No questions for this company</p>
                <Link href={`/dashboard/admin/companies/${companyId}`} className="text-indigo-400 hover:text-indigo-300 text-xs">
                  Add questions →
                </Link>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {questions.map((q) => {
                  const selected = selectedQIds.includes(q.id)
                  return (
                    <div
                      key={q.id}
                      onClick={() => toggleQuestion(q.id)}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                        selected
                          ? "bg-indigo-500/10 border-indigo-500/30"
                          : "bg-slate-800/40 border-slate-700/50 hover:border-slate-600/50"
                      }`}
                    >
                      {/* Checkbox */}
                      <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5 border transition-colors ${
                        selected ? "bg-indigo-600 border-indigo-500" : "border-slate-600"
                      }`}>
                        {selected && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>

                      {/* Type icon */}
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                        q.type === "CODE"
                          ? "bg-violet-500/10 border border-violet-500/20"
                          : "bg-slate-700/50 border border-slate-600/50"
                      }`}>
                        {q.type === "CODE"
                          ? <Code className="w-3 h-3 text-violet-400" />
                          : <FileText className="w-3 h-3 text-slate-400" />
                        }
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white leading-relaxed">{q.text}</p>
                        <span className={`text-xs ${q.type === "CODE" ? "text-violet-400" : "text-slate-500"}`}>
                          {q.type === "CODE" ? "Coding" : "General"}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3">
          <Link href="/dashboard/admin/interviews" className="flex-1">
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 rounded-xl border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={submitting}
            className="flex-1 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white gap-2 disabled:opacity-60"
          >
            {submitting
              ? <><Loader2 className="w-4 h-4 animate-spin" />Creating...</>
              : <><Plus className="w-4 h-4" />Create Interview</>
            }
          </Button>
        </div>
      </form>
    </div>
  )
}