"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"

import Loading from "@/components/common/loading"
import ErrorComponent from "@/components/common/error"

import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Search,
  ChevronLeft,
  ChevronRight,
  User,
  Mail,
  Phone,
  Building2,
  ShieldAlert,
} from "lucide-react"

/* =====================================================
   TYPES — aligned with updated schema + users route
===================================================== */

interface Company {
  id: string
  name: string
  logo: string | null
}

interface Candidate {
  id: string
  name: string
  email: string
  phone: string | null
  profileImage: string | null
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "PENDING_VERIFICATION"
  isActive: boolean
  emailVerified: boolean
  lastLoginAt: string | null
  createdAt: string
  company: Company | null
}

interface Pagination {
  total: number
  page: number
  limit: number
  pages: number
}

/* =====================================================
   STATUS BADGE
===================================================== */

function StatusBadge({ status }: { status: Candidate["status"] }) {
  const styles: Record<Candidate["status"], string> = {
    ACTIVE:               "bg-green-500/10 text-green-400 border-green-500/20",
    INACTIVE:             "bg-slate-500/10 text-slate-400 border-slate-500/20",
    SUSPENDED:            "bg-red-500/10 text-red-400 border-red-500/20",
    PENDING_VERIFICATION: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  }

  const labels: Record<Candidate["status"], string> = {
    ACTIVE:               "Active",
    INACTIVE:             "Inactive",
    SUSPENDED:            "Suspended",
    PENDING_VERIFICATION: "Pending",
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}

/* =====================================================
   PAGE
===================================================== */

const PAGE_SIZE = 20

export default function AdminCandidatesPage() {
  const { accessToken, user } = useAuth()
  const router = useRouter()

  const [candidates, setCandidates] = useState<Candidate[]>([])
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
    if (user && user.role !== "ADMIN") {
      router.replace("/dashboard")
    }
  }, [user, router])

  /* -------------------------
     Debounce search input
  -------------------------- */

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1) // reset to page 1 on new search
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  /* -------------------------
     Fetch candidates
  -------------------------- */

  const fetchCandidates = useCallback(async () => {
    if (!accessToken) return

    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        role: "CANDIDATE",
        page: String(page),
        limit: String(PAGE_SIZE),
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      })

      const res = await fetch(`/api/users?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || `Request failed (${res.status})`)
      }

      const json = await res.json()
      setCandidates(json.data)
      setPagination(json.pagination)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch candidates")
    } finally {
      setLoading(false)
    }
  }, [accessToken, page, debouncedSearch])

  useEffect(() => {
    fetchCandidates()
  }, [fetchCandidates])

  /* -------------------------
     Guard
  -------------------------- */

  if (user && user.role !== "ADMIN") return null

  if (loading) return <Loading text="Loading candidates..." />
  if (error) return <ErrorComponent message={error} onRetry={fetchCandidates} />

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Candidates</h1>
          {pagination && (
            <p className="text-sm text-slate-400 mt-0.5">
              {pagination.total} total candidate{pagination.total !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-xl bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-indigo-500/30"
          />
        </div>
      </div>

      {/* Empty state */}
      {candidates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <User className="w-10 h-10 text-slate-600 mb-3" />
          <p className="text-slate-400 font-medium">No candidates found</p>
          {debouncedSearch && (
            <p className="text-slate-500 text-sm mt-1">
              Try a different search term
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {candidates.map((c) => (
            <Card
              key={c.id}
              className="bg-slate-900/70 border-slate-700/50 hover:border-slate-600/50 hover:bg-slate-900 transition-colors"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">

                  {/* Avatar + info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20 overflow-hidden">
                      {c.profileImage ? (
                        <img src={c.profileImage} alt={c.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white font-semibold text-sm">
                          {c.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-white truncate">{c.name}</p>
                        <StatusBadge status={c.status} />
                        {!c.emailVerified && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20">
                            <ShieldAlert className="w-3 h-3" />
                            Unverified
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-1">
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Mail className="w-3 h-3" />{c.email}
                        </span>
                        {c.phone && (
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <Phone className="w-3 h-3" />{c.phone}
                          </span>
                        )}
                        {c.company && (
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <Building2 className="w-3 h-3" />{c.company.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="text-right text-xs text-slate-500 shrink-0">
                    <p>Joined {new Date(c.createdAt).toLocaleDateString()}</p>
                    {c.lastLoginAt && (
                      <p className="mt-0.5">
                        Last login {new Date(c.lastLoginAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
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