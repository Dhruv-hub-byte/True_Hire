"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

import { Button } from "@/components/ui/button"
import { LayoutDashboard, LogOut, ChevronRight } from "lucide-react"

/* =====================================================
   ROLE CONFIG
===================================================== */

const ROLE_CONFIG = {
  ADMIN:       { label: "Admin",       classes: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
  INTERVIEWER: { label: "Interviewer", classes: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
  CANDIDATE:   { label: "Candidate",   classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
} as const

type UserRole = keyof typeof ROLE_CONFIG

/* =====================================================
   COMPONENT
===================================================== */

export default function Navbar() {
  const router = useRouter()
  const { user, logout, isAuthenticated } = useAuth()

  const handleLogout = async () => {
    await logout()
    router.replace("/auth/login")
  }

  const roleCfg = user?.role
    ? ROLE_CONFIG[user.role as UserRole]
    : null

  return (
    <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">

        {/* Left — logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow shadow-indigo-500/20">
            <span className="text-white font-black text-sm">T</span>
          </div>
          <span className="text-white font-bold tracking-tight">TrueHire</span>
        </Link>

        {/* Right */}
        <div className="flex items-center gap-2">

          {isAuthenticated && user ? (
            <>
              {/* Role badge */}
              {roleCfg && (
                <span className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${roleCfg.classes}`}>
                  {roleCfg.label}
                </span>
              )}

              {/* User name */}
              <span className="hidden md:block text-sm text-slate-400">
                {user.name}
              </span>

              {/* Dashboard */}
              <Link href="/dashboard">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 gap-1.5 text-xs"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span className="hidden sm:block">Dashboard</span>
                </Button>
              </Link>

              {/* Logout */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="h-8 rounded-lg border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700 hover:text-white gap-1.5 text-xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:block">Sign Out</span>
              </Button>
            </>
          ) : (
            <>
              <Link href="/auth/login">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 text-xs"
                >
                  Sign In
                </Button>
              </Link>

              <Link href="/auth/register">
                <Button
                  size="sm"
                  className="h-8 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow shadow-indigo-500/20 gap-1.5 text-xs"
                >
                  Get Started
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}