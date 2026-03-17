"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Loading from "@/components/common/loading"

import {
  User, Mail, Phone, Building2,
  Calendar, Clock, Shield, Settings,
  CheckCircle2, XCircle,
} from "lucide-react"

/* =====================================================
   TYPES
===================================================== */

interface UserProfile {
  id:            string
  name:          string
  email:         string
  role:          string
  status:        string
  phone:         string | null
  profileImage:  string | null
  emailVerified: boolean
  lastLoginAt:   string | null
  createdAt:     string
  company: {
    id:   string
    name: string
    logo: string | null
  } | null
}

/* =====================================================
   ROLE CONFIG
===================================================== */

const ROLE_CONFIG = {
  ADMIN:       { label: "Admin",       classes: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
  INTERVIEWER: { label: "Interviewer", classes: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
  CANDIDATE:   { label: "Candidate",   classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
} as const

const STATUS_CONFIG = {
  ACTIVE:               { label: "Active",               classes: "bg-green-500/10 text-green-400 border-green-500/20" },
  INACTIVE:             { label: "Inactive",             classes: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  SUSPENDED:            { label: "Suspended",            classes: "bg-red-500/10 text-red-400 border-red-500/20" },
  PENDING_VERIFICATION: { label: "Pending verification", classes: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
} as const

function formatDate(iso: string | null) {
  if (!iso) return "Never"
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  })
}

function formatDateTime(iso: string | null) {
  if (!iso) return "Never"
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

/* =====================================================
   INFO ROW
===================================================== */

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-800 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-slate-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <div className="text-sm text-white mt-0.5">{value}</div>
      </div>
    </div>
  )
}

/* =====================================================
   PAGE
===================================================== */

export default function ProfilePage() {
  const { user: authUser, accessToken } = useAuth()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    if (!accessToken || !authUser?.id) return

    try {
      setLoading(true)
      const res = await fetch(`/api/users/${authUser.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to load profile")
      setProfile(json.data)
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load profile")
    } finally {
      setLoading(false)
    }
  }, [accessToken, authUser?.id])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  if (loading)           return <Loading text="Loading profile..." />
  if (error || !profile) return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <p className="text-red-400 text-sm">{error || "Profile not found"}</p>
    </div>
  )

  const roleCfg   = ROLE_CONFIG[profile.role as keyof typeof ROLE_CONFIG]
  const statusCfg = STATUS_CONFIG[profile.status as keyof typeof STATUS_CONFIG]

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6 px-4">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Profile</h1>
          <p className="text-slate-400 text-sm mt-1">Your account information</p>
        </div>
        <Link href="/dashboard/settings">
          <Button
            variant="outline"
            size="sm"
            className="h-9 rounded-xl border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700 hover:text-white gap-2 text-xs"
          >
            <Settings className="w-3.5 h-3.5" />
            Edit settings
          </Button>
        </Link>
      </div>

      {/* Avatar + name card */}
      <Card className="bg-slate-900/80 border-slate-700/50 rounded-2xl">
        <CardContent className="py-8 flex flex-col items-center text-center gap-4">

          {/* Avatar */}
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center overflow-hidden border-2 border-slate-700 shadow-lg">
            {profile.profileImage ? (
              <img
                src={profile.profileImage}
                alt={profile.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const el = e.target as HTMLImageElement
                  el.style.display = "none"
                }}
              />
            ) : (
              <span className="text-white font-bold text-3xl">
                {profile.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* Name */}
          <div>
            <h2 className="text-xl font-bold text-white">{profile.name}</h2>
            <p className="text-slate-400 text-sm mt-0.5">{profile.email}</p>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {roleCfg && (
              <span className={`px-3 py-1 rounded-lg text-xs font-medium border ${roleCfg.classes}`}>
                {roleCfg.label}
              </span>
            )}
            {statusCfg && (
              <span className={`px-3 py-1 rounded-lg text-xs font-medium border ${statusCfg.classes}`}>
                {statusCfg.label}
              </span>
            )}
            <span className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium border ${
              profile.emailVerified
                ? "bg-green-500/10 text-green-400 border-green-500/20"
                : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
            }`}>
              {profile.emailVerified
                ? <><CheckCircle2 className="w-3 h-3" />Verified</>
                : <><XCircle className="w-3 h-3" />Unverified</>
              }
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Account details */}
      <Card className="bg-slate-900/80 border-slate-700/50 rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm font-semibold flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-400" />
            Account details
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4 px-5">
          <InfoRow
            icon={Mail}
            label="Email address"
            value={profile.email}
          />
          <InfoRow
            icon={Phone}
            label="Phone number"
            value={profile.phone || <span className="text-slate-500 italic">Not provided</span>}
          />
          <InfoRow
            icon={Shield}
            label="Role"
            value={
              roleCfg
                ? <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium border ${roleCfg.classes}`}>{roleCfg.label}</span>
                : profile.role
            }
          />
          {profile.company && (
            <InfoRow
              icon={Building2}
              label="Company"
              value={
                <div className="flex items-center gap-2">
                  {profile.company.logo && (
                    <img src={profile.company.logo} alt={profile.company.name} className="w-4 h-4 rounded object-contain" />
                  )}
                  {profile.company.name}
                </div>
              }
            />
          )}
          <InfoRow
            icon={Calendar}
            label="Member since"
            value={formatDate(profile.createdAt)}
          />
          <InfoRow
            icon={Clock}
            label="Last login"
            value={formatDateTime(profile.lastLoginAt)}
          />
        </CardContent>
      </Card>

      {/* Email not verified warning */}
      {!profile.emailVerified && (
        <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
          <XCircle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-400 text-sm font-medium">Email not verified</p>
            <p className="text-yellow-400/70 text-xs mt-0.5">
              Check your inbox or{" "}
              <Link href="/auth/verify-email" className="underline hover:text-yellow-300">
                request a new verification link
              </Link>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}