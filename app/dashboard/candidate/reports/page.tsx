"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Loading from "@/components/common/loading"

import {
  FileText, Search, Calendar,
  TrendingUp, Download, ChevronRight,
  Award, BarChart2, CheckCircle2,
} from "lucide-react"

/* =====================================================
   TYPES
===================================================== */

interface Report {
  id:           string
  overallScore: number
  summary:      string
  strengths:    string[]
  weaknesses:   string[]
  createdAt:    string
  interview: {
    id:        string
    title:     string
    startTime: string
    duration:  number
    company:   { name: string; logo: string | null }
  }
}

/* =====================================================
   SCORE RING
===================================================== */

function ScoreRing({ score }: { score: number }) {
  const r     = 22
  const circ  = 2 * Math.PI * r
  const fill  = (score / 100) * circ
  const color =
    score >= 80 ? "#4ade80" :
    score >= 60 ? "#818cf8" :
    score >= 40 ? "#facc15" : "#f87171"
  const label =
    score >= 80 ? "Excellent" :
    score >= 60 ? "Good"      :
    score >= 40 ? "Average"   : "Needs Work"

  return (
    <div className="flex flex-col items-center gap-1 shrink-0">
      <svg width="56" height="56" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={r} fill="none" stroke="#1e293b" strokeWidth="4.5" />
        <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="4.5"
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 28 28)" />
        <text x="28" y="32" textAnchor="middle" fontSize="12" fontWeight="700" fill={color}>
          {score}
        </text>
      </svg>
      <span style={{ color }} className="text-xs font-medium">{label}</span>
    </div>
  )
}

/* =====================================================
   HELPERS
===================================================== */

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  })
}

function scoreColor(score: number) {
  if (score >= 80) return "text-green-400"
  if (score >= 60) return "text-indigo-400"
  if (score >= 40) return "text-yellow-400"
  return "text-red-400"
}

/* =====================================================
   PAGE
===================================================== */

export default function CandidateReportsPage() {
  const { accessToken } = useAuth()

  const [reports,  setReports]  = useState<Report[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [search,   setSearch]   = useState("")
  const [page,     setPage]     = useState(1)
  const [total,    setTotal]    = useState(0)
  const LIMIT = 8

  /* -------------------------
     Fetch reports
  -------------------------- */

  const fetchReports = useCallback(async () => {
    if (!accessToken) return
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams({
        page:  String(page),
        limit: String(LIMIT),
      })
      const res  = await fetch(`/api/reports?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to load")
      setReports(json.data ?? [])
      setTotal(json.pagination?.total ?? 0)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load reports")
    } finally {
      setLoading(false)
    }
  }, [accessToken, page])

  useEffect(() => { fetchReports() }, [fetchReports])
  useEffect(() => { setPage(1) }, [search])

  if (loading) return <Loading text="Loading your reports..." />

  /* -------------------------
     Derived stats
  -------------------------- */

  const scores    = reports.map((r) => r.overallScore)
  const avgScore  = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
  const bestScore = scores.length ? Math.max(...scores) : null
  const latest    = reports[0] ?? null

  const filtered = reports.filter((r) =>
    r.interview.title.toLowerCase().includes(search.toLowerCase()) ||
    r.interview.company.name.toLowerCase().includes(search.toLowerCase())
  )

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-6 px-4">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">My Reports</h1>
        <p className="text-slate-400 text-sm mt-1">
          {total} report{total !== 1 ? "s" : ""} from your interviews
        </p>
      </div>

      {/* Stats row */}
      {reports.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card className="bg-slate-900/80 border-slate-700/50 rounded-2xl">
            <CardContent className="p-4 flex items-center gap-3">
              <FileText className="w-5 h-5 text-indigo-400 shrink-0" />
              <div>
                <p className="text-white font-bold text-lg leading-none">{total}</p>
                <p className="text-slate-500 text-xs mt-0.5">Total reports</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/80 border-slate-700/50 rounded-2xl">
            <CardContent className="p-4 flex items-center gap-3">
              <BarChart2 className="w-5 h-5 text-yellow-400 shrink-0" />
              <div>
                <p className="text-white font-bold text-lg leading-none">
                  {avgScore != null ? avgScore : "—"}
                </p>
                <p className="text-slate-500 text-xs mt-0.5">Average score</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/80 border-slate-700/50 rounded-2xl col-span-2 sm:col-span-1">
            <CardContent className="p-4 flex items-center gap-3">
              <Award className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <p className="text-white font-bold text-lg leading-none">
                  {bestScore != null ? bestScore : "—"}
                </p>
                <p className="text-slate-500 text-xs mt-0.5">Best score</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Latest report highlight */}
      {latest && (
        <Card className="bg-indigo-900/20 border-indigo-500/20 rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-start gap-5 flex-wrap">
              <ScoreRing score={latest.overallScore} />
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-indigo-400 font-medium uppercase tracking-wider">
                    Latest report
                  </span>
                </div>
                <p className="text-white font-bold text-lg leading-tight truncate">
                  {latest.interview.title}
                </p>
                <p className="text-slate-400 text-sm">{latest.interview.company.name}</p>
                <p className="text-slate-400 text-xs leading-relaxed line-clamp-2">
                  {latest.summary}
                </p>
                <div className="flex items-center gap-4 pt-1">
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-green-400">
                      {latest.strengths.length} strength{latest.strengths.length !== 1 ? "s" : ""}
                    </span>
                    <span className="text-red-400">
                      {latest.weaknesses.length} weakness{latest.weaknesses.length !== 1 ? "es" : ""}
                    </span>
                  </div>
                  <Link href={`/interview/${latest.interview.id}/report`} className="ml-auto">
                    <Button size="sm" className="h-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      View Full Report
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      {reports.length > 3 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Search by interview title or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 pl-9 rounded-xl bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500 text-sm"
          />
        </div>
      )}

      {/* Error */}
      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <Card className="bg-slate-900/80 border-slate-700/50 rounded-2xl">
          <CardContent className="py-16 text-center space-y-3">
            <FileText className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-slate-400 text-sm font-medium">
              {search ? "No reports match your search" : "No reports yet"}
            </p>
            {!search && (
              <p className="text-slate-500 text-xs">
                Reports appear here after you complete an interview
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reports list */}
      <div className="space-y-3">
        {filtered.map((report) => (
          <Card
            key={report.id}
            className="bg-slate-900/80 border-slate-700/50 rounded-2xl hover:border-slate-600/50 transition-colors"
          >
            <CardContent className="p-5">
              <div className="flex items-center gap-4 flex-wrap">

                {/* Score ring */}
                <div className="shrink-0">
                  <div className="relative">
                    <svg width="48" height="48" viewBox="0 0 48 48">
                      <circle cx="24" cy="24" r="18" fill="none" stroke="#1e293b" strokeWidth="4" />
                      <circle cx="24" cy="24" r="18" fill="none"
                        stroke={
                          report.overallScore >= 80 ? "#4ade80" :
                          report.overallScore >= 60 ? "#818cf8" :
                          report.overallScore >= 40 ? "#facc15" : "#f87171"
                        }
                        strokeWidth="4"
                        strokeDasharray={`${(report.overallScore / 100) * 2 * Math.PI * 18} ${2 * Math.PI * 18}`}
                        strokeLinecap="round"
                        transform="rotate(-90 24 24)"
                      />
                      <text x="24" y="28" textAnchor="middle" fontSize="11" fontWeight="700"
                        fill={
                          report.overallScore >= 80 ? "#4ade80" :
                          report.overallScore >= 60 ? "#818cf8" :
                          report.overallScore >= 40 ? "#facc15" : "#f87171"
                        }>
                        {report.overallScore}
                      </text>
                    </svg>
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold truncate">{report.interview.title}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{report.interview.company.name}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(report.interview.startTime)}
                    </span>
                    <span>{report.interview.duration}m</span>
                    <span className={`font-semibold ${scoreColor(report.overallScore)}`}>
                      {report.overallScore}/100
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs">
                    <span className="text-green-400">
                      <CheckCircle2 className="w-3 h-3 inline mr-0.5" />
                      {report.strengths.length} strength{report.strengths.length !== 1 ? "s" : ""}
                    </span>
                    <span className="text-slate-500 line-clamp-1 flex-1">{report.summary}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Link href={`/interview/${report.interview.id}/report`}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-xl border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700 hover:text-white text-xs gap-1.5"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                      View
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {total > LIMIT && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-slate-500 text-xs">
            Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="h-9 rounded-xl border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700 text-xs">
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page * LIMIT >= total}
              onClick={() => setPage((p) => p + 1)}
              className="h-9 rounded-xl border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700 text-xs">
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}