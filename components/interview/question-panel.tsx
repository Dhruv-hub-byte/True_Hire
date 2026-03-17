"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Send, ChevronLeft, ChevronRight, CheckCircle2, Code } from "lucide-react"

/* ======================================================
   TYPES — aligned with updated schema question fields
====================================================== */

export interface QuestionItem {
  id: string
  text: string
  type: string
  codeTemplate: string | null
}

interface Props {
  questions?: QuestionItem[]
  onSubmit: (answers: Record<string, string>) => Promise<void>
  submitting?: boolean // controlled from parent (interview page)
}

/* ======================================================
   COMPONENT
====================================================== */

export default function QuestionPanel({
  questions = [],
  onSubmit,
  submitting: externalSubmitting = false,
}: Props) {
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [internalSubmitting, setInternalSubmitting] = useState(false)

  // Use external submitting state if provided, otherwise fall back to internal
  const isSubmitting = externalSubmitting || internalSubmitting

  /* ======================================================
     EMPTY / GUARD STATES
  ====================================================== */

  if (!questions.length) {
    return (
      <Card className="bg-slate-900/70 border-slate-700/50 rounded-2xl">
        <CardContent className="py-16 flex flex-col items-center text-center gap-2">
          <p className="text-slate-400 font-medium">No questions available</p>
          <p className="text-slate-500 text-sm">This interview has no questions assigned yet</p>
        </CardContent>
      </Card>
    )
  }

  const current = questions[index]

  if (!current) {
    return (
      <Card className="bg-slate-900/70 border-slate-700/50 rounded-2xl">
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
        </CardContent>
      </Card>
    )
  }

  /* ======================================================
     HANDLERS
  ====================================================== */

  const handleAnswer = (value: string) => {
    setAnswers((prev) => ({ ...prev, [current.id]: value }))
  }

  const next = () => {
    if (index < questions.length - 1) setIndex((p) => p + 1)
  }

  const prev = () => {
    if (index > 0) setIndex((p) => p - 1)
  }

  const handleSubmit = async () => {
    try {
      setInternalSubmitting(true)
      await onSubmit(answers)
    } finally {
      setInternalSubmitting(false)
    }
  }

  /* ======================================================
     DERIVED
  ====================================================== */

  const progress = ((index + 1) / questions.length) * 100
  const answeredCount = Object.keys(answers).filter((k) => answers[k]?.trim()).length
  const isLastQuestion = index === questions.length - 1
  const isCodeQuestion = current.type === "CODE" || current.type === "CODING"
  const currentAnswer = answers[current.id] || ""

  /* ======================================================
     UI
  ====================================================== */

  return (
    <Card className="bg-slate-900/80 border-slate-700/50 rounded-2xl shadow-xl">

      {/* Header */}
      <CardHeader className="pb-3 px-5 pt-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle className="text-white text-base font-semibold">
            Question {index + 1}
            <span className="text-slate-500 font-normal"> of {questions.length}</span>
          </CardTitle>

          {/* Answered count */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
            {answeredCount} of {questions.length} answered
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3">
          <div
            className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Question dot indicators */}
        <div className="flex items-center gap-1.5 mt-3 flex-wrap">
          {questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setIndex(i)}
              className={`w-6 h-6 rounded-md text-xs font-medium transition-colors ${
                i === index
                  ? "bg-indigo-600 text-white"
                  : answers[q.id]?.trim()
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-slate-800 text-slate-500 hover:bg-slate-700"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </CardHeader>

      {/* Body */}
      <CardContent className="space-y-4 px-5 pb-5">

        {/* Question type badge */}
        {isCodeQuestion && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-medium">
            <Code className="w-3 h-3" />
            Coding Question
          </div>
        )}

        {/* Question text */}
        <p className="text-slate-100 text-base leading-relaxed font-medium">
          {current.text}
        </p>

        {/* Code template hint */}
        {isCodeQuestion && current.codeTemplate && (
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3">
            <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide">
              Starter Template
            </p>
            <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap overflow-x-auto">
              {current.codeTemplate}
            </pre>
          </div>
        )}

        {/* Answer textarea */}
        <div className="relative">
          <textarea
            placeholder={
              isCodeQuestion
                ? "Write your code here..."
                : "Type your answer here..."
            }
            value={currentAnswer}
            onChange={(e) => handleAnswer(e.target.value)}
            disabled={isSubmitting}
            rows={isCodeQuestion ? 10 : 6}
            data-allow-paste
            data-allow-select
            className={`w-full rounded-xl border bg-slate-800/60 text-white placeholder:text-slate-500 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors resize-none disabled:opacity-50 ${
              isCodeQuestion ? "font-mono" : ""
            } ${
              currentAnswer.trim()
                ? "border-green-500/30"
                : "border-slate-700"
            }`}
          />
          {/* Character count */}
          <p className="absolute bottom-2 right-3 text-xs text-slate-600">
            {currentAnswer.length} chars
          </p>
        </div>

        {/* Navigation + submit */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <Button
            variant="outline"
            size="sm"
            disabled={index === 0 || isSubmitting}
            onClick={prev}
            className="h-10 px-4 rounded-xl border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700 hover:text-white gap-1.5 disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>

          {!isLastQuestion ? (
            <Button
              size="sm"
              onClick={next}
              disabled={isSubmitting}
              className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="h-10 px-5 rounded-xl bg-green-600 hover:bg-green-500 text-white gap-1.5 shadow shadow-green-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Interview
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}