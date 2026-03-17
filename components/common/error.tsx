"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

/* =====================================================
   PROPS
===================================================== */

interface ErrorProps {
  title?: string
  message?: string
  onRetry?: () => void
  showBack?: boolean
}

/* =====================================================
   COMPONENT
===================================================== */

export default function ErrorComponent({
  title = "Something went wrong",
  message = "An unexpected error occurred. Please try again.",
  onRetry,
  showBack = false,
}: ErrorProps) {
  const router = useRouter()

  const handleRetry = () => {
    if (onRetry) return onRetry()
    router.refresh()
  }

  return (
    <div className="flex items-center justify-center min-h-[300px] p-4">
      <Card className="w-full max-w-md bg-slate-900/80 border-slate-700/50 rounded-2xl shadow-2xl backdrop-blur-xl">
        <CardContent className="p-8 text-center space-y-5">

          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-red-400" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-lg font-semibold text-white">
            {title}
          </h2>

          {/* Message */}
          <p className="text-sm text-slate-400 leading-relaxed">
            {message}
          </p>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-1">
            <Button
              onClick={handleRetry}
              className="w-full h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>

            {showBack && (
              <Button
                variant="outline"
                onClick={() => router.back()}
                className="w-full h-10 rounded-xl border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700 hover:text-white gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Go Back
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}