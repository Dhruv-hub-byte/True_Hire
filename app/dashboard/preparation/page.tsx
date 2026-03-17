"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, CheckCircle2, AlertTriangle, Lightbulb, Monitor, Mic, Wifi, Clock, Code, MessageSquare } from "lucide-react"

/* =====================================================
   DATA
===================================================== */

const sections = [
  {
    icon: Monitor,
    color: "text-indigo-400",
    bg: "bg-indigo-500/10 border-indigo-500/20",
    title: "Setup your environment",
    tips: [
      "Use a laptop or desktop — mobile devices are not supported for interviews",
      "Use Google Chrome or Firefox for best compatibility",
      "Close all unnecessary tabs and applications before starting",
      "Make sure your screen is clean and readable",
      "Disable notifications and Do Not Disturb mode",
    ],
  },
  {
    icon: Wifi,
    color: "text-green-400",
    bg: "bg-green-500/10 border-green-500/20",
    title: "Internet and connectivity",
    tips: [
      "Use a wired connection if possible — WiFi can drop",
      "Test your speed at fast.com — at least 5 Mbps upload recommended",
      "Sit close to your router if using WiFi",
      "Ask others in your home to avoid heavy downloading during your interview",
      "Have a mobile hotspot ready as a backup",
    ],
  },
  {
    icon: Mic,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10 border-yellow-500/20",
    title: "Camera and microphone",
    tips: [
      "Test your camera and microphone using the Prepare page before every interview",
      "Use headphones to avoid audio feedback",
      "Position your camera at eye level — not looking up or down",
      "Make sure your face is well lit — sit facing a window or lamp",
      "Avoid a bright background or window behind you",
    ],
  },
  {
    icon: AlertTriangle,
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
    title: "Anti-cheat rules — avoid violations",
    tips: [
      "Do NOT switch tabs or open other windows during the interview",
      "Do NOT copy or paste any text during the interview",
      "Do NOT right-click anywhere on the page",
      "Stay in fullscreen mode for the entire interview",
      "Do NOT open developer tools (F12)",
      "Keep your camera on and your face visible at all times",
    ],
    warning: true,
  },
  {
    icon: Code,
    color: "text-violet-400",
    bg: "bg-violet-500/10 border-violet-500/20",
    title: "Answering coding questions",
    tips: [
      "Read the entire question carefully before writing any code",
      "Think out loud — explain your approach before coding",
      "Start with a simple solution, then optimise",
      "Consider edge cases: empty input, nulls, large numbers",
      "Use clear variable names — readability matters",
      "If you are stuck, explain what you know and what you are trying",
    ],
  },
  {
    icon: MessageSquare,
    color: "text-teal-400",
    bg: "bg-teal-500/10 border-teal-500/20",
    title: "Answering general questions",
    tips: [
      "Use the STAR method: Situation, Task, Action, Result",
      "Be specific — give concrete examples from real experience",
      "Keep answers focused — 1-2 minutes per question is ideal",
      "If you need a moment to think, say so — it shows composure",
      "Be honest about what you don't know — offer to reason through it",
    ],
  },
  {
    icon: Clock,
    color: "text-orange-400",
    bg: "bg-orange-500/10 border-orange-500/20",
    title: "Day of the interview",
    tips: [
      "Join 5-10 minutes early using the Prepare page",
      "Keep a glass of water nearby",
      "Have a notepad and pen for rough work",
      "Dress professionally even for remote interviews",
      "Take a few deep breaths before starting — nerves are normal",
    ],
  },
  {
    icon: Lightbulb,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
    title: "Common mistakes to avoid",
    tips: [
      "Don't rush — take your time to think before answering",
      "Don't give one-word answers — elaborate with context",
      "Don't speak negatively about previous employers or teams",
      "Don't leave questions blank — a partial answer is better than nothing",
      "Don't memorise answers — interviewers can tell",
    ],
  },
]

/* =====================================================
   PAGE
===================================================== */

export default function PreparationPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 py-6 px-4">

      {/* Back */}
      <Link
        href="/dashboard/candidate"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-300 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to dashboard
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Interview Preparation</h1>
        <p className="text-slate-400 text-sm mt-1">
          Everything you need to know to perform your best
        </p>
      </div>

      {/* Quick checklist */}
      <Card className="bg-indigo-900/20 border-indigo-500/20 rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-indigo-300 text-sm font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Quick checklist — do this before every interview
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-5">
          <div className="grid sm:grid-cols-2 gap-2">
            {[
              "Open the Prepare page and run all checks",
              "Close all other tabs and apps",
              "Put phone on silent",
              "Find a quiet room",
              "Test camera and microphone",
              "Check your internet connection",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-indigo-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tips sections */}
      <div className="space-y-4">
        {sections.map((section) => (
          <Card
            key={section.title}
            className={`rounded-2xl ${
              section.warning
                ? "bg-red-900/10 border-red-500/20"
                : "bg-slate-900/80 border-slate-700/50"
            }`}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm font-semibold flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${section.bg}`}>
                  <section.icon className={`w-3.5 h-3.5 ${section.color}`} />
                </div>
                {section.title}
                {section.warning && (
                  <span className="ml-auto text-xs text-red-400 font-medium">Important</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-5">
              <ul className="space-y-2">
                {section.tips.map((tip) => (
                  <li key={tip} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${
                      section.warning ? "bg-red-400" : section.color.replace("text-", "bg-")
                    }`} />
                    {tip}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}