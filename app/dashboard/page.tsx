'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function DashboardPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading || !user) return

    const routes: Record<string, string> = {
      ADMIN:       '/dashboard/admin',
      INTERVIEWER: '/dashboard/interviewer',
      CANDIDATE:   '/dashboard/candidate',
    }

    const target = routes[user.role]

    if (target) {
      router.replace(target) // replace instead of push — no back-button loop
    }
  }, [user, isLoading, router])

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Redirecting...</p>
      </div>
    </div>
  )
}