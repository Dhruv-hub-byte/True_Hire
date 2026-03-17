import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendForgotPasswordEmail } from "@/lib/email"
import crypto from "crypto"

/* =====================================================
   RATE LIMITING — 3 per hour per email
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
   POST /api/auth/forgot-password
===================================================== */

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    if (isRateLimited(normalizedEmail)) {
      return NextResponse.json(
        { error: "Too many requests. Please wait an hour before trying again." },
        { status: 429 }
      )
    }

    /* -------------------------
       Always return success to prevent email enumeration
       (don't reveal whether email exists)
    -------------------------- */

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail, deletedAt: null },
      select: { id: true, name: true, email: true },
    })

    if (user) {
      // Delete any existing reset tokens for this user
      await prisma.session.deleteMany({
        where: {
          userId: user.id,
          token:  { startsWith: "reset:" },
        },
      })

      // Generate secure token
      const token    = crypto.randomBytes(32).toString("hex")
      const hashed   = crypto.createHash("sha256").update(token).digest("hex")
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

      // Store hashed token in session table
      await prisma.session.create({
        data: {
          token:     `reset:${hashed}`,
          userId:    user.id,
          expiresAt,
          userAgent: "password-reset",
        },
      })

      // Send email (fire and forget)
      sendForgotPasswordEmail(user.email, user.name, token).catch((err) => {
        console.error("Failed to send reset email:", err instanceof Error ? err.message : err)
      })
    }

    return NextResponse.json({
      success: true,
      message: "If that email exists, we sent a password reset link.",
    })
  } catch (error) {
    console.error("Forgot password error:", error instanceof Error ? error.message : error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}