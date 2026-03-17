"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

import Loading from "@/components/common/loading"
import ErrorComponent from "@/components/common/error"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Calendar,
  Clock,
  Video,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  User,
  Building2,
  Timer,
  Trash2,
  FileText,
  MonitorPlay,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react"

/* =====================================================
   TYPES — aligned with updated schema + interviews route
===================================================== */

type InterviewStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"

interface InterviewUser {
  id: string
  name: string
  email: string
  profileImage: string | null
}

interface InterviewCompany {
  id: string
  name: string
  logo: string | null
}

interface Interview {
  id: string
  title: string
  description: string | null
  startTime: string
  endTime: string
  duration: number
  status: InterviewStatus
  createdAt: string
  user_interview_candidateIdTouser: InterviewUser
  user_interview_interviewerIdTouser: InterviewUser | null
  company: InterviewCompany
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

const STATUS_CONFIG: Record<
  InterviewStatus,
  { label: string; classes: string; dot: string }
> = {
  SCHEDULED:   { label: "Scheduled",   classes: "bg-blue-500/10 text-blue-400 border-blue-500/20",   dot: "bg-blue-400" },
  IN_PROGRESS: { label: "In Progress", classes: "bg-green-500/10 text-green-400 border-green-500/20", dot: "bg-green-400" },
  COMPLETED:   { label: "Completed",   classes: "bg-slate-500/10 text-slate-400 border-slate-500/20", dot: "bg-slate-400" },
  CANCELLED:   { label: "Cancelled",   classes: "bg-red-500/10 text-red-400 border-red-500/20",       dot: "bg-red-400" },
}

const STATUS_FILTERS: { value: InterviewStatus | "ALL"; label: string }[] = [
  { value: "ALL",         label: "All" },
  { value: "SCHEDULED",   label: "Scheduled" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED",   label: "Completed" },
  { value: "CANCELLED",   label: "Cancelled" },
]

/* =====================================================
   HELPERS
===================================================== */

function StatusBadge({ status }: { status: InterviewStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border ${cfg.classes}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric",
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit", minute: "2-digit",
  })
}

/* =====================================================
   PAGE
===================================================== */

const PAGE_SIZE = 20

export default function AdminInterviewsPage() {
  const { accessToken, user } = useAuth()
  const router = useRouter()

  const [interviews, setInterviews] = useState<Interview[]>([])
  const [pagination,  setPagination]  = useState<Pagination | null>(null)
  const [deletingId,  setDeletingId]   = useState<string | null>(null)
  const [updatingId,  setUpdatingId]   = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<InterviewStatus | "ALL">("ALL")
  const [page, setPage] = useState(1)

  /* -------------------------
     Redirect non-admins
  -------------------------- */

  useEffect(() => {
    if (user && user.role !== "ADMIN") router.replace("/dashboard")
  }, [user, router])

  /* -------------------------
     Debounce search
  -------------------------- */

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  /* -------------------------
     Reset page on filter change
  -------------------------- */

  useEffect(() => {
    setPage(1)
  }, [statusFilter])

  /* -------------------------
     Fetch interviews
  -------------------------- */

  async function handleDelete(id: string) {
    if (!confirm("Delete this interview? This cannot be undone.")) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/interviews/${id}`, {
        method:  "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw new Error("Failed to delete")
      fetchInterviews()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete")
    } finally {
      setDeletingId(null)
    }
  }

  async function handleStatusUpdate(id: string, status: string) {
    setUpdatingId(id)
    try {
      const res = await fetch(`/api/interviews/${id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body:    JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error("Failed to update")
      fetchInterviews()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update status")
    } finally {
      setUpdatingId(null)
    }
  }

  const fetchInterviews = useCallback(async () => {
    if (!accessToken) return

    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      })

      const res = await fetch(`/api/interviews?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || `Request failed (${res.status})`)
      }

      const json = await res.json()

      // Filter by status client-side (API doesn't expose status filter yet)
      const filtered: Interview[] =
        statusFilter === "ALL"
          ? json.data
          : json.data.filter((i: Interview) => i.status === statusFilter)

      setInterviews(filtered)
      setPagination(json.pagination)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch interviews")
    } finally {
      setLoading(false)
    }
  }, [accessToken, page, debouncedSearch, statusFilter])

  useEffect(() => {
    fetchInterviews()
  }, [fetchInterviews])

  if (user && user.role !== "ADMIN") return null
  if (loading) return <Loading text="Loading interviews..." />
  if (error) return <ErrorComponent message={error} onRetry={fetchInterviews} />

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">All Interviews</h1>
          {pagination && (
            <p className="text-sm text-slate-400 mt-0.5">
              {pagination.total} total interview{pagination.total !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        <Link href="/dashboard/admin/new-interview">
          <Button className="h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium shadow-lg shadow-indigo-500/20 gap-2">
            <Plus className="w-4 h-4" />
            Schedule Interview
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <Input
            placeholder="Search interviews..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-xl bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-indigo-500/30"
          />
        </div>

        {/* Status filter tabs */}
        <div className="flex items-center gap-1 bg-slate-800/60 border border-slate-700/50 rounded-xl p-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === f.value
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {interviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Video className="w-10 h-10 text-slate-600 mb-3" />
          <p className="text-slate-400 font-medium">No interviews found</p>
          {(debouncedSearch || statusFilter !== "ALL") && (
            <p className="text-slate-500 text-sm mt-1">Try adjusting your filters</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {interviews.map((interview) => {
            const candidate = interview.user_interview_candidateIdTouser
            const interviewer = interview.user_interview_interviewerIdTouser

            return (
              <Card
                key={interview.id}
                className="bg-slate-900/70 border-slate-700/50 hover:border-slate-600/50 hover:bg-slate-900 transition-colors"
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">

                    {/* Left — info */}
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-white truncate">{interview.title}</h3>
                        <StatusBadge status={interview.status} />
                      </div>

                      {/* Company */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Building2 className="w-3 h-3 shrink-0" />
                        <span>{interview.company.name}</span>
                      </div>

                      {/* Candidate + Interviewer */}
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <Avatar user={candidate} />
                          <div>
                            <p className="text-xs text-slate-300 font-medium">{candidate.name}</p>
                            <p className="text-xs text-slate-500">Candidate</p>
                          </div>
                        </div>

                        {interviewer && (
                          <div className="flex items-center gap-1.5">
                            <Avatar user={interviewer} />
                            <div>
                              <p className="text-xs text-slate-300 font-medium">{interviewer.name}</p>
                              <p className="text-xs text-slate-500">Interviewer</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Time info */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(interview.startTime)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(interview.startTime)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Timer className="w-3 h-3" />
                          {interview.duration} min
                        </span>
                      </div>
                    </div>

                    {/* Right — actions */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      {/* Monitor */}
                      {interview.status === "IN_PROGRESS" && (
                        <Link href={`/interview/${interview.id}/monitor`}>
                          <Button size="sm" className="h-8 rounded-xl bg-green-600 hover:bg-green-500 text-white text-xs gap-1.5">
                            <MonitorPlay className="w-3.5 h-3.5" />
                            Monitor
                          </Button>
                        </Link>
                      )}
                      {/* Report */}
                      {interview.status === "COMPLETED" && (
                        <Link href={`/interview/${interview.id}/report`}>
                          <Button size="sm" variant="outline" className="h-8 rounded-xl border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700 text-xs gap-1.5">
                            <FileText className="w-3.5 h-3.5" />
                            Report
                          </Button>
                        </Link>
                      )}
                      {/* Start */}
                      {interview.status === "SCHEDULED" && (
                        <Button size="sm" onClick={() => handleStatusUpdate(interview.id, "IN_PROGRESS")}
                          disabled={updatingId === interview.id}
                          className="h-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs gap-1.5">
                          {updatingId === interview.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <CheckCircle2 className="w-3.5 h-3.5" />
                          }
                          Start
                        </Button>
                      )}
                      {/* Cancel */}
                      {(interview.status === "SCHEDULED" || interview.status === "IN_PROGRESS") && (
                        <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(interview.id, "CANCELLED")}
                          disabled={updatingId === interview.id}
                          className="h-8 rounded-xl border-slate-700 bg-slate-800/60 text-slate-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 text-xs gap-1.5">
                          <XCircle className="w-3.5 h-3.5" />
                          Cancel
                        </Button>
                      )}
                      {/* Delete */}
                      <button onClick={() => handleDelete(interview.id)}
                        disabled={deletingId === interview.id}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50">
                        {deletingId === interview.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />
                        }
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

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