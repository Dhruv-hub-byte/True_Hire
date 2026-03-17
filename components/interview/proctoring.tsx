"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { AntiCheatManager, Violation } from "@/lib/anti-cheat"
import { AlertTriangle, ShieldAlert, XCircle } from "lucide-react"

/* =====================================================
   PROPS
===================================================== */

interface ProctoringProps {
  interviewId: string
  children: React.ReactNode
}

/* =====================================================
   VIOLATION TOAST
===================================================== */

function ViolationToast({ violation }: { violation: Violation | null }) {
  if (!violation) return null

  const isHigh = violation.severity >= 4

  return (
    <div className={`fixed top-4 right-4 z-50 flex items-start gap-3 px-4 py-3 rounded-xl border shadow-2xl max-w-sm animate-slide-up ${
      isHigh
        ? "bg-red-500/10 border-red-500/30 text-red-400"
        : "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
    }`}>
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide">
          Violation Detected
        </p>
        <p className="text-xs mt-0.5 opacity-80">{violation.description}</p>
      </div>
    </div>
  )
}

/* =====================================================
   TERMINATED SCREEN
===================================================== */

function TerminatedScreen({ reason }: { reason: string }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
          <XCircle className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-white">Interview Terminated</h2>
        <p className="text-slate-400 text-sm">{reason}</p>
        <p className="text-slate-500 text-xs">
          This incident has been recorded and reported.
        </p>
      </div>
    </div>
  )
}

/* =====================================================
   FULLSCREEN PROMPT
===================================================== */

function FullscreenPrompt({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-7 h-7 text-indigo-400" />
        </div>
        <h2 className="text-lg font-bold text-white">Fullscreen Required</h2>
        <p className="text-slate-400 text-sm">
          This interview must be taken in fullscreen mode. Please re-enter fullscreen to continue.
        </p>
        <button
          onClick={onEnter}
          className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors"
        >
          Enter Fullscreen
        </button>
      </div>
    </div>
  )
}

/* =====================================================
   COMPONENT
===================================================== */

export default function Proctoring({ interviewId, children }: ProctoringProps) {
  const { accessToken, isLoading } = useAuth()

  const managerRef = useRef<AntiCheatManager | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [lastViolation, setLastViolation] = useState<Violation | null>(null)
  const [terminated, setTerminated] = useState<string | null>(null)
  const [fullscreenExited, setFullscreenExited] = useState(false)

  /* -------------------------
     Show toast, auto-dismiss after 3s
  -------------------------- */

  const showToast = useCallback((violation: Violation) => {
    setLastViolation(violation)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setLastViolation(null), 3000)
  }, [])

  /* -------------------------
     Re-enter fullscreen
  -------------------------- */

  const enterFullscreen = useCallback(async () => {
    await managerRef.current?.requestFullscreen()
    setFullscreenExited(false)
  }, [])

  /* -------------------------
     Init AntiCheatManager
  -------------------------- */

  useEffect(() => {
    if (isLoading || !accessToken) return

    const manager = new AntiCheatManager({
      interviewId,
      accessToken,
      maxWarnings: 3,
      autoTerminateAfterViolations: 10,
      enableFullscreen: true,
      monitorMultipleMonitors: true,
      enableCopyPasteBlock: true,
      enableRightClickBlock: true,
    })

    managerRef.current = manager

    // Subscribe to violations — show toast + fullscreen prompt
    const unsubscribe = manager.onViolation((violation) => {
      showToast(violation)
      if (violation.type === "FOCUS_LOSS" && !document.fullscreenElement) {
        setFullscreenExited(true)
      }
    })

    // Handle auto-termination
    const handleTermination = (e: Event) => {
      const { reason } = (e as CustomEvent<{ reason: string }>).detail
      setTerminated(reason)
    }

    manager.requestFullscreen()
    window.addEventListener("interviewTerminated", handleTermination)

    return () => {
      unsubscribe()
      manager.destroy()
      managerRef.current = null
      window.removeEventListener("interviewTerminated", handleTermination)
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [accessToken, isLoading, interviewId, showToast])

  /* -------------------------
     Wait for auth
  -------------------------- */

  if (isLoading || !accessToken) return null

  /* -------------------------
     Terminated — block all interaction
  -------------------------- */

  if (terminated) return <TerminatedScreen reason={terminated} />

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="min-h-screen bg-slate-950">
      {children}

      <ViolationToast violation={lastViolation} />

      {fullscreenExited && (
        <FullscreenPrompt onEnter={enterFullscreen} />
      )}
    </div>
  )
}