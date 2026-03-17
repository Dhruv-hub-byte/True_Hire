'use client'

import { useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import {
  Shield, Zap, BarChart3, Video,
  Lock, Brain, ArrowRight, CheckCircle2,
} from 'lucide-react'

/* =====================================================
   DATA
===================================================== */

const features = [
  {
    icon: Shield,
    title: 'Anti-Cheating Protection',
    description: 'Advanced detection prevents tab switching, copy-paste, and suspicious behavior in real time.',
    accent: 'from-rose-500 to-red-600',
  },
  {
    icon: Video,
    title: 'Live Monitoring',
    description: 'Real-time video monitoring with automatic violation recording and severity scoring.',
    accent: 'from-indigo-500 to-blue-600',
  },
  {
    icon: Brain,
    title: 'AI Analysis',
    description: 'Speech-to-text, sentiment analysis, and automated performance scoring after each interview.',
    accent: 'from-violet-500 to-purple-600',
  },
  {
    icon: BarChart3,
    title: 'Analytics Dashboard',
    description: 'Comprehensive insights and reporting across all interviews and candidates.',
    accent: 'from-emerald-500 to-teal-600',
  },
  {
    icon: Lock,
    title: 'Enterprise Security',
    description: 'JWT authentication with refresh token rotation, encrypted data, and HTTPS everywhere.',
    accent: 'from-amber-500 to-orange-600',
  },
  {
    icon: Zap,
    title: 'Real-Time Collaboration',
    description: 'Live chat, screen sharing, and a built-in code editor for technical interviews.',
    accent: 'from-cyan-500 to-sky-600',
  },
]

const highlights = [
  'No setup required — start in minutes',
  'Supports CANDIDATE, INTERVIEWER and ADMIN roles',
  'Detailed per-interview reports with scores',
  'Built-in violation detection and risk scoring',
]

/* =====================================================
   PAGE
===================================================== */

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard')
    }
  }, [isAuthenticated, isLoading, router])

  // Don't flash the landing page if user is already logged in
  if (isLoading || isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">

      {/* Background grid + glow */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-600 rounded-full blur-[160px] opacity-10 pointer-events-none" />

      {/* ===== NAVBAR ===== */}
      <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <span className="text-white font-black text-sm">T</span>
            </div>
            <span className="text-xl font-bold text-white tracking-tight">TrueHire</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Link href="/auth/login">
              <Button
                variant="ghost"
                className="text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl px-5"
              >
                Sign In
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button className="rounded-xl px-5 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section className="relative max-w-7xl mx-auto px-6 py-28 text-center">
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium">
            <Shield className="w-3.5 h-3.5" />
            AI-Powered Interview Security
          </div>

          {/* Heading */}
          <h1 className="text-5xl sm:text-6xl font-extrabold leading-tight tracking-tight text-white">
            Secure Remote Interviews with{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent">
              AI-Powered Analysis
            </span>
          </h1>

          {/* Description */}
          <p className="text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto">
            TrueHire eliminates cheating with advanced proctoring, provides real-time
            AI insights, and helps companies hire faster with confidence and fairness.
          </p>

          {/* Highlights */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {highlights.map((h) => (
              <span key={h} className="flex items-center gap-1.5 text-sm text-slate-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                {h}
              </span>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-4 justify-center pt-2">
            <Link href="/auth/register">
              <Button
                size="lg"
                className="gap-2 px-8 h-12 text-base rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Start Free Trial
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button
                variant="outline"
                size="lg"
                className="px-8 h-12 text-base rounded-xl border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section className="relative max-w-7xl mx-auto px-6 pb-28">
        <div className="text-center mb-14 space-y-3">
          <h2 className="text-3xl font-bold text-white tracking-tight">
            Everything you need for secure hiring
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Built for modern teams who need confidence in every interview
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="bg-slate-900/70 border-slate-700/50 hover:border-slate-600/50 hover:bg-slate-900 transition-colors rounded-2xl"
            >
              <CardContent className="p-6 space-y-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${feature.accent} flex items-center justify-center shadow-lg`}>
                  <feature.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-white">{feature.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ===== CTA BANNER ===== */}
      <section className="relative max-w-7xl mx-auto px-6 pb-28">
        <div className="bg-gradient-to-r from-indigo-600/20 to-blue-600/20 border border-indigo-500/20 rounded-2xl p-12 text-center space-y-6">
          <h2 className="text-3xl font-bold text-white tracking-tight">
            Ready to hire with confidence?
          </h2>
          <p className="text-slate-400 max-w-lg mx-auto">
            Join companies using TrueHire to run fair, secure, and insightful interviews.
          </p>
          <Link href="/auth/register">
            <Button
              size="lg"
              className="gap-2 px-8 h-12 text-base rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-500/25 hover:scale-[1.02] transition-all"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

    </div>
  )
}