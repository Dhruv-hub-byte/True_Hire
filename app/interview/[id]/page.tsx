"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

import Proctoring    from "@/components/interview/proctoring"
import QuestionPanel from "@/components/interview/question-panel"
import VideoPanel    from "@/components/interview/video-pannel"
import VideoCall     from "@/components/video-call"
import ChatPanel     from "@/components/chat-panel/page"

import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import Loading       from "@/components/common/loading"
import ErrorComponent from "@/components/common/error"

import { Clock, Building2, User, AlertCircle } from "lucide-react"

/* =====================================================
   TYPES
===================================================== */

interface InterviewQuestion {
  id:        string
  order:     number
  answer:    string | null
  timeSpent: number | null
  question: {
    id:           string
    text:         string
    type:         string
    codeTemplate: string | null
  }
}

type InterviewStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"

interface Interview {
  id:          string
  title:       string
  description: string | null
  duration:    number
  status:      InterviewStatus
  startTime:   string
  endTime:     string
  user_interview_candidateIdTouser:   { id: string; name: string }
  user_interview_interviewerIdTouser: { id: string; name: string } | null
  company:     { id: string; name: string }
  interviewquestion: InterviewQuestion[]
}

/* =====================================================
   COUNTDOWN HOOK
===================================================== */

function useCountdown(endTime: string): { display: string; urgent: boolean } {
  const [remaining, setRemaining] = useState("")
  const [urgent,    setUrgent]    = useState(false)

  useEffect(() => {
    const tick = () => {
      const diff = new Date(endTime).getTime() - Date.now()
      if (diff <= 0) { setRemaining("00:00"); return }

      const h = Math.floor(diff / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      const s = Math.floor((diff % 60_000) / 1_000)

      setUrgent(diff < 5 * 60 * 1000) // red when < 5 min
      setRemaining(
        h > 0
          ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
          : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      )
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [endTime])

  return { display: remaining, urgent }
}

/* =====================================================
   PAGE
===================================================== */

export default function InterviewPage() {
  const { id }      = useParams()
  const router      = useRouter()
  const { accessToken, user } = useAuth()

  const interviewId = id as string

  const [interview,    setInterview]    = useState<Interview | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [submitting,   setSubmitting]   = useState(false)
  const [submitError,  setSubmitError]  = useState<string | null>(null)

  const { display: countdown, urgent } = useCountdown(
    interview?.endTime ?? new Date(Date.now() + 9_999_999).toISOString()
  )

  /* -------------------------
     Fetch interview
  -------------------------- */

  const fetchInterview = useCallback(async () => {
    if (!accessToken) return
    try {
      setLoading(true)
      setError(null)
      const res  = await fetch(`/api/interviews/${interviewId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`)
      setInterview(json.data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load interview")
    } finally {
      setLoading(false)
    }
  }, [interviewId, accessToken])

  useEffect(() => { fetchInterview() }, [fetchInterview])

  /* -------------------------
     Submit answers
  -------------------------- */

  const handleSubmit = async (answers: Record<string, string>) => {
    try {
      setSubmitting(true)
      setSubmitError(null)
      const res = await fetch(`/api/interviews/${interviewId}/submit`, {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${accessToken}`,
        },
        credentials: "include",
        body: JSON.stringify({ answers }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Submission failed")
      router.push(`/interview/${interviewId}/report`)
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Submission failed")
    } finally {
      setSubmitting(false)
    }
  }

  /* =====================================================
     RENDER STATES
  ===================================================== */

  if (loading) return <Loading text="Loading interview..." />

  if (error || !interview) {
    return (
      <ErrorComponent
        title="Unable to load interview"
        message={error || "Interview not found"}
        onRetry={fetchInterview}
      />
    )
  }

  if (interview.status === "CANCELLED") {
    return (
      <ErrorComponent
        title="Interview Cancelled"
        message="This interview has been cancelled."
      />
    )
  }

  if (interview.status === "COMPLETED") {
    return (
      <ErrorComponent
        title="Interview Completed"
        message="This interview has already been submitted."
        showBack
      />
    )
  }

  const status    = interview.status as string


  const questions = [...interview.interviewquestion]
    .sort((a, b) => a.order - b.order)
    .map((q) => ({
      id:           q.question.id,
      text:         q.question.text,
      type:         q.question.type,
      codeTemplate: q.question.codeTemplate,
    }))

  const isExpired = new Date(interview.endTime) < new Date()

  /* =====================================================
     UI — two column layout on desktop
     Left:  questions (main content)
     Right: video + chat sidebar
  ===================================================== */

  return (
    <Proctoring interviewId={interviewId}>
      <div className="min-h-screen bg-slate-950 p-4">
        <div className="max-w-6xl mx-auto space-y-4">

          {/* ── Header bar ── */}
          <Card className="bg-slate-900/80 border-slate-700/50 rounded-2xl">
            <CardHeader className="py-4 px-5">
              <div className="flex items-center justify-between gap-4 flex-wrap">

                {/* Left — interview info */}
                <div className="space-y-1 min-w-0">
                  <CardTitle className="text-white text-lg font-bold truncate">
                    {interview.title}
                  </CardTitle>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {interview.company.name}
                    </span>
                    {interview.user_interview_interviewerIdTouser && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {interview.user_interview_interviewerIdTouser.name}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {interview.duration} min
                    </span>
                  </div>
                </div>

                {/* Right — countdown */}
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono text-sm font-semibold ${
                  urgent
                    ? "bg-red-500/10 border-red-500/30 text-red-400"
                    : "bg-slate-800/60 border-slate-700 text-slate-300"
                }`}>
                  <Clock className={`w-4 h-4 ${urgent ? "animate-pulse" : ""}`} />
                  {isExpired ? "Time's up" : countdown}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* ── Submit error ── */}
          {submitError && (
            <div className="flex items-center gap-2.5 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {submitError}
            </div>
          )}

          {/* ── Main layout ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Questions — takes 2/3 width on desktop */}
            <div className="lg:col-span-2">
              <QuestionPanel
                questions={questions}
                onSubmit={handleSubmit}
                submitting={submitting}
              />
            </div>

            {/* Sidebar — video + chat */}
            <div className="space-y-4">

              {/* Live video call with interviewer */}
              <VideoCall interviewId={interviewId} />

              {/* Live chat with interviewer */}
              <div className="h-80 bg-slate-900/80 border border-slate-700/50 rounded-2xl overflow-hidden">
                <ChatPanel
                  interviewId={interviewId}
                  myRole="CANDIDATE"
                  canSend={status !== "COMPLETED" && status !== "CANCELLED"}
                />
              </div>
            </div>
          </div>

        </div>
      </div>
    </Proctoring>
  )
}