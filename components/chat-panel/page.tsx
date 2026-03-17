"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { Send, Loader2, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

/* =====================================================
   TYPES
===================================================== */

interface ChatMessage {
  id:         string
  message:    string
  senderRole: "ADMIN" | "INTERVIEWER" | "CANDIDATE"
  createdAt:  string
}

interface Props {
  interviewId:  string
  myRole:       "ADMIN" | "INTERVIEWER" | "CANDIDATE"
  // Set false when interview is COMPLETED or CANCELLED
  canSend?:     boolean
}

/* =====================================================
   HELPERS
===================================================== */

function bubbleClass(role: string, myRole: string): string {
  return role === myRole
    ? "self-end bg-indigo-600 text-white rounded-2xl rounded-br-sm"
    : "self-start bg-slate-700 text-slate-200 rounded-2xl rounded-bl-sm"
}

function roleLabel(role: string, myRole: string): string {
  if (role === myRole) return "You"
  return role.charAt(0) + role.slice(1).toLowerCase()
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit",
  })
}

/* =====================================================
   COMPONENT
===================================================== */

const POLL_INTERVAL_MS = 3000 // poll every 3 seconds

export default function ChatPanel({
  interviewId,
  myRole,
  canSend = true,
}: Props) {
  const { accessToken } = useAuth()

  const [messages,  setMessages]  = useState<ChatMessage[]>([])
  const [input,     setInput]     = useState("")
  const [loading,   setLoading]   = useState(true)
  const [sending,   setSending]   = useState(false)

  const bottomRef    = useRef<HTMLDivElement>(null)
  const lastTimestamp = useRef<string | null>(null)
  const pollRef      = useRef<ReturnType<typeof setInterval> | null>(null)

  /* -------------------------
     Load full history on mount
  -------------------------- */

  const fetchHistory = useCallback(async () => {
    if (!accessToken) return
    try {
      const res  = await fetch(`/api/interviews/${interviewId}/chat`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const json = await res.json()
      if (res.ok && json.data.length > 0) {
        setMessages(json.data)
        // Store timestamp of last message for polling
        lastTimestamp.current = json.data[json.data.length - 1].createdAt
      }
    } catch {
      // Silent — non-critical
    } finally {
      setLoading(false)
    }
  }, [accessToken, interviewId])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  /* -------------------------
     Poll for new messages every 3s
     Only fetches messages AFTER the last known timestamp
     so the payload is tiny
  -------------------------- */

  const pollMessages = useCallback(async () => {
    if (!accessToken) return

    try {
      const after = lastTimestamp.current
        ? `?after=${encodeURIComponent(lastTimestamp.current)}`
        : ""

      const res  = await fetch(
        `/api/interviews/${interviewId}/chat${after}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )

      const json = await res.json()

      if (res.ok && json.data.length > 0) {
        setMessages((prev) => {
          // Deduplicate using id set
          const existing = new Set(prev.map((m) => m.id))
          const fresh    = json.data.filter((m: ChatMessage) => !existing.has(m.id))
          if (fresh.length === 0) return prev
          return [...prev, ...fresh]
        })
        // Update timestamp to last received message
        lastTimestamp.current = json.data[json.data.length - 1].createdAt
      }
    } catch {
      // Silent — poll will retry on next interval
    }
  }, [accessToken, interviewId])

  useEffect(() => {
    pollRef.current = setInterval(pollMessages, POLL_INTERVAL_MS)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [pollMessages])

  /* -------------------------
     Auto-scroll on new message
  -------------------------- */

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  /* -------------------------
     Send message
  -------------------------- */

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || sending) return

    const text = input.trim()
    setInput("")
    setSending(true)

    try {
      const res = await fetch(`/api/interviews/${interviewId}/chat`, {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ message: text }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to send")

      // Add own message immediately — no need to wait for poll
      const newMsg: ChatMessage = json.data
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev
        return [...prev, newMsg]
      })
      lastTimestamp.current = newMsg.createdAt
    } catch (err: unknown) {
      console.error("Send error:", err instanceof Error ? err.message : err)
      setInput(text) // Restore on failure
    } finally {
      setSending(false)
    }
  }

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-400" />
          <span className="text-white text-sm font-medium">Live Chat</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-slate-500">Updates every 3s</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0 scrollbar-hide">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
            <MessageSquare className="w-8 h-8 text-slate-700" />
            <p className="text-slate-500 text-xs">No messages yet</p>
            <p className="text-slate-600 text-xs">
              {canSend ? "Start the conversation" : "Chat is closed"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col gap-0.5 max-w-[80%] ${
                  msg.senderRole === myRole
                    ? "self-end items-end"
                    : "self-start items-start"
                }`}
              >
                <span className="text-xs text-slate-500 px-1">
                  {roleLabel(msg.senderRole, myRole)} · {formatTime(msg.createdAt)}
                </span>
                <div className={`px-3.5 py-2.5 text-sm leading-relaxed ${bubbleClass(msg.senderRole, myRole)}`}>
                  {msg.message}
                </div>
              </div>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {canSend ? (
        <form
          onSubmit={handleSend}
          className="flex gap-2 p-3 border-t border-slate-800 shrink-0"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            disabled={sending}
            maxLength={1000}
            className="flex-1 h-9 rounded-xl bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500 text-sm focus:border-indigo-500"
          />
          <Button
            type="submit"
            disabled={!input.trim() || sending}
            size="sm"
            className="h-9 w-9 p-0 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shrink-0 disabled:opacity-50"
          >
            {sending
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Send className="w-3.5 h-3.5" />
            }
          </Button>
        </form>
      ) : (
        <div className="px-4 py-3 border-t border-slate-800 shrink-0">
          <p className="text-slate-600 text-xs text-center">Chat is closed</p>
        </div>
      )}
    </div>
  )
}