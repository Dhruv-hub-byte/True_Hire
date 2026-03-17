"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button }      from "@/components/ui/button"
import Loading         from "@/components/common/loading"
import ErrorComponent  from "@/components/common/error"
import ChatPanel       from "@/components/chat-panel/page"
import VideoCall       from "@/components/video-call"

import {
  ShieldAlert, Clock, AlertTriangle,
  CheckCircle2, XCircle, ArrowLeft,
  RefreshCw, FileText, Wifi, WifiOff,
  Play,
} from "lucide-react"

/* =====================================================
   TYPES
===================================================== */

type InterviewStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"

interface Candidate {
  id:           string
  name:         string
  email:        string
  profileImage: string | null
}

interface InterviewQuestion {
  id:       string
  order:    number
  answer:   string | null
  question: { id: string; text: string; type: string }
}

interface Violation {
  id:          string
  type:        string
  description: string
  severity:    number
  timestamp:   string
}

interface Interview {
  id:                  string
  title:               string
  status:              InterviewStatus
  duration:            number
  startTime:           string
  endTime:             string
  cheatingProbability: number | null
  user_interview_candidateIdTouser:   Candidate
  interviewquestion:   InterviewQuestion[]
  violation:           Violation[]
}

/* =====================================================
   HELPERS
===================================================== */

const VIOLATION_COLORS: Record<number, string> = {
  1: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  2: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  3: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  4: "text-red-400 bg-red-500/10 border-red-500/20",
  5: "text-red-400 bg-red-500/10 border-red-500/20",
}

function RiskMeter({ probability }: { probability: number | null }) {
  const pct   = Math.round((probability ?? 0) * 100)
  const color = pct >= 70 ? "bg-red-500" : pct >= 40 ? "bg-yellow-500" : "bg-green-500"
  const text  = pct >= 70 ? "text-red-400" : pct >= 40 ? "text-yellow-400" : "text-green-400"
  const label = pct >= 70 ? "High risk"   : pct >= 40 ? "Medium risk"     : "Low risk"

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs text-slate-400">Cheating probability</span>
        <span className={`text-xs font-semibold ${text}`}>{pct}% — {label}</span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
}

/* =====================================================
   PAGE
===================================================== */

export default function InterviewMonitorPage() {
  const { id: interviewId } = useParams() as { id: string }
  const router  = useRouter()
  const { accessToken, user } = useAuth()

  const [interview,     setInterview]     = useState<Interview | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState<string | null>(null)
  const [lastRefreshed, setLastRefreshed] = useState(new Date())
  const [autoRefresh,   setAutoRefresh]   = useState(true)
  const [ending,        setEnding]        = useState(false)

  /* -------------------------
     Redirect candidates
  -------------------------- */

  useEffect(() => {
    if (user && user.role === "CANDIDATE") router.replace("/dashboard")
  }, [user, router])

  /* -------------------------
     Fetch interview
  -------------------------- */

  const fetchInterview = useCallback(async () => {
    if (!accessToken) return
    try {
      const res  = await fetch(`/api/interviews/${interviewId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to load")
      setInterview(json.data)
      setLastRefreshed(new Date())
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [accessToken, interviewId])

  useEffect(() => { fetchInterview() }, [fetchInterview])

  // Auto-refresh every 10s for live data (violations, answers)
  useEffect(() => {
    if (!autoRefresh) return
    if (interview?.status !== "IN_PROGRESS" && interview?.status !== "SCHEDULED") return
    const t = setInterval(fetchInterview, 10_000)
    return () => clearInterval(t)
  }, [autoRefresh, interview?.status, fetchInterview])

  /* -------------------------
     End interview
  -------------------------- */

  async function handleEndInterview() {
    if (!confirm("End this interview early? The candidate will be stopped immediately.")) return
    setEnding(true)
    try {
      const res = await fetch(`/api/interviews/${interviewId}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body:    JSON.stringify({ status: "COMPLETED" }),
      })
      if (!res.ok) throw new Error("Failed to end interview")
      await fetchInterview()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to end interview")
    } finally {
      setEnding(false)
    }
  }

  /* =====================================================
     RENDER
  ===================================================== */

  if (user?.role === "CANDIDATE") return null
  if (loading)           return <Loading text="Loading monitoring view..." />
  if (error || !interview) return <ErrorComponent message={error || "Interview not found"} onRetry={fetchInterview} />

  const status        = interview.status as string
  const candidate     = interview.user_interview_candidateIdTouser
  const violations    = interview.violation    ?? []
  const questions     = interview.interviewquestion ?? []
  const answeredCount = questions.filter((q) => q.answer?.trim()).length
  const highSeverity  = violations.filter((v) => v.severity >= 4).length

  const myRole = (user?.role ?? "INTERVIEWER") as "ADMIN" | "INTERVIEWER" | "CANDIDATE"

  return (
    <div className="min-h-screen bg-slate-950 p-4 space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-white font-bold text-lg">{interview.title}</h1>
            <p className="text-slate-400 text-xs mt-0.5">
              Monitoring · last updated {lastRefreshed.toLocaleTimeString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">

          {/* Status badge */}
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border ${
            status === "IN_PROGRESS"
              ? "bg-green-500/10 text-green-400 border-green-500/20"
              : status === "COMPLETED"
              ? "bg-slate-500/10 text-slate-400 border-slate-500/20"
              : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              status === "IN_PROGRESS" ? "bg-green-400 animate-pulse" : "bg-current"
            }`} />
            {interview.status}
          </span>

          {/* Auto-refresh toggle */}
          <button
            onClick={() => setAutoRefresh((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors ${
              autoRefresh
                ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                : "bg-slate-800 text-slate-500 border-slate-700"
            }`}
          >
            {autoRefresh ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {autoRefresh ? "Live" : "Paused"}
          </button>

          {/* Manual refresh */}
          <button
            onClick={fetchInterview}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* End interview */}
          {status === "IN_PROGRESS" && (
            <Button
              size="sm"
              onClick={handleEndInterview}
              disabled={ending}
              className="h-8 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs gap-1.5"
            >
              <XCircle className="w-3.5 h-3.5" />
              {ending ? "Ending..." : "End Interview"}
            </Button>
          )}

          {/* View report */}
          {status === "COMPLETED" && (
            <Button
              size="sm"
              onClick={() => router.push(`/interview/${interviewId}/report`)}
              className="h-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              View Report
            </Button>
          )}
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── LEFT (2/3) ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Candidate info + risk */}
          <Card className="bg-slate-900/80 border-slate-700/50 rounded-2xl">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shrink-0 overflow-hidden">
                  {candidate.profileImage
                    ? <img src={candidate.profileImage} alt={candidate.name} className="w-full h-full object-cover" />
                    : <span className="text-white font-semibold text-sm">{candidate.name.charAt(0).toUpperCase()}</span>
                  }
                </div>
                <div>
                  <p className="text-white font-semibold">{candidate.name}</p>
                  <p className="text-slate-400 text-xs">{candidate.email}</p>
                </div>
                <div className="ml-auto flex items-center gap-4 text-xs">
                  <div className="text-center">
                    <p className="text-white font-semibold">{answeredCount}/{questions.length}</p>
                    <p className="text-slate-500">answered</p>
                  </div>
                  <div className="text-center">
                    <p className={`font-semibold ${violations.length > 0 ? "text-red-400" : "text-green-400"}`}>
                      {violations.length}
                    </p>
                    <p className="text-slate-500">violations</p>
                  </div>
                  <div className="text-center">
                    <p className="text-white font-semibold">{interview.duration}m</p>
                    <p className="text-slate-500">duration</p>
                  </div>
                </div>
              </div>
              <RiskMeter probability={interview.cheatingProbability} />
            </CardContent>
          </Card>

          {/* Questions + answers */}
          <Card className="bg-slate-900/80 border-slate-700/50 rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm font-semibold">Questions & Answers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pb-5">
              {questions.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">No questions assigned</p>
              ) : questions.map((iq) => (
                <div key={iq.id} className="space-y-1.5 p-3 bg-slate-800/40 border border-slate-700/50 rounded-xl">
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-slate-500 shrink-0 mt-0.5">Q{iq.order}.</span>
                    <p className="text-slate-200 text-sm flex-1">{iq.question.text}</p>
                    {iq.answer?.trim()
                      ? <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                      : <Clock className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                    }
                  </div>
                  {iq.answer?.trim() ? (
                    <div className="ml-5 p-2.5 bg-slate-900/60 rounded-lg border border-slate-700/50">
                      <p className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap">
                        {iq.answer}
                      </p>
                    </div>
                  ) : (
                    <p className="ml-5 text-slate-600 text-xs italic">Not answered yet</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* ── RIGHT (1/3) ── */}
        <div className="space-y-4">

          {/* Violations */}
          <Card className="bg-slate-900/80 border-slate-700/50 rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-sm font-semibold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                  Violations
                </CardTitle>
                {highSeverity > 0 && (
                  <span className="text-xs text-red-400 font-medium">
                    {highSeverity} critical
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              {violations.length === 0 ? (
                <div className="flex flex-col items-center py-5 gap-2">
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                  <p className="text-green-400 text-xs">No violations detected</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto scrollbar-hide">
                  {[...violations].reverse().map((v) => (
                    <div
                      key={v.id}
                      className={`flex items-start gap-2 p-2.5 rounded-lg border text-xs ${
                        VIOLATION_COLORS[v.severity] ?? VIOLATION_COLORS[1]
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{v.type.replace(/_/g, " ")}</p>
                        <p className="opacity-80 mt-0.5">{v.description}</p>
                        <p className="opacity-50 mt-0.5">{formatTime(v.timestamp)}</p>
                      </div>
                      <span className="font-bold shrink-0">{v.severity}/5</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Live video call */}
          <VideoCall interviewId={interviewId} />

          {/* Real-time chat using ChatPanel with polling */}
          <Card className="bg-slate-900/80 border-slate-700/50 rounded-2xl overflow-hidden">
            <div className="h-96">
              <ChatPanel
                interviewId={interviewId}
                myRole={myRole}
                canSend={status !== "COMPLETED" && status !== "CANCELLED"}
              />
            </div>
          </Card>

        </div>
      </div>
    </div>
  )
}