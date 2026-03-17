"use client"

interface LoadingProps {
  text?: string
  fullScreen?: boolean
}

export default function Loading({
  text = "Loading...",
  fullScreen = true,
}: LoadingProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${
      fullScreen ? "min-h-screen bg-slate-950" : "py-10"
    }`}>
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-slate-400 font-medium">{text}</p>
    </div>
  )
}