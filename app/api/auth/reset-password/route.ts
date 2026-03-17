import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hashPassword, validatePasswordStrength } from "@/lib/auth"
import crypto from "crypto"

/* =====================================================
   POST /api/auth/reset-password
===================================================== */

export async function POST(req: NextRequest) {
  try {
    const { token, email, password } = await req.json()

    if (!token || !email || !password) {
      return NextResponse.json(
        { error: "Token, email and password are required" },
        { status: 400 }
      )
    }

    /* -------------------------
       Validate password strength
    -------------------------- */

    const strength = validatePasswordStrength(password)
    if (!strength.isStrong) {
      return NextResponse.json(
        { error: strength.errors[0] },
        { status: 400 }
      )
    }

    /* -------------------------
       Find reset session
    -------------------------- */

    const hashed  = crypto.createHash("sha256").update(token).digest("hex")

    const session = await prisma.session.findFirst({
      where: {
        token:     `reset:${hashed}`,
        expiresAt: { gt: new Date() },
        user:      { email: email.toLowerCase().trim() },
      },
      select: { id: true, userId: true },
    })

    if (!session) {
      return NextResponse.json(
        { error: "Invalid or expired reset link. Please request a new one." },
        { status: 400 }
      )
    }

    /* -------------------------
       Update password + delete reset session + delete all auth sessions
      (forces re-login on all devices)
    -------------------------- */

    const newHash = await hashPassword(password)

    await prisma.$transaction([
      prisma.user.update({
        where: { id: session.userId },
        data:  { password: newHash },
      }),
      // Delete the reset token
      prisma.session.delete({
        where: { id: session.id },
      }),
      // Delete all active login sessions (security: logout all devices)
      prisma.session.deleteMany({
        where: {
          userId: session.userId,
          token:  { not: { startsWith: "verify:" } },
          NOT:    { id: session.id },
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      message: "Password reset successfully. You can now log in.",
    })
  } catch (error) {
    console.error("Reset password error:", error instanceof Error ? error.message : error)
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 })
  }
}