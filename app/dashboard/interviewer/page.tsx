'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Calendar, Clock, User, Video, AlertCircle,
  FileText, ChevronLeft, ChevronRight, Timer,
  ShieldAlert, CheckCircle2, Building2, Info,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import Loading from '@/components/common/loading'
import ErrorComponent from '@/components/common/error'

/* =====================================================
   TYPES — aligned with updated schema + interviews route
===================================================== */

type InterviewStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

interface InterviewUser {
  id: string
  name: string
  email: string
  profileImage: string | null
}

interface Interview {
  id: string
  title: string
  description: string | null
  startTime: string
  endTime: string
  duration: number
  status: InterviewStatus
  cheatingProbability: number | null
  createdAt: string
  user_interview_candidateIdTouser: InterviewUser
  company: {
    id: string
    name: string
    logo: string | null
  }
  violation: {
    id: string
    type: string
    severity: number
    description: string
    timestamp: string
  }[]
}

interface Pagination {
  total: number
  page: number
  limit: number
  pages: number
}

/* =====================================================
   STATUS CONFIG
===================================================== */

type StatusConfig = { label: string; classes: string; dot: string }

const STATUS_CONFIG: Record<InterviewStatus, StatusConfig> = {
  SCHEDULED:   { label: 'Scheduled',   classes: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',  dot: 'bg-indigo-400' },
  IN_PROGRESS: { label: 'Live',        classes: 'bg-green-500/10 text-green-400 border-green-500/20',     dot: 'bg-green-400 animate-pulse' },
  COMPLETED:   { label: 'Completed',   classes: 'bg-slate-500/10 text-slate-400 border-slate-500/20',     dot: 'bg-slate-400' },
  CANCELLED:   { label: 'Cancelled',   classes: 'bg-red-500/10 text-red-400 border-red-500/20',           dot: 'bg-red-400' },
}

/* =====================================================
   HELPERS
===================================================== */

function StatusBadge({ status }: { status: InterviewStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border ${cfg.classes}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function RiskBadge({ probability }: { probability: number | null }) {
  if (!probability || probability === 0) return null

  const pct = Math.round(probability * 100)
  const cfg =
    probability > 0.7
      ? { label: 'High Risk',   classes: 'bg-red-500/10 text-red-400 border-red-500/20' }
      : probability > 0.4
      ? { label: 'Medium Risk', classes: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' }
      : { label: 'Low Risk',    classes: 'bg-green-500/10 text-green-400 border-green-500/20' }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${cfg.classes}`}>
      <ShieldAlert className="w-3 h-3" />
      {pct}% · {cfg.label}
    </span>
  )
}

function Avatar({ user }: { user: InterviewUser }) {
  return (
    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shrink-0 overflow-hidden">
      {user.profileImage ? (
        <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
      ) : (
        <span className="text-white font-semibold text-xs">
          {user.name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent = 'from-indigo-500 to-blue-600',
}: {
  icon: React.ElementType
  label: string
  value: number
  accent?: string
}) {
  return (
    <Card className="bg-slate-900/70 border-slate-700/50">
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-white mt-0.5">{value}</p>
        </div>
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center shrink-0`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </CardContent>
    </Card>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  })
}

function isToday(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  )
}

/* =====================================================
   PAGE
===================================================== */

const PAGE_SIZE = 10

export default function InterviewerDashboard() {
  const { accessToken, user } = useAuth()
  const router = useRouter()

  const [interviews, setInterviews] = useState<Interview[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  /* -------------------------
     Redirect non-interviewers
  -------------------------- */

  useEffect(() => {
    if (user && user.role === 'CANDIDATE') router.replace('/dashboard')
    if (user && user.role === 'ADMIN') router.replace('/dashboard/admin')
  }, [user, router])

  /* -------------------------
     Fetch
     API already filters by interviewerId server-side for non-ADMIN users
     No need for client-side filter
  -------------------------- */

  const fetchInterviews = useCallback(async () => {
    if (!accessToken) return

    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      })

      const res = await fetch(`/api/interviews?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || `Request failed (${res.status})`)
      }

      const json = await res.json()
      setInterviews(json.data ?? [])
      setPagination(json.pagination)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load interviews')
    } finally {
      setLoading(false)
    }
  }, [accessToken, page])

  useEffect(() => {
    fetchInterviews()
  }, [fetchInterviews])

  /* =====================================================
     RENDER STATES
  ===================================================== */

  if (user && (user.role === 'CANDIDATE' || user.role === 'ADMIN')) return null
  if (loading && interviews.length === 0) return <Loading text="Loading your interviews..." />
  if (error) return <ErrorComponent title="Unable to load interviews" message={error} onRetry={fetchInterviews} />

  /* =====================================================
     DERIVED STATS
  ===================================================== */

  const stats = {
    total:      interviews.length,
    scheduled:  interviews.filter((i) => i.status === 'SCHEDULED').length,
    inProgress: interviews.filter((i) => i.status === 'IN_PROGRESS').length,
    completed:  interviews.filter((i) => i.status === 'COMPLETED').length,
    highRisk:   interviews.filter((i) => (i.cheatingProbability ?? 0) > 0.7).length,
  }

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Welcome back, {user?.name?.split(' ')[0] ?? 'there'}!
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Manage your assigned interviews and monitor candidates
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard icon={Calendar}     label="Total"       value={stats.total}      accent="from-indigo-500 to-blue-600" />
        <StatCard icon={Clock}        label="Scheduled"   value={stats.scheduled}  accent="from-slate-500 to-slate-600" />
        <StatCard icon={Video}        label="Live"        value={stats.inProgress} accent="from-green-500 to-emerald-600" />
        <StatCard icon={CheckCircle2} label="Completed"   value={stats.completed}  accent="from-violet-500 to-purple-600" />
        <StatCard icon={ShieldAlert}  label="High Risk"   value={stats.highRisk}   accent="from-rose-500 to-red-600" />
      </div>

      {/* Section header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">Your Interviews</h2>
        {pagination && (
          <p className="text-xs text-slate-500">{pagination.total} total</p>
        )}
      </div>

      {/* Inline refresh */}
      {loading && interviews.length > 0 && (
        <Loading fullScreen={false} text="Refreshing..." />
      )}

      {/* Empty state */}
      {!loading && interviews.length === 0 && (
        <Card className="bg-slate-900/70 border-slate-700/50">
          <CardContent className="py-16 flex flex-col items-center text-center">
            <Calendar className="w-10 h-10 text-slate-600 mb-3" />
            <p className="text-slate-400 font-medium">No interviews assigned</p>
            <p className="text-slate-500 text-sm mt-1">
              Interviews assigned to you will appear here
            </p>
          </CardContent>
        </Card>
      )}

      {/* Interview list */}
      <div className="space-y-3">
        {interviews.map((interview) => {
          const candidate = interview.user_interview_candidateIdTouser
          const today = isToday(interview.startTime)
          const totalViolations = interview.violation?.length ?? 0
          const highSeverityViolations = interview.violation?.filter((v) => v.severity >= 4).length ?? 0

          return (
            <Card
              key={interview.id}
              className={`border transition-colors ${
                interview.status === 'IN_PROGRESS'
                  ? 'bg-green-500/5 border-green-500/30 hover:border-green-500/50'
                  : 'bg-slate-900/70 border-slate-700/50 hover:border-slate-600/50 hover:bg-slate-900'
              }`}
            >
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">

                  {/* Left */}
                  <div className="space-y-2 min-w-0 flex-1">

                    {/* Title + badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-white truncate">{interview.title}</h3>
                      <StatusBadge status={interview.status} />
                      {today && interview.status === 'SCHEDULED' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                          Today
                        </span>
                      )}
                      <RiskBadge probability={interview.cheatingProbability} />
                    </div>

                    {/* Meta row */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3 shrink-0" />
                        {interview.company.name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 shrink-0" />
                        {formatDate(interview.startTime)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 shrink-0" />
                        {formatTime(interview.startTime)} – {formatTime(interview.endTime)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Timer className="w-3 h-3 shrink-0" />
                        {interview.duration} min
                      </span>
                    </div>

                    {/* Candidate */}
                    <div className="flex items-center gap-1.5">
                      <Avatar user={candidate} />
                      <div>
                        <span className="text-xs text-slate-300 font-medium">{candidate.name}</span>
                        <span className="text-xs text-slate-500 ml-1.5">{candidate.email}</span>
                      </div>
                    </div>

                    {/* Violations summary */}
                    {totalViolations > 0 && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        <span className="text-red-400 font-medium">
                          {totalViolations} violation{totalViolations !== 1 ? 's' : ''} detected
                        </span>
                        {highSeverityViolations > 0 && (
                          <span className="text-slate-500">
                            · {highSeverityViolations} high severity
                          </span>
                        )}
                      </div>
                    )}

                    {/* Description */}
                    {interview.description && (
                      <p className="text-xs text-slate-500 line-clamp-1">{interview.description}</p>
                    )}
                  </div>

                  {/* Right — actions */}
                  <div className="flex flex-col gap-2 shrink-0 min-w-[100px]">
                    {interview.status === 'IN_PROGRESS' && (
                      <Link href={`/interview/${interview.id}/monitor`}>
                        <Button
                          size="sm"
                          className="w-full h-9 rounded-xl bg-green-600 hover:bg-green-500 text-white text-xs gap-1.5 shadow shadow-green-500/20 animate-pulse"
                        >
                          <Video className="w-3.5 h-3.5" />
                          Monitor
                        </Button>
                      </Link>
                    )}

                    {interview.status === 'SCHEDULED' && (
                      <Link href={`/interview/${interview.id}`}>
                        <Button
                          size="sm"
                          className="w-full h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs gap-1.5 shadow shadow-indigo-500/20"
                        >
                          <Video className="w-3.5 h-3.5" />
                          Start
                        </Button>
                      </Link>
                    )}

                    {interview.status === 'COMPLETED' && (
                      <Link href={`/interview/${interview.id}/report`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-9 rounded-xl border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700 hover:text-white text-xs gap-1.5"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Report
                        </Button>
                      </Link>
                    )}

                    <Link href={`/interview/${interview.id}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-9 rounded-xl border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700 hover:text-white text-xs gap-1.5"
                      >
                        <Info className="w-3.5 h-3.5" />
                        Details
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-slate-500">
            Page {pagination.page} of {pagination.pages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1 || loading}
              className="rounded-lg border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              <ChevronLeft className="w-4 h-4" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(p + 1, pagination.pages))}
              disabled={page === pagination.pages || loading}
              className="rounded-lg border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}