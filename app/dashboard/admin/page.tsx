"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import Loading from "@/components/common/loading"
import ErrorComponent from "@/components/common/error"

import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts"

import {
  Users, Calendar, FileText, TrendingUp, Plus,
  Building2, ShieldAlert, CheckCircle2, Clock,
  AlertTriangle, ArrowUpRight,
} from "lucide-react"

/* =====================================================
   TYPES — aligned with updated schema
===================================================== */

interface Interview {
  id: string
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
  cheatingProbability: number | null
  candidateId: string
  createdAt: string
}

interface DashboardStats {
  totalInterviews: number
  scheduled: number
  inProgress: number
  completed: number
  cancelled: number
  totalCandidates: number
  completionRate: number
  avgCheatingScore: number
  highRiskCount: number
}

interface ChartData {
  name: string
  value: number
  color: string
}

interface MonthlyData {
  month: string
  interviews: number
}

/* =====================================================
   HELPERS
===================================================== */

function buildStats(interviews: Interview[]): DashboardStats {
  const scheduled  = interviews.filter((i) => i.status === "SCHEDULED").length
  const inProgress = interviews.filter((i) => i.status === "IN_PROGRESS").length
  const completed  = interviews.filter((i) => i.status === "COMPLETED").length
  const cancelled  = interviews.filter((i) => i.status === "CANCELLED").length

  const avgCheating =
    interviews.length > 0
      ? interviews.reduce((sum, i) => sum + (i.cheatingProbability ?? 0), 0) /
        interviews.length
      : 0

  return {
    totalInterviews: interviews.length,
    scheduled,
    inProgress,
    completed,
    cancelled,
    totalCandidates: new Set(interviews.map((i) => i.candidateId)).size,
    completionRate:
      interviews.length > 0 ? (completed / interviews.length) * 100 : 0,
    avgCheatingScore: avgCheating,
    highRiskCount: interviews.filter((i) => (i.cheatingProbability ?? 0) > 0.5).length,
  }
}

function buildChartData(stats: DashboardStats): ChartData[] {
  return [
    { name: "Scheduled",   value: stats.scheduled,   color: "#6366f1" },
    { name: "In Progress", value: stats.inProgress,  color: "#10b981" },
    { name: "Completed",   value: stats.completed,   color: "#3b82f6" },
    { name: "Cancelled",   value: stats.cancelled,   color: "#ef4444" },
  ].filter((d) => d.value > 0)
}

function buildMonthlyData(interviews: Interview[]): MonthlyData[] {
  const map: Record<string, number> = {}

  interviews.forEach((i) => {
    const month = new Date(i.createdAt).toLocaleDateString(undefined, {
      month: "short", year: "2-digit",
    })
    map[month] = (map[month] ?? 0) + 1
  })

  return Object.entries(map)
    .slice(-6)
    .map(([month, interviews]) => ({ month, interviews }))
}

/* =====================================================
   STAT CARD
===================================================== */

interface StatCardProps {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  accent?: string
}

function StatCard({ icon: Icon, label, value, sub, accent = "from-indigo-500 to-blue-600" }: StatCardProps) {
  return (
    <Card className="bg-slate-900/70 border-slate-700/50 hover:border-slate-600/50 transition-colors">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
            {sub && <p className="text-xs text-slate-500">{sub}</p>}
          </div>
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center shadow-lg shrink-0`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/* =====================================================
   CUSTOM TOOLTIP
===================================================== */

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-white font-medium">{payload[0].name}</p>
      <p className="text-slate-400">{payload[0].value} interview{payload[0].value !== 1 ? "s" : ""}</p>
    </div>
  )
}

/* =====================================================
   PAGE
===================================================== */

export default function AdminDashboard() {
  const { accessToken, user } = useAuth()
  const router = useRouter()

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /* -------------------------
     Redirect non-admins
  -------------------------- */

  useEffect(() => {
    if (user && user.role !== "ADMIN") router.replace("/dashboard")
  }, [user, router])

  /* -------------------------
     Fetch + derive stats from interviews
  -------------------------- */

  const fetchStats = useCallback(async () => {
    if (!accessToken) return

    try {
      setLoading(true)
      setError(null)

      // Fetch up to 500 interviews for dashboard calculations
      const res = await fetch("/api/interviews?limit=500&page=1", {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || `Request failed (${res.status})`)
      }

      const json = await res.json()
      const interviews: Interview[] = json.data ?? []

      const derived = buildStats(interviews)
      setStats(derived)
      setChartData(buildChartData(derived))
      setMonthlyData(buildMonthlyData(interviews))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard")
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  /* =====================================================
     RENDER STATES
  ===================================================== */

  if (user?.role !== "ADMIN") return null
  if (loading) return <Loading text="Loading admin dashboard..." />
  if (error) return <ErrorComponent title="Dashboard failed to load" message={error} onRetry={fetchStats} />

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Admin Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage interviews and monitor platform metrics
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/dashboard/admin/companies/new">
            <Button
              variant="outline"
              className="h-9 rounded-xl border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700 hover:text-white text-sm gap-1.5"
            >
              <Building2 className="w-4 h-4" />
              New Company
            </Button>
          </Link>
          <Link href="/dashboard/admin/new-interview">
            <Button className="h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium shadow-lg shadow-indigo-500/20 gap-1.5">
              <Plus className="w-4 h-4" />
              Schedule Interview
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats grid */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Calendar}
            label="Total Interviews"
            value={stats.totalInterviews}
            sub={`${stats.inProgress} in progress`}
            accent="from-indigo-500 to-blue-600"
          />
          <StatCard
            icon={CheckCircle2}
            label="Completed"
            value={stats.completed}
            sub={`${stats.completionRate.toFixed(1)}% completion rate`}
            accent="from-emerald-500 to-teal-600"
          />
          <StatCard
            icon={Users}
            label="Candidates"
            value={stats.totalCandidates}
            sub="unique across interviews"
            accent="from-violet-500 to-purple-600"
          />
          <StatCard
            icon={ShieldAlert}
            label="High Risk"
            value={stats.highRiskCount}
            sub={`Avg ${(stats.avgCheatingScore * 100).toFixed(1)}% cheating score`}
            accent="from-rose-500 to-red-600"
          />
        </div>
      )}

      {/* Secondary stats */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-slate-900/70 border-slate-700/50">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wide">Scheduled</p>
                <p className="text-xl font-bold text-indigo-400 mt-0.5">{stats.scheduled}</p>
              </div>
              <Clock className="w-6 h-6 text-indigo-400 opacity-50" />
            </CardContent>
          </Card>
          <Card className="bg-slate-900/70 border-slate-700/50">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wide">In Progress</p>
                <p className="text-xl font-bold text-green-400 mt-0.5">{stats.inProgress}</p>
              </div>
              <TrendingUp className="w-6 h-6 text-green-400 opacity-50" />
            </CardContent>
          </Card>
          <Card className="bg-slate-900/70 border-slate-700/50">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wide">Cancelled</p>
                <p className="text-xl font-bold text-red-400 mt-0.5">{stats.cancelled}</p>
              </div>
              <AlertTriangle className="w-6 h-6 text-red-400 opacity-50" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      {(chartData.length > 0 || monthlyData.length > 0) && (
        <Tabs defaultValue="overview">
          <TabsList className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-1">
            <TabsTrigger value="overview" className="rounded-lg text-sm data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400">
              Status Distribution
            </TabsTrigger>
            <TabsTrigger value="trend" className="rounded-lg text-sm data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400">
              Monthly Trend
            </TabsTrigger>
            <TabsTrigger value="analysis" className="rounded-lg text-sm data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400">
              Analysis
            </TabsTrigger>
          </TabsList>

          {/* Status pie */}
          <TabsContent value="overview" className="mt-4">
            <Card className="bg-slate-900/70 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white text-base">Interview Status Distribution</CardTitle>
                <CardDescription className="text-slate-400">Breakdown by current status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row items-center gap-8">
                  <ResponsiveContainer width={240} height={240}>
                    <PieChart>
                      <Pie data={chartData} dataKey="value" cx="50%" cy="50%" outerRadius={90} innerRadius={50}>
                        {chartData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} strokeWidth={0} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Legend */}
                  <div className="space-y-3 flex-1">
                    {chartData.map((d) => (
                      <div key={d.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                          <span className="text-sm text-slate-300">{d.name}</span>
                        </div>
                        <span className="text-sm font-semibold text-white">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Monthly bar chart */}
          <TabsContent value="trend" className="mt-4">
            <Card className="bg-slate-900/70 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white text-base">Monthly Interviews</CardTitle>
                <CardDescription className="text-slate-400">Last 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                {monthlyData.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-8">Not enough data yet</p>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={monthlyData} barSize={28}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: "#ffffff08" }} />
                      <Bar dataKey="interviews" name="Interviews" fill="#6366f1" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analysis metrics */}
          <TabsContent value="analysis" className="mt-4">
            <Card className="bg-slate-900/70 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white text-base">Platform Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  {
                    label: "Completion Rate",
                    value: `${stats?.completionRate.toFixed(1)}%`,
                    color: "text-green-400",
                  },
                  {
                    label: "High Risk Detections (>50%)",
                    value: stats?.highRiskCount ?? 0,
                    color: "text-red-400",
                  },
                  {
                    label: "Avg Cheating Probability",
                    value: `${((stats?.avgCheatingScore ?? 0) * 100).toFixed(1)}%`,
                    color: "text-yellow-400",
                  },
                  {
                    label: "Cancellation Rate",
                    value: stats?.totalInterviews
                      ? `${((stats.cancelled / stats.totalInterviews) * 100).toFixed(1)}%`
                      : "0%",
                    color: "text-slate-400",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between p-3 bg-slate-800/60 border border-slate-700/50 rounded-xl"
                  >
                    <span className="text-sm text-slate-300">{item.label}</span>
                    <span className={`text-sm font-semibold ${item.color}`}>{item.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Quick actions */}
      <Card className="bg-slate-900/70 border-slate-700/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { href: "/dashboard/admin/interviews", icon: Calendar, label: "View Interviews" },
            { href: "/dashboard/admin/candidates", icon: Users,    label: "Candidates" },
            { href: "/dashboard/admin/reports",    icon: FileText, label: "Reports" },
          ].map((action) => (
            <Link key={action.href} href={action.href}>
              <Button
                variant="outline"
                className="w-full h-10 rounded-xl border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700 hover:text-white text-sm gap-2 justify-between"
              >
                <span className="flex items-center gap-2">
                  <action.icon className="w-4 h-4" />
                  {action.label}
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 opacity-50" />
              </Button>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}