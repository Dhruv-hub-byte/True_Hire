'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import {
  X,
  LayoutDashboard,
  Calendar,
  Users,
  FileText,
  Building2,
  Settings,
  Plus,
  ShieldAlert,
} from 'lucide-react'

/* =====================================================
   TYPES
===================================================== */

interface SidebarProps {
  mobile?: boolean
  onClose?: () => void
}

type NavItem = {
  label: string
  href: string
  icon: React.ElementType
}

/* =====================================================
   ROLE-BASED NAV
===================================================== */

const NAV: Record<string, NavItem[]> = {
  ADMIN: [
    { label: 'Dashboard',   href: '/dashboard/admin',              icon: LayoutDashboard },
    { label: 'Interviews',  href: '/dashboard/admin/interviews',   icon: Calendar },
    { label: 'Candidates',  href: '/dashboard/admin/candidates',   icon: Users },
    { label: 'Companies',   href: '/dashboard/admin/companies',    icon: Building2 },
    { label: 'Reports',     href: '/dashboard/admin/reports',      icon: FileText },
  ],
  INTERVIEWER: [
    { label: 'Dashboard',   href: '/dashboard/interviewer',        icon: LayoutDashboard },
    { label: 'Interviews',  href: '/dashboard/admin/interviews',   icon: Calendar },
    { label: 'Reports',     href: '/dashboard/admin/reports',      icon: FileText },
  ],
  CANDIDATE: [
    { label: 'Dashboard',   href: '/dashboard/candidate',          icon: LayoutDashboard },
    { label: 'Interviews',  href: '/dashboard/candidate',          icon: Calendar },
    { label: 'My Reports',  href: '/dashboard/candidate/reports',  icon: FileText },
  ],
}

const ROLE_CONFIG = {
  ADMIN:       { label: 'Admin',       classes: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  INTERVIEWER: { label: 'Interviewer', classes: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  CANDIDATE:   { label: 'Candidate',   classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
} as const

type UserRole = keyof typeof ROLE_CONFIG

/* =====================================================
   COMPONENT
===================================================== */

export default function Sidebar({ mobile = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { user } = useAuth()

  const role = (user?.role ?? 'CANDIDATE') as UserRole
  const navItems = NAV[role] ?? NAV.CANDIDATE
  const roleCfg = ROLE_CONFIG[role]

  return (
    <aside className={cn(
      'h-screen w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0',
      mobile && 'shadow-2xl'
    )}>

      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow shadow-indigo-500/20">
            <span className="text-white font-black text-sm">T</span>
          </div>
          <span className="text-white font-bold tracking-tight text-sm">TrueHire</span>
        </div>

        {mobile && (
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* User info */}
      {user && (
        <div className="px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shrink-0 overflow-hidden">
              {user.profileImage ? (
                <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-semibold text-xs">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border ${roleCfg.classes}`}>
                {roleCfg.label}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              onClick={onClose}
            >
              <div className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
                isActive
                  ? 'bg-indigo-600 text-white shadow shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              )}>
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
              </div>
            </Link>
          )
        })}

        {/* Admin quick actions */}
        {role === 'ADMIN' && (
          <div className="pt-3 mt-3 border-t border-slate-800 space-y-0.5">
            <p className="px-3 text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Quick Actions
            </p>
            <Link href="/dashboard/admin/new-interview" onClick={onClose}>
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                <Plus className="w-4 h-4 shrink-0" />
                New Interview
              </div>
            </Link>
            <Link href="/dashboard/admin/companies/new" onClick={onClose}>
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                <Building2 className="w-4 h-4 shrink-0" />
                New Company
              </div>
            </Link>
          </div>
        )}
      </nav>

      {/* Bottom — settings */}
      <div className="p-3 border-t border-slate-800">
        <Link href="/dashboard/settings" onClick={onClose}>
          <div className={cn(
            'flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
            pathname === '/dashboard/settings'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          )}>
            <Settings className="w-4 h-4 shrink-0" />
            Settings
          </div>
        </Link>
      </div>
    </aside>
  )
}