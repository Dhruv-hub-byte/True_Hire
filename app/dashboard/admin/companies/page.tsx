"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Loading from "@/components/common/loading"

import {
  Building2, Plus, Search, Globe,
  ChevronRight, Trash2, Loader2,
} from "lucide-react"

/* =====================================================
   TYPES
===================================================== */

interface Company {
  id:          string
  name:        string
  description: string | null
  logo:        string | null
  website:     string | null
  createdAt:   string
  _count?: { user: number; interview: number }
}

/* =====================================================
   PAGE
===================================================== */

export default function CompaniesPage() {
  const { accessToken, user } = useAuth()
  const router = useRouter()

  const [companies,  setCompanies]  = useState<Company[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [search,     setSearch]     = useState("")
  const [page,       setPage]       = useState(1)
  const [total,      setTotal]      = useState(0)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const LIMIT = 10

  /* -------------------------
     Redirect non-admins
  -------------------------- */

  useEffect(() => {
    if (user && user.role !== "ADMIN") router.replace("/dashboard")
  }, [user, router])

  /* -------------------------
     Fetch companies
  -------------------------- */

  const fetchCompanies = useCallback(async () => {
    if (!accessToken) return
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams({
        page:  String(page),
        limit: String(LIMIT),
        ...(search ? { search } : {}),
      })
      const res  = await fetch(`/api/companies?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to load")
      setCompanies(json.data ?? [])
      setTotal(json.pagination?.total ?? 0)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load companies")
    } finally {
      setLoading(false)
    }
  }, [accessToken, page, search])

  useEffect(() => { fetchCompanies() }, [fetchCompanies])

  // Reset to page 1 when search changes
  useEffect(() => { setPage(1) }, [search])

  /* -------------------------
     Delete company
  -------------------------- */

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/companies/${id}`, {
        method:  "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || "Failed to delete")
      }
      setCompanies((prev) => prev.filter((c) => c.id !== id))
      setTotal((t) => t - 1)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete")
    } finally {
      setDeletingId(null)
    }
  }

  /* =====================================================
     RENDER
  ===================================================== */

  if (user?.role !== "ADMIN") return null
  if (loading) return <Loading text="Loading companies..." />

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-6 px-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Companies</h1>
          <p className="text-slate-400 text-sm mt-1">
            {total} company{total !== 1 ? "ies" : "y"} total
          </p>
        </div>
        <Link href="/dashboard/admin/companies/new">
          <Button className="h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white gap-2 text-sm">
            <Plus className="w-4 h-4" />
            New Company
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input
          placeholder="Search companies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 pl-9 rounded-xl bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500 text-sm"
        />
      </div>

      {/* Error */}
      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      {/* Empty */}
      {!loading && companies.length === 0 && (
        <Card className="bg-slate-900/80 border-slate-700/50 rounded-2xl">
          <CardContent className="py-16 text-center space-y-3">
            <Building2 className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-slate-400 text-sm font-medium">
              {search ? "No companies match your search" : "No companies yet"}
            </p>
            {!search && (
              <Link href="/dashboard/admin/companies/new">
                <Button size="sm" className="h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white gap-2 text-xs mt-2">
                  <Plus className="w-3.5 h-3.5" />
                  Create first company
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* List */}
      <div className="space-y-3">
        {companies.map((company) => (
          <Card
            key={company.id}
            className="bg-slate-900/80 border-slate-700/50 rounded-2xl hover:border-slate-600/50 transition-colors group"
          >
            <CardContent className="p-5">
              <div className="flex items-center gap-4">

                {/* Logo / icon */}
                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                  {company.logo ? (
                    <img
                      src={company.logo}
                      alt={company.name}
                      className="w-full h-full object-contain p-1"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none"
                      }}
                    />
                  ) : (
                    <Building2 className="w-5 h-5 text-slate-500" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold truncate">{company.name}</p>
                  {company.description && (
                    <p className="text-slate-400 text-xs mt-0.5 truncate">{company.description}</p>
                  )}
                  {company.website && (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 mt-1 w-fit"
                    >
                      <Globe className="w-3 h-3" />
                      {company.website.replace(/^https?:\/\//, "")}
                    </a>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Delete — ADMIN only */}
                  <button
                    onClick={() => handleDelete(company.id, company.name)}
                    disabled={deletingId === company.id}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                    title="Delete company"
                  >
                    {deletingId === company.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Trash2 className="w-3.5 h-3.5" />
                    }
                  </button>

                  {/* View detail */}
                  <Link href={`/dashboard/admin/companies/${company.id}`}>
                    <button className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </button>
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
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="h-9 rounded-xl border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700 text-xs"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page * LIMIT >= total}
              onClick={() => setPage((p) => p + 1)}
              className="h-9 rounded-xl border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}