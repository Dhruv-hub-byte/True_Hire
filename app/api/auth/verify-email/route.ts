import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"

/* =====================================================
   HELPER
===================================================== */

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex")
}

/* =====================================================
   POST /api/auth/verify-email
   Verifies the token submitted from the page form
===================================================== */

export async function POST(req: NextRequest) {
  try {
    const body  = await req.json()
    const token = body.token as string
    const email = body.email as string

    if (!token || !email) {
      return NextResponse.json(
        { error: "Token and email are required" },
        { status: 400 }
      )
    }

    const hashed  = hashToken(token)
    const session = await prisma.session.findFirst({
      where: {
        token:     `verify:${hashed}`,
        expiresAt: { gt: new Date() },
        user:      { email },
      },
      select: { id: true, userId: true },
    })

    if (!session) {
      return NextResponse.json(
        { error: "Invalid or expired verification link. Please request a new one." },
        { status: 400 }
      )
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: session.userId },
        data:  { emailVerified: true, status: "ACTIVE" },
      }),
      prisma.session.delete({
        where: { id: session.id },
      }),
    ])

    return NextResponse.json({
      success: true,
      message: "Email verified successfully. You can now log in.",
    })
  } catch (error) {
    console.error("Email verify error:", error instanceof Error ? error.message : error)
    return NextResponse.json({ error: "Verification failed" }, { status: 500 })
  }
}

/* =====================================================
   GET /api/auth/verify-email?token=...&email=...
   Direct link click from email
===================================================== */

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get("token")
  const email = searchParams.get("email")

  if (!token || !email) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?error=missing`
    )
  }

  const hashed  = hashToken(token)
  const session = await prisma.session.findFirst({
    where: {
      token:     `verify:${hashed}`,
      expiresAt: { gt: new Date() },
      user:      { email },
    },
    select: { id: true, userId: true },
  })

  if (!session) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?error=invalid`
    )
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: session.userId },
      data:  { emailVerified: true, status: "ACTIVE" },
    }),
    prisma.session.delete({
      where: { id: session.id },
    }),
  ])

  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?success=true`
  )
}