"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Loading from "@/components/common/loading"

import {
  Calendar, Clock, CheckCircle2, XCircle,
  AlertCircle, FileText, BarChart2, Award,
  TrendingUp, Play, Bell, ShieldAlert,
  AlertTriangle, Info, ChevronRight,
} from "lucide-react"

/* =====================================================
   TYPES
===================================================== */

type InterviewStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"

interface Interview {
  id:        string
  title:     string
  status:    InterviewStatus
  startTime: string
  endTime:   string
  duration:  number
  company:   { name: string; logo: string | null }
  user_interview_interviewerIdTouser: { name: string } | null
  report:    { overallScore: number } | null
  violation: { severity: number }[]
}

type NotificationType = "info" | "warning" | "success" | "error"

interface Notification {
  id:        string
  type:      NotificationType
  title:     string
  message:   string
  time:      Date
  read:      boolean
  link?:     string
}

/* =====================================================
   HELPERS
===================================================== */

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit",
  })
}

function isToday(iso: string) {
  const d = new Date(iso), n = new Date()
  return d.getDate() === n.getDate() &&
    d.getMonth() === n.getMonth() &&
    d.getFullYear() === n.getFullYear()
}

function isTomorrow(iso: string) {
  const d = new Date(iso)
  const t = new Date()
  t.setDate(t.getDate() + 1)
  return d.getDate() === t.getDate() &&
    d.getMonth() === t.getMonth() &&
    d.getFullYear() === t.getFullYear()
}

function scoreColor(score: number) {
  if (score >= 80) return "text-green-400"
  if (score >= 60) return "text-indigo-400"
  if (score >= 40) return "text-yellow-400"
  return "text-red-400"
}

/* =====================================================
   COUNTDOWN CARD
===================================================== */

function CountdownCard({ interview }: { interview: Interview }) {
  const [timeLeft, setTimeLeft] = useState("")
  const [urgent,   setUrgent]   = useState(false)
  const [started,  setStarted]  = useState(false)

  useEffect(() => {
    function update() {
      const diff = new Date(interview.startTime).getTime() - Date.now()

      if (diff <= 0) {
        setStarted(true)
        setTimeLeft("Now")
        return
      }

      const days  = Math.floor(diff / 86400000)
      const hours = Math.floor((diff % 86400000) / 3600000)
      const mins  = Math.floor((diff % 3600000) / 60000)
      const secs  = Math.floor((diff % 60000) / 1000)

      setUrgent(diff < 60 * 60 * 1000) // urgent if < 1 hour

      if (days > 0)       setTimeLeft(`${days}d ${hours}h ${mins}m`)
      else if (hours > 0) setTimeLeft(`${hours}h ${mins}m ${secs}s`)
      else                setTimeLeft(`${mins}m ${secs}s`)
    }

    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [interview.startTime])

  return (
    <Card className={`rounded-2xl border overflow-hidden ${
      started
        ? "bg-green-900/20 border-green-500/30"
        : urgent
        ? "bg-red-900/20 border-red-500/30"
        : "bg-indigo-900/20 border-indigo-500/30"
    }`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">

          {/* Left info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {started
                ? <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/20 text-green-400 border border-green-500/30 text-xs font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    Interview is live
                  </span>
                : isToday(interview.startTime)
                ? <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-medium">
                    Today
                  </span>
                : isTomorrow(interview.startTime)
                ? <span className="px-2.5 py-1 rounded-lg bg-slate-700 text-slate-300 border border-slate-600 text-xs font-medium">
                    Tomorrow
                  </span>
                : null
              }
            </div>
            <h3 className="text-white font-bold text-lg leading-tight">{interview.title}</h3>
            <p className="text-slate-400 text-sm">{interview.company.name}</p>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(interview.startTime)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTime(interview.startTime)}
              </span>
              <span>{interview.duration}m</span>
            </div>
          </div>

          {/* Right — countdown + action */}
          <div className="flex flex-col items-end gap-3">
            {/* Big countdown */}
            <div className="text-right">
              <p className="text-xs text-slate-500 mb-0.5">
                {started ? "In progress" : "Starts in"}
              </p>
              <p className={`font-mono font-bold text-2xl ${
                started ? "text-green-400" :
                urgent  ? "text-red-400 animate-pulse" :
                          "text-white"
              }`}>
                {timeLeft}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <Link href={`/interview/${interview.id}/prepare`}>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-xl border-slate-600 bg-slate-800/60 text-slate-300 hover:bg-slate-700 text-xs"
                >
                  Prepare
                </Button>
              </Link>
              {started && (
                <Link href={`/interview/${interview.id}`}>
                  <Button
                    size="sm"
                    className="h-8 rounded-xl bg-green-600 hover:bg-green-500 text-white text-xs gap-1.5 animate-pulse"
                  >
                    <Play className="w-3 h-3 fill-white" />
                    Join Now
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/* =====================================================
   NOTIFICATION ICON
===================================================== */

function NotifIcon({ type }: { type: NotificationType }) {
  const config = {
    info:    { icon: Info,          color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
    warning: { icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
    success: { icon: CheckCircle2,  color: "text-green-400",  bg: "bg-green-500/10 border-green-500/20"  },
    error:   { icon: ShieldAlert,   color: "text-red-400",    bg: "bg-red-500/10 border-red-500/20"      },
  }[type]

  return (
    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${config.bg}`}>
      <config.icon className={`w-4 h-4 ${config.color}`} />
    </div>
  )
}

/* =====================================================
   SCORE RING
===================================================== */

function ScoreRing({ score }: { score: number }) {
  const r    = 16
  const circ = 2 * Math.PI * r
  const fill = (score / 100) * circ
  const color = score >= 80 ? "#4ade80" : score >= 60 ? "#818cf8" : score >= 40 ? "#facc15" : "#f87171"
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" className="shrink-0">
      <circle cx="22" cy="22" r={r} fill="none" stroke="#1e293b" strokeWidth="4" />
      <circle cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 22 22)" />
      <text x="22" y="26" textAnchor="middle" fontSize="10" fontWeight="600" fill={color}>
        {score}
      </text>
    </svg>
  )
}

/* =====================================================
   PAGE
===================================================== */

export default function CandidateDashboard() {
  const { accessToken, user } = useAuth()

  const [interviews,     setInterviews]     = useState<Interview[]>([])
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState<string | null>(null)
  const [tab,            setTab]            = useState<"upcoming" | "history">("upcoming")
  const [page,           setPage]           = useState(1)
  const [total,          setTotal]          = useState(0)
  const [notifications,  setNotifications]  = useState<Notification[]>([])
  const [unreadCount,    setUnreadCount]    = useState(0)
  const [showNotif,      setShowNotif]      = useState(false)
  const LIMIT = 8

  /* -------------------------
     Fetch interviews
  -------------------------- */

  const fetchInterviews = useCallback(async () => {
    if (!accessToken) return
    try {
      setLoading(true)
      const res  = await fetch(`/api/interviews?page=${page}&limit=${LIMIT}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to load")
      setInterviews(json.data ?? [])
      setTotal(json.pagination?.total ?? 0)
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [accessToken, page])

  useEffect(() => { fetchInterviews() }, [fetchInterviews])

  /* -------------------------
     Generate smart notifications
     from interview data
  -------------------------- */

  useEffect(() => {
    if (interviews.length === 0) return

    const notifs: Notification[] = []
    const now = Date.now()

    interviews.forEach((iv) => {
      const startMs  = new Date(iv.startTime).getTime()
      const diffMins = (startMs - now) / 60000

      // Interview in < 30 minutes
      if (iv.status === "SCHEDULED" && diffMins > 0 && diffMins <= 30) {
        notifs.push({
          id:      `soon-${iv.id}`,
          type:    "warning",
          title:   "Interview starting soon",
          message: `"${iv.title}" starts in ${Math.round(diffMins)} minutes`,
          time:    new Date(),
          read:    false,
          link:    `/interview/${iv.id}/prepare`,
        })
      }

      // Interview happening now (in progress)
      if (iv.status === "IN_PROGRESS") {
        notifs.push({
          id:      `live-${iv.id}`,
          type:    "success",
          title:   "Interview is live",
          message: `"${iv.title}" is currently in progress — join now`,
          time:    new Date(),
          read:    false,
          link:    `/interview/${iv.id}`,
        })
      }

      // Report ready for completed interview
      if (iv.status === "COMPLETED" && iv.report) {
        notifs.push({
          id:      `report-${iv.id}`,
          type:    "info",
          title:   "Report ready",
          message: `Your report for "${iv.title}" is ready — score: ${iv.report.overallScore}/100`,
          time:    new Date(iv.endTime),
          read:    false,
          link:    `/interview/${iv.id}/report`,
        })
      }

      // High violations warning
      const highViolations = (iv.violation ?? []).filter((v) => v.severity >= 4).length
      if (highViolations > 0 && iv.status === "COMPLETED") {
        notifs.push({
          id:      `viol-${iv.id}`,
          type:    "error",
          title:   "Violations detected",
          message: `${highViolations} high-severity violation${highViolations !== 1 ? "s" : ""} were recorded in "${iv.title}"`,
          time:    new Date(iv.endTime),
          read:    false,
          link:    `/interview/${iv.id}/report`,
        })
      }
    })

    // Sort newest first
    notifs.sort((a, b) => b.time.getTime() - a.time.getTime())

    setNotifications(notifs.slice(0, 10))
    setUnreadCount(notifs.filter((n) => !n.read).length)
  }, [interviews])

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  function markRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => n.id === id ? { ...n, read: true } : n)
    )
    setUnreadCount((c) => Math.max(0, c - 1))
  }

  if (loading) return <Loading text="Loading your dashboard..." />
  if (error)   return <div className="max-w-4xl mx-auto py-6 px-4"><p className="text-red-400 text-sm">{error}</p></div>

  const upcoming  = interviews.filter((i) => i.status === "SCHEDULED" || i.status === "IN_PROGRESS")
  const history   = interviews.filter((i) => i.status === "COMPLETED"  || i.status === "CANCELLED")
  const completed = interviews.filter((i) => i.status === "COMPLETED")
  const scores    = completed.filter((i) => i.report).map((i) => i.report!.overallScore)
  const avgScore  = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
  const bestScore = scores.length ? Math.max(...scores) : null

  // Next upcoming interview (soonest)
  const nextInterview = upcoming
    .filter((i) => i.status === "SCHEDULED" || i.status === "IN_PROGRESS")
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0]

  return (
    <div className="space-y-5 max-w-4xl mx-auto py-6 px-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Welcome back, {user?.name?.split(" ")[0]}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {upcoming.length > 0
              ? `You have ${upcoming.length} upcoming interview${upcoming.length !== 1 ? "s" : ""}`
              : "No upcoming interviews"
            }
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Notification bell */}
          <div className="relative">
            <button
              onClick={() => { setShowNotif((v) => !v); if (!showNotif) markAllRead() }}
              className="relative w-9 h-9 rounded-xl flex items-center justify-center border border-slate-700 bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notification dropdown */}
            {showNotif && (
              <div className="absolute right-0 top-11 w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                  <span className="text-white text-sm font-semibold">Notifications</span>
                  <button
                    onClick={markAllRead}
                    className="text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    Mark all read
                  </button>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-800">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center">
                      <Bell className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                      <p className="text-slate-500 text-xs">No notifications</p>
                    </div>
                  ) : notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`flex items-start gap-3 px-4 py-3 hover:bg-slate-800/60 transition-colors cursor-pointer ${
                        !n.read ? "bg-slate-800/30" : ""
                      }`}
                      onClick={() => {
                        markRead(n.id)
                        setShowNotif(false)
                        if (n.link) window.location.href = n.link
                      }}
                    >
                      <NotifIcon type={n.type} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-white text-xs font-medium truncate">{n.title}</p>
                          {!n.read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                          )}
                        </div>
                        <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{n.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Link href="/dashboard/profile">
            <Button variant="outline" size="sm" className="h-9 rounded-xl border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700 hover:text-white text-xs">
              Profile
            </Button>
          </Link>
          <Link href="/dashboard/preparation">
            <Button size="sm" className="h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs">
              Tips
            </Button>
          </Link>
        </div>
      </div>

      {/* ── COUNTDOWN CARD (next interview) ── */}
      {nextInterview && (
        <CountdownCard interview={nextInterview} />
      )}

      {/* ── NOTIFICATIONS PANEL (inline, shown when there are urgent ones) ── */}
      {notifications.filter((n) => n.type === "warning" || n.type === "error" || n.type === "success").length > 0 && (
        <div className="space-y-2">
          {notifications
            .filter((n) => n.type === "warning" || n.type === "error" || n.type === "success")
            .slice(0, 3)
            .map((n) => (
              <div
                key={n.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer hover:opacity-90 transition-opacity ${
                  n.type === "success" ? "bg-green-500/10 border-green-500/20" :
                  n.type === "warning" ? "bg-yellow-500/10 border-yellow-500/20" :
                  n.type === "error"   ? "bg-red-500/10 border-red-500/20" :
                                        "bg-indigo-500/10 border-indigo-500/20"
                }`}
                onClick={() => { markRead(n.id); if (n.link) window.location.href = n.link }}
              >
                <NotifIcon type={n.type} />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">{n.title}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{n.message}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
              </div>
            ))
          }
        </div>
      )}

      {/* ── STATS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total",      value: interviews.length,              icon: Calendar,    color: "text-indigo-400" },
          { label: "Completed",  value: completed.length,               icon: CheckCircle2,color: "text-green-400"  },
          { label: "Avg Score",  value: avgScore  != null ? avgScore  : "—", icon: BarChart2, color: "text-yellow-400" },
          { label: "Best Score", value: bestScore != null ? bestScore : "—", icon: Award,     color: "text-rose-400"  },
        ].map((s) => (
          <Card key={s.label} className="bg-slate-900/80 border-slate-700/50 rounded-2xl">
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`w-5 h-5 ${s.color} shrink-0`} />
              <div>
                <p className="text-white font-bold text-lg leading-none">{s.value}</p>
                <p className="text-slate-500 text-xs mt-0.5">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── TABS ── */}
      <div className="flex gap-2">
        {(["upcoming", "history"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === t ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
            }`}>
            {t === "upcoming" ? `Upcoming (${upcoming.length})` : `History (${history.length})`}
          </button>
        ))}
      </div>

      {/* ── UPCOMING ── */}
      {tab === "upcoming" && (
        <div className="space-y-3">
          {upcoming.length === 0 ? (
            <Card className="bg-slate-900/80 border-slate-700/50 rounded-2xl">
              <CardContent className="py-12 text-center">
                <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 text-sm font-medium">No upcoming interviews</p>
              </CardContent>
            </Card>
          ) : upcoming.map((iv) => (
            <Card key={iv.id} className="bg-slate-900/80 border-slate-700/50 rounded-2xl hover:border-slate-600/50 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                      {iv.company.logo
                        ? <img src={iv.company.logo} alt={iv.company.name} className="w-full h-full object-contain p-1" />
                        : <span className="text-white font-bold text-sm">{iv.company.name.charAt(0)}</span>
                      }
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white font-semibold">{iv.title}</p>
                        {isToday(iv.startTime) && (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-medium">Today</span>
                        )}
                        {iv.status === "IN_PROGRESS" && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-500/10 text-green-400 border border-green-500/20 text-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />Live
                          </span>
                        )}
                      </div>
                      <p className="text-slate-400 text-xs mt-0.5">
                        {iv.company.name}
                        {iv.user_interview_interviewerIdTouser && ` · ${iv.user_interview_interviewerIdTouser.name}`}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(iv.startTime)}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(iv.startTime)}</span>
                        <span>{iv.duration}m</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Link href={`/interview/${iv.id}/prepare`}>
                      <Button size="sm" variant="outline" className="h-8 rounded-xl border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700 text-xs">
                        Prepare
                      </Button>
                    </Link>
                    {iv.status === "IN_PROGRESS" && (
                      <Link href={`/interview/${iv.id}`}>
                        <Button size="sm" className="h-8 rounded-xl bg-green-600 hover:bg-green-500 text-white text-xs gap-1.5 animate-pulse">
                          <Play className="w-3 h-3 fill-white" />Continue
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── HISTORY ── */}
      {tab === "history" && (
        <div className="space-y-3">
          {history.length === 0 ? (
            <Card className="bg-slate-900/80 border-slate-700/50 rounded-2xl">
              <CardContent className="py-12 text-center">
                <TrendingUp className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 text-sm font-medium">No interview history yet</p>
              </CardContent>
            </Card>
          ) : history.map((iv) => (
            <Card key={iv.id} className="bg-slate-900/80 border-slate-700/50 rounded-2xl hover:border-slate-600/50 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-center gap-4 flex-wrap">
                  {iv.report
                    ? <ScoreRing score={iv.report.overallScore} />
                    : (
                      <div className="w-11 h-11 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                        {iv.status === "CANCELLED"
                          ? <XCircle className="w-5 h-5 text-slate-500" />
                          : <AlertCircle className="w-5 h-5 text-slate-500" />
                        }
                      </div>
                    )
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold">{iv.title}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{iv.company.name}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span>{formatDate(iv.startTime)}</span>
                      <span>{iv.duration}m</span>
                      {iv.report && (
                        <span className={`font-semibold ${scoreColor(iv.report.overallScore)}`}>
                          Score: {iv.report.overallScore}/100
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${
                      iv.status === "COMPLETED"
                        ? "bg-green-500/10 text-green-400 border-green-500/20"
                        : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                    }`}>
                      {iv.status}
                    </span>
                    {iv.status === "COMPLETED" && iv.report && (
                      <Link href={`/interview/${iv.id}/report`}>
                        <Button size="sm" variant="outline" className="h-8 rounded-xl border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700 text-xs gap-1.5">
                          <FileText className="w-3.5 h-3.5" />Report
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {total > LIMIT && (
            <div className="flex justify-center gap-2 pt-2">
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
          )}
        </div>
      )}

      {/* Click outside to close notifications */}
      {showNotif && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowNotif(false)}
        />
      )}
    </div>
  )
}