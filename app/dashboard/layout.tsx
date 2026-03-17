'use client'

import { ReactNode, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import Sidebar from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { LogOut, Settings, Menu, X, User, ChevronDown } from 'lucide-react'

/* =====================================================
   ROLE BADGE
===================================================== */

const ROLE_CONFIG = {
  ADMIN:       { label: 'Admin',       classes: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  INTERVIEWER: { label: 'Interviewer', classes: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  CANDIDATE:   { label: 'Candidate',   classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
} as const

type UserRole = keyof typeof ROLE_CONFIG

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CONFIG[role as UserRole] ?? {
    label: role,
    classes: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  }
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border ${cfg.classes}`}>
      {cfg.label}
    </span>
  )
}

/* =====================================================
   LAYOUT
===================================================== */

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { user, logout, isAuthenticated, isLoading } = useAuth()

  const [mobileOpen, setMobileOpen] = useState(false)

  /* -------------------------
     Redirect if unauthenticated
  -------------------------- */

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/auth/login')
    }
  }, [isLoading, isAuthenticated, router])

  /* -------------------------
     Close mobile sidebar on route change
  -------------------------- */

  useEffect(() => {
    setMobileOpen(false)
  }, [])

  /* -------------------------
     Lock body scroll when mobile sidebar open
  -------------------------- */

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  /* -------------------------
     Loading / auth gate
  -------------------------- */

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <span className="text-white font-black text-lg">T</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <div className="h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            Loading dashboard...
          </div>
        </div>
      </div>
    )
  }

  /* -------------------------
     Logout
  -------------------------- */

  const handleLogout = () => {
    logout()
    router.replace('/auth/login')
  }

  /* =====================================================
     LAYOUT
  ===================================================== */

  return (
    <div className="flex min-h-screen bg-slate-950">

      {/* -------------------------
         Sidebar — desktop
      -------------------------- */}

      <div className="hidden md:block shrink-0">
        <Sidebar />
      </div>

      {/* -------------------------
         Mobile sidebar overlay
      -------------------------- */}

      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <div className="relative z-50 flex flex-col">
            <Sidebar mobile onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* -------------------------
         Main content area
      -------------------------- */}

      <div className="flex flex-col flex-1 min-w-0">

        {/* Top header */}
        <header className="h-14 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 flex items-center justify-between px-4 sticky top-0 z-30">

          {/* Left — mobile menu toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen
              ? <X className="w-5 h-5" />
              : <Menu className="w-5 h-5" />
            }
          </Button>

          {/* Centre — logo (mobile only) */}
          <div className="md:hidden flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center">
              <span className="text-white font-black text-sm">T</span>
            </div>
            <span className="text-white font-bold text-sm tracking-tight">TrueHire</span>
          </div>

          {/* Right — user menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 h-9 px-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                {/* Avatar */}
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center overflow-hidden shrink-0">
                  {user?.profileImage ? (
                    <img
                      src={user.profileImage}
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-semibold text-xs">
                      {user?.name?.charAt(0).toUpperCase() ?? 'U'}
                    </span>
                  )}
                </div>

                {/* Name + role — hidden on small screens */}
                <div className="hidden sm:flex flex-col items-start">
                  <span className="text-xs font-medium text-white leading-none">
                    {user?.name}
                  </span>
                  {user?.role && (
                    <span className="text-xs text-slate-500 leading-none mt-0.5">
                      {ROLE_CONFIG[user.role as UserRole]?.label ?? user.role}
                    </span>
                  )}
                </div>

                <ChevronDown className="w-3.5 h-3.5 text-slate-500 hidden sm:block" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="w-56 bg-slate-900 border-slate-700 shadow-2xl rounded-xl p-1"
            >
              {/* User info */}
              <DropdownMenuLabel className="px-2 py-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center overflow-hidden shrink-0">
                    {user?.profileImage ? (
                      <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-semibold text-xs">
                        {user?.name?.charAt(0).toUpperCase() ?? 'U'}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                    <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                  </div>
                </div>
                {user?.role && (
                  <div className="mt-2">
                    <RoleBadge role={user.role} />
                  </div>
                )}
              </DropdownMenuLabel>

              <DropdownMenuSeparator className="bg-slate-700/50 my-1" />

              <DropdownMenuItem
                className="flex items-center gap-2 px-2 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
                onClick={() => router.push('/dashboard/settings')}
              >
                <Settings className="w-4 h-4" />
                Settings
              </DropdownMenuItem>

              <DropdownMenuItem
                className="flex items-center gap-2 px-2 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
                onClick={() => router.push('/dashboard/profile')}
              >
                <User className="w-4 h-4" />
                Profile
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-slate-700/50 my-1" />

              <DropdownMenuItem
                className="flex items-center gap-2 px-2 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg cursor-pointer"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 min-w-0">
          {children}
        </main>

      </div>
    </div>
  )
}