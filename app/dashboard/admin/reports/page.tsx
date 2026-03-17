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
  Search,
  ChevronLeft,
  ChevronRight,
  FileText,
  Star,
  Calendar,
  User,
  Building2,
  ArrowUpRight,
} from "lucide-react"

/* =====================================================
   TYPES — aligned with updated schema + reports route
===================================================== */

interface ReportUser {
  id: string
  name: string
  email: string
  profileImage: string | null
}

interface ReportInterview {
  id: string
  title: string
  status: string
  startTime: string
  endTime: string
  user_interview_candidateIdTouser: ReportUser
  user_interview_interviewerIdTouser: ReportUser | null
  company: { id: string; name: string; logo: string | null }
}

interface Report {
  id: string
  summary: string
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
  overallScore: number
  createdAt: string
  updatedAt: string
  interview: ReportInterview
}

interface Pagination {
  total: number
  page: number
  limit: number
  pages: number
}

/* =====================================================
   HELPERS
===================================================== */

function ScoreBadge({ score }: { score: number }) {
  const pct = Math.round((score / 100) * 100)

  const color =
    score >= 80 ? "text-green-400 border-green-500/30 bg-green-500/10" :
    score >= 60 ? "text-blue-400 border-blue-500/30 bg-blue-500/10" :
    score >= 40 ? "text-yellow-400 border-yellow-500/30 bg-yellow-500/10" :
                  "text-red-400 border-red-500/30 bg-red-500/10"

  const ring =
    score >= 80 ? "stroke-green-500" :
    score >= 60 ? "stroke-blue-500" :
    score >= 40 ? "stroke-yellow-500" :
                  "stroke-red-500"

  const r = 16
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-semibold ${color}`}>
      <svg width="28" height="28" viewBox="0 0 36 36" className="-rotate-90">
        <circle cx="18" cy="18" r={r} fill="none" stroke="currentColor" strokeOpacity={0.15} strokeWidth="3" />
        <circle
          cx="18" cy="18" r={r} fill="none"
          className={ring}
          strokeWidth="3"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      {score}<span className="text-xs font-normal opacity-60">/100</span>
    </div>
  )
}

function Avatar({ user }: { user: ReportUser }) {
  return (
    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shrink-0 overflow-hidden">
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

/* =====================================================
   PAGE
===================================================== */

const PAGE_SIZE = 20

export default function AdminReportsPage() {
  const { accessToken, user } = useAuth()
  const router = useRouter()

  const [reports, setReports] = useState<Report[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
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
     Fetch reports
  -------------------------- */

  const fetchReports = useCallback(async () => {
    if (!accessToken) return

    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      })

      const res = await fetch(`/api/reports?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || `Request failed (${res.status})`)
      }

      const json = await res.json()

      // Client-side search filter on interview title or candidate name
      const filtered: Report[] = debouncedSearch
        ? json.data.filter(
            (r: Report) =>
              r.interview.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
              r.interview.user_interview_candidateIdTouser.name
                .toLowerCase()
                .includes(debouncedSearch.toLowerCase())
          )
        : json.data

      setReports(filtered)
      setPagination(json.pagination)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch reports")
    } finally {
      setLoading(false)
    }
  }, [accessToken, page, debouncedSearch])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  /* =====================================================
     RENDER STATES
  ===================================================== */

  if (user?.role !== "ADMIN") return null
  if (loading) return <Loading text="Loading reports..." />
  if (error) return <ErrorComponent message={error} onRetry={fetchReports} />

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Reports</h1>
          {pagination && (
            <p className="text-sm text-slate-400 mt-0.5">
              {pagination.total} total report{pagination.total !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <Input
            placeholder="Search by interview or candidate..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-xl bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-indigo-500/30"
          />
        </div>
      </div>

      {/* Empty state */}
      {reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileText className="w-10 h-10 text-slate-600 mb-3" />
          <p className="text-slate-400 font-medium">No reports found</p>
          {debouncedSearch && (
            <p className="text-slate-500 text-sm mt-1">Try a different search term</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => {
            const candidate = r.interview.user_interview_candidateIdTouser
            const interviewer = r.interview.user_interview_interviewerIdTouser

            return (
              <Card
                key={r.id}
                className="bg-slate-900/70 border-slate-700/50 hover:border-slate-600/50 hover:bg-slate-900 transition-colors"
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">

                    {/* Left */}
                    <div className="space-y-2 min-w-0 flex-1">

                      {/* Interview title */}
                      <p className="font-semibold text-white truncate">
                        {r.interview.title}
                      </p>

                      {/* Company */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Building2 className="w-3 h-3 shrink-0" />
                        <span>{r.interview.company.name}</span>
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

                      {/* Summary preview */}
                      {r.summary && (
                        <p className="text-xs text-slate-500 line-clamp-2">
                          {r.summary}
                        </p>
                      )}

                      {/* Stats row */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          {r.strengths.length} strength{r.strengths.length !== 1 ? "s" : ""}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(r.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Right — score + action */}
                    <div className="flex flex-col items-end gap-3 shrink-0">
                      <ScoreBadge score={r.overallScore} />

                      <Link href={`/interview/${r.interview.id}/report`}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 rounded-xl border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700 hover:text-white text-xs gap-1.5"
                        >
                          View Report
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
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