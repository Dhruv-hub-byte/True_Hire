"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import {
  Video, VideoOff, Loader2,
  AlertCircle, Maximize2, Minimize2,
  PhoneOff, PhoneCall,
} from "lucide-react"
import { Button } from "@/components/ui/button"

/* =====================================================
   TYPES
===================================================== */

interface Props {
  interviewId: string
  // Show call UI only — no join button needed
  autoJoin?:   boolean
}

/* =====================================================
   COMPONENT
===================================================== */

export default function VideoCall({ interviewId, autoJoin = false }: Props) {
  const { accessToken } = useAuth()

  const [roomUrl,    setRoomUrl]    = useState<string | null>(null)
  const [joined,     setJoined]     = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [expanded,   setExpanded]   = useState(false)

  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  /* -------------------------
     Get or create room
  -------------------------- */

  const getRoom = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    setError(null)

    try {
      const res  = await fetch(`/api/interviews/${interviewId}/video-room`, {
        method:  "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to get video room")
      setRoomUrl(json.url)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to start video call")
    } finally {
      setLoading(false)
    }
  }, [accessToken, interviewId])

  // Auto-join on mount if prop set
  useEffect(() => {
    if (autoJoin) {
      getRoom().then(() => setJoined(true))
    }
  }, [autoJoin]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleJoin() {
    await getRoom()
    setJoined(true)
  }

  function handleLeave() {
    setJoined(false)
    setRoomUrl(null)
  }

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className={`bg-slate-900/80 border border-slate-700/50 rounded-2xl overflow-hidden flex flex-col ${
      expanded ? "fixed inset-4 z-50 shadow-2xl" : ""
    }`}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-indigo-400" />
          <span className="text-white text-sm font-medium">Live Video Call</span>
          {joined && (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Live
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Expand / collapse */}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {expanded
              ? <Minimize2 className="w-3.5 h-3.5" />
              : <Maximize2 className="w-3.5 h-3.5" />
            }
          </button>

          {/* Leave call */}
          {joined && (
            <button
              onClick={handleLeave}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:text-white hover:bg-red-500/20 transition-colors"
              title="Leave call"
            >
              <PhoneOff className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className={`flex-1 ${expanded ? "min-h-0" : "aspect-video"}`}>

        {/* Not joined yet */}
        {!joined && (
          <div className="h-full flex flex-col items-center justify-center gap-4 p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Video className="w-8 h-8 text-indigo-400" />
            </div>
            <div>
              <p className="text-white font-semibold">Video call with interviewer</p>
              <p className="text-slate-400 text-xs mt-1">
                Join to start a live video session
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs w-full max-w-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <Button
              onClick={handleJoin}
              disabled={loading}
              className="h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" />Connecting...</>
                : <><PhoneCall className="w-4 h-4" />Join Video Call</>
              }
            </Button>
          </div>
        )}

        {/* Daily.co iframe */}
        {joined && roomUrl && (
          <iframe
            ref={iframeRef}
            src={`${roomUrl}?embed=true&showLeaveButton=false&showFullscreenButton=false`}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            className="w-full h-full border-0"
            title="Video call"
          />
        )}

        {/* Loading */}
        {joined && !roomUrl && (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
          </div>
        )}
      </div>

      {/* Overlay backdrop for expanded mode */}
      {expanded && (
        <div
          className="fixed inset-0 bg-black/60 -z-10"
          onClick={() => setExpanded(false)}
        />
      )}
    </div>
  )
}