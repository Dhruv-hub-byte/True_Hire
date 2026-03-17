"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

import {
  ArrowLeft, Trophy, TrendingUp, TrendingDown,
  Lightbulb, CheckCircle2, XCircle, Star,
  Download, Loader2,
} from "lucide-react"

import { exportViaBrowserPrint, exportViaJsPDF } from "@/lib/pdf-export"

import Loading from "@/components/common/loading"
import ErrorComponent from "@/components/common/error"

/* =====================================================
   TYPES — aligned with schema report model
===================================================== */

interface Report {
  id: string
  summary: string
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
  overallScore: number  // 0–100 float (schema: Float)
  createdAt: string
  updatedAt: string
}

/* =====================================================
   HELPERS
===================================================== */

function getScoreConfig(score: number): {
  label: string
  color: string
  ring: string
  bg: string
} {
  if (score >= 80) return { label: "Excellent",    color: "text-green-400",  ring: "stroke-green-500",  bg: "bg-green-500/10 border-green-500/20" }
  if (score >= 65) return { label: "Good",         color: "text-blue-400",   ring: "stroke-blue-500",   bg: "bg-blue-500/10 border-blue-500/20" }
  if (score >= 50) return { label: "Average",      color: "text-yellow-400", ring: "stroke-yellow-500", bg: "bg-yellow-500/10 border-yellow-500/20" }
  if (score >= 35) return { label: "Below Average",color: "text-orange-400", ring: "stroke-orange-500", bg: "bg-orange-500/10 border-orange-500/20" }
  return               { label: "Needs Work",    color: "text-red-400",    ring: "stroke-red-500",    bg: "bg-red-500/10 border-red-500/20" }
}

function ScoreRing({ score }: { score: number }) {
  const cfg = getScoreConfig(score)
  const r = 54
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ

  return (
    <div className="relative flex items-center justify-center">
      <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" stroke="currentColor"
          strokeOpacity={0.1} strokeWidth="10" className="text-slate-600" />
        <circle cx="70" cy="70" r={r} fill="none"
          className={cfg.ring}
          strokeWidth="10"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-3xl font-bold ${cfg.color}`}>{Math.round(score)}</span>
        <span className="text-slate-500 text-xs">/ 100</span>
      </div>
    </div>
  )
}

/* =====================================================
   SECTION
===================================================== */

interface SectionProps {
  title: string
  items: string[]
  icon: React.ElementType
  itemClass: string
  iconClass: string
  itemIcon: React.ElementType
}

function Section({ title, items, icon: Icon, itemClass, iconClass, itemIcon: ItemIcon }: SectionProps) {
  return (
    <Card className="bg-slate-900/70 border-slate-700/50 rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-sm font-semibold flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconClass}`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No data available</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item, i) => (
              <li key={i} className={`flex items-start gap-2 px-3 py-2.5 rounded-xl text-sm border ${itemClass}`}>
                <ItemIcon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

/* =====================================================
   PAGE
===================================================== */

export default function InterviewReportPage() {
  const { id } = useParams()
  const router = useRouter()
  const { accessToken } = useAuth()

  const [report,    setReport]    = useState<Report | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    setExporting(true)
    try {
      await exportViaJsPDF("report-content", `interview-report-${id}.pdf`)
    } catch {
      // Fallback to browser print if jsPDF not installed
      exportViaBrowserPrint()
    } finally {
      setExporting(false)
    }
  }

  /* =====================================================
     FETCH REPORT
     Correct endpoint: /api/interviews/[id]/report
  ===================================================== */

  const fetchReport = useCallback(async () => {
    if (!accessToken) return

    try {
      setLoading(true)
      setError(null)

      const res = await fetch(`/api/interviews/${id}/report`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || `Request failed (${res.status})`)
      }

      const json = await res.json()
      setReport(json.data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load report")
    } finally {
      setLoading(false)
    }
  }, [id, accessToken])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  /* =====================================================
     RENDER STATES
  ===================================================== */

  if (loading) return <Loading text="Loading interview report..." />

  if (error || !report) {
    return (
      <ErrorComponent
        title="Unable to load report"
        message={error || "Report not found"}
        onRetry={fetchReport}
      />
    )
  }

  const scoreCfg = getScoreConfig(report.overallScore)

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="min-h-screen bg-slate-950 py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-6" id="report-content">

        {/* Header row */}
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="h-9 rounded-xl border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700 hover:text-white gap-1.5 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <Button
            onClick={handleExport}
            disabled={exporting}
            className="h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white gap-2 text-sm print:hidden"
          >
            {exporting
              ? <><Loader2 className="w-4 h-4 animate-spin" />Exporting...</>
              : <><Download className="w-4 h-4" />Download PDF</>
            }
          </Button>
        </div>

        {/* Score card */}
        <Card className="bg-slate-900/80 border-slate-700/50 rounded-2xl">
          <CardContent className="py-10">
            <div className="flex flex-col sm:flex-row items-center gap-8">

              {/* Ring */}
              <div className="flex flex-col items-center gap-3 shrink-0">
                <ScoreRing score={report.overallScore} />
                <span className={`text-sm font-semibold px-3 py-1 rounded-full border ${scoreCfg.bg} ${scoreCfg.color}`}>
                  {scoreCfg.label}
                </span>
              </div>

              {/* Summary */}
              <div className="flex-1 text-center sm:text-left space-y-3">
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  <h2 className="text-xl font-bold text-white">Interview Report</h2>
                </div>

                <p className="text-slate-400 text-sm leading-relaxed">
                  {report.summary}
                </p>

                <div className="flex items-center gap-4 flex-wrap justify-center sm:justify-start text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-green-400" />
                    {report.strengths.length} strength{report.strengths.length !== 1 ? "s" : ""}
                  </span>
                  <span className="flex items-center gap-1">
                    <XCircle className="w-3 h-3 text-red-400" />
                    {report.weaknesses.length} weakness{report.weaknesses.length !== 1 ? "es" : ""}
                  </span>
                  <span className="flex items-center gap-1">
                    <Lightbulb className="w-3 h-3 text-blue-400" />
                    {report.recommendations.length} recommendation{report.recommendations.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <p className="text-xs text-slate-600">
                  Generated {new Date(report.createdAt).toLocaleDateString(undefined, {
                    month: "long", day: "numeric", year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sections */}
        <div className="grid md:grid-cols-3 gap-4">
          <Section
            title="Strengths"
            items={report.strengths}
            icon={TrendingUp}
            iconClass="bg-green-500/10 text-green-400"
            itemClass="bg-green-500/5 border-green-500/20 text-green-300"
            itemIcon={CheckCircle2}
          />
          <Section
            title="Weaknesses"
            items={report.weaknesses}
            icon={TrendingDown}
            iconClass="bg-red-500/10 text-red-400"
            itemClass="bg-red-500/5 border-red-500/20 text-red-300"
            itemIcon={XCircle}
          />
          <Section
            title="Recommendations"
            items={report.recommendations}
            icon={Lightbulb}
            iconClass="bg-blue-500/10 text-blue-400"
            itemClass="bg-blue-500/5 border-blue-500/20 text-blue-300"
            itemIcon={Lightbulb}
          />
        </div>
      </div>
    </div>
  )
}