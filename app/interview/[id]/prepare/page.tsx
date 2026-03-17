"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"

import Loading from "@/components/common/loading"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import {
  CheckCircle2,
  AlertCircle,
  Video,
  Mic,
  Wifi,
  HardDrive,
  Maximize,
  Camera,
  RefreshCw,
  ArrowLeft,
} from "lucide-react"

/* =====================================================
   TYPES
===================================================== */

interface SystemCheck {
  camera:      boolean | null // null = not yet checked
  microphone:  boolean | null
  internet:    boolean | null
  storage:     boolean | null
  fullscreen:  boolean | null
}

/* =====================================================
   CHECK ITEM
===================================================== */

function CheckItem({
  label,
  description,
  status,
  icon: Icon,
}: {
  label: string
  description: string
  status: boolean | null
  icon: React.ElementType
}) {
  return (
    <div className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
      status === null  ? "bg-slate-800/40 border-slate-700/50" :
      status === true  ? "bg-green-500/5 border-green-500/20" :
                         "bg-red-500/5 border-red-500/20"
    }`}>
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
          status === null  ? "bg-slate-700" :
          status === true  ? "bg-green-500/10" :
                             "bg-red-500/10"
        }`}>
          <Icon className={`w-4 h-4 ${
            status === null  ? "text-slate-400" :
            status === true  ? "text-green-400" :
                               "text-red-400"
          }`} />
        </div>
        <div>
          <p className="text-sm font-medium text-white">{label}</p>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
      </div>

      {status === null ? (
        <div className="w-4 h-4 border-2 border-slate-600 border-t-slate-300 rounded-full animate-spin" />
      ) : status ? (
        <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
      ) : (
        <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
      )}
    </div>
  )
}

/* =====================================================
   PAGE
===================================================== */

export default function InterviewPreparePage() {
  const params = useParams()
  const router = useRouter()

  const interviewId = params.id as string

  const [checking, setChecking] = useState(true)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const [systemCheck, setSystemCheck] = useState<SystemCheck>({
    camera:     null,
    microphone: null,
    internet:   null,
    storage:    null,
    fullscreen: null,
  })

  /* -------------------------
     Attach stream to video element
  -------------------------- */

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream
    }
  }, [cameraStream])

  /* -------------------------
     Cleanup camera on unmount
  -------------------------- */

  useEffect(() => {
    return () => {
      cameraStream?.getTracks().forEach((t) => t.stop())
    }
  }, [cameraStream])

  /* =====================================================
     SYSTEM CHECK
  ===================================================== */

  const checkSystem = useCallback(async () => {
    setChecking(true)

    // Reset all to null (pending)
    setSystemCheck({
      camera:     null,
      microphone: null,
      internet:   null,
      storage:    null,
      fullscreen: null,
    })

    // Stop any existing camera stream before re-checking
    cameraStream?.getTracks().forEach((t) => t.stop())
    setCameraStream(null)

    /* -------------------------
       Camera
    -------------------------- */

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      setCameraStream(stream)
      setSystemCheck((p) => ({ ...p, camera: true }))
    } catch {
      setSystemCheck((p) => ({ ...p, camera: false }))
    }

    /* -------------------------
       Microphone
    -------------------------- */

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((t) => t.stop())
      setSystemCheck((p) => ({ ...p, microphone: true }))
    } catch {
      setSystemCheck((p) => ({ ...p, microphone: false }))
    }

    /* -------------------------
       Internet — ping a known reliable endpoint
    -------------------------- */

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 3000)

      await fetch("https://www.google.com/generate_204", {
        method: "HEAD",
        mode: "no-cors",
        signal: controller.signal,
      })

      clearTimeout(timeout)
      setSystemCheck((p) => ({ ...p, internet: true }))
    } catch {
      setSystemCheck((p) => ({ ...p, internet: navigator.onLine }))
    }

    /* -------------------------
       Storage
    -------------------------- */

    try {
      localStorage.setItem("__truehire_check__", "1")
      localStorage.removeItem("__truehire_check__")
      setSystemCheck((p) => ({ ...p, storage: true }))
    } catch {
      setSystemCheck((p) => ({ ...p, storage: false }))
    }

    /* -------------------------
       Fullscreen support
    -------------------------- */

    setSystemCheck((p) => ({
      ...p,
      fullscreen: !!document.fullscreenEnabled,
    }))

    setChecking(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    checkSystem()
  }, [checkSystem])

  /* =====================================================
     DERIVED STATE
  ===================================================== */

  const allChecksPassed =
    !checking &&
    Object.values(systemCheck).every((v) => v === true)

  const hasFailures =
    !checking &&
    Object.values(systemCheck).some((v) => v === false)

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="min-h-screen bg-slate-950 py-10">
      <div className="max-w-2xl mx-auto px-4 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Interview Preparation
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Verify your system meets all requirements before starting.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="h-9 rounded-xl border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700 hover:text-white gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>

        {/* Camera Preview */}
        <Card className="bg-slate-900/80 border-slate-700/50 rounded-2xl overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Camera className="w-4 h-4 text-indigo-400" />
              Camera Preview
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              Make sure your face is clearly visible and well-lit
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {cameraStream ? (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full bg-black aspect-video object-cover"
              />
            ) : (
              <div className="w-full aspect-video bg-slate-800/60 flex flex-col items-center justify-center gap-2">
                <Camera className="w-8 h-8 text-slate-600" />
                <p className="text-slate-500 text-sm">
                  {checking ? "Requesting camera access..." : "Camera unavailable"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Requirements */}
        <Card className="bg-slate-900/80 border-slate-700/50 rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base">System Requirements</CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              {checking
                ? "Running checks..."
                : allChecksPassed
                ? "All checks passed — you're ready to start"
                : "Some checks failed — please resolve before continuing"
              }
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-2.5">
            <CheckItem
              label="Camera"
              description="Required for video interview"
              status={systemCheck.camera}
              icon={Video}
            />
            <CheckItem
              label="Microphone"
              description="Required for audio communication"
              status={systemCheck.microphone}
              icon={Mic}
            />
            <CheckItem
              label="Internet Connection"
              description="Stable connection required throughout"
              status={systemCheck.internet}
              icon={Wifi}
            />
            <CheckItem
              label="Local Storage"
              description="Required for saving interview progress"
              status={systemCheck.storage}
              icon={HardDrive}
            />
            <CheckItem
              label="Fullscreen Support"
              description="Required to prevent tab switching"
              status={systemCheck.fullscreen}
              icon={Maximize}
            />
          </CardContent>
        </Card>

        {/* Failure guidance */}
        {hasFailures && (
          <div className="flex items-start gap-2.5 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="font-medium">Some requirements are not met</p>
              <p className="text-red-400/80 text-xs">
                {!systemCheck.camera && "• Allow camera access in your browser settings. "}
                {!systemCheck.microphone && "• Allow microphone access in your browser settings. "}
                {!systemCheck.internet && "• Check your internet connection. "}
                {!systemCheck.storage && "• Enable cookies and local storage in your browser. "}
                {!systemCheck.fullscreen && "• Your browser does not support fullscreen mode. "}
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={checkSystem}
            disabled={checking}
            className="h-11 px-5 rounded-xl border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700 hover:text-white gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? "animate-spin" : ""}`} />
            Recheck
          </Button>

          <Button
            className="flex-1 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-500/20 gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-indigo-600"
            disabled={!allChecksPassed || checking}
            onClick={() => router.push(`/interview/${interviewId}`)}
          >
            <Video className="w-4 h-4" />
            {checking ? "Checking..." : "Start Interview"}
          </Button>
        </div>
      </div>
    </div>
  )
}