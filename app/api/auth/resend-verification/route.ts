import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendVerificationEmail } from "@/lib/email"

/* =====================================================
   RATE LIMITING — strict, 3 per hour per email
===================================================== */

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(email: string): boolean {
  const now   = Date.now()
  const entry = rateLimitMap.get(email)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(email, { count: 1, resetAt: now + 60 * 60 * 1000 })
    return false
  }
  if (entry.count >= 3) return true
  entry.count++
  return false
}

/* =====================================================
   POST /api/auth/resend-verification
   Resends the verification email
===================================================== */

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    if (isRateLimited(email)) {
      return NextResponse.json(
        { error: "Too many requests. Please wait an hour before trying again." },
        { status: 429 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, emailVerified: true, deletedAt: true },
    })

    // Always return success to prevent email enumeration
    if (!user || user.deletedAt !== null || user.emailVerified) {
      return NextResponse.json({
        success: true,
        message: "If that email exists and is unverified, we sent a new link.",
      })
    }

    // Delete any existing verification sessions first
    await prisma.session.deleteMany({
      where: {
        userId: user.id,
        token:  { startsWith: "verify:" },
      },
    })

    await sendVerificationEmail(user.id, user.email, user.name)

    return NextResponse.json({
      success: true,
      message: "Verification email sent. Check your inbox.",
    })
  } catch (error) {
    console.error("Resend verification error:", error instanceof Error ? error.message : error)
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
  }
}