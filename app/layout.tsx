import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { AuthProvider } from "@/lib/auth-context"
import Footer from "@/components/layout/footer"

import "./globals.css"

/* ===============================
   Fonts
=============================== */

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
})

/* ===============================
   Metadata
=============================== */

export const metadata: Metadata = {
  title: {
    default: "TrueHire — Secure Interview Platform",
    template: "%s | TrueHire",
  },
  description:
    "Conduct secure remote interviews with AI-powered analysis and anti-cheating protection.",
  keywords: ["interview platform", "remote interviews", "anti-cheat", "AI analysis", "hiring"],
  authors: [{ name: "TrueHire" }],
  robots: "noindex, nofollow", // private platform — don't index
  icons: {
    icon: "/favicon.ico",
  },
}

export const viewport: Viewport = {
  themeColor: "#020617", // slate-950 — matches app background
  width: "device-width",
  initialScale: 1,
}

/* ===============================
   Layout
=============================== */

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased min-h-screen flex flex-col bg-slate-950 text-slate-100">
        <AuthProvider>
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </AuthProvider>

        <Analytics />
      </body>
    </html>
  )
}