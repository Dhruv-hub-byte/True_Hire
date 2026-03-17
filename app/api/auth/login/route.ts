import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import {
  comparePassword,
  generateToken,
  generateRefreshToken,
} from "@/lib/auth"

/* =====================================================
   RATE LIMITING (in-memory — swap for Upstash in prod)
===================================================== */

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const RATE_LIMIT_MAX = 10

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  if (entry.count >= RATE_LIMIT_MAX) return true

  entry.count++
  return false
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  )
}

/* =====================================================
   CONSTANTS
===================================================== */

const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 30 // 30 days in seconds

/* =====================================================
   VALIDATION
===================================================== */

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
})

/* =====================================================
   ROUTE
===================================================== */

export async function POST(req: NextRequest) {
  try {
    /* -------------------------
       Rate limiting
    -------------------------- */

    const ip = getClientIp(req)

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429 }
      )
    }

    /* -------------------------
       Validate input
    -------------------------- */

    const body = await req.json()
    const validation = loginSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { email, password } = validation.data

    /* -------------------------
       Find user
    -------------------------- */

    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

    /* -------------------------
       Check active
    -------------------------- */

    if (user.deletedAt !== null) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 401 }
      )
    }

    if (!user.isActive || user.status === "SUSPENDED") {
      return NextResponse.json(
        { error: "Account inactive or suspended" },
        { status: 403 }
      )
    }

    /* -------------------------
       Verify password
    -------------------------- */

    const valid = await comparePassword(password, user.password)

    if (!valid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

    /* -------------------------
       Generate tokens
    -------------------------- */

    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role as "ADMIN" | "INTERVIEWER" | "CANDIDATE",
    }

    const accessToken = generateToken(payload)
    const refreshToken = generateRefreshToken(user.id)

    /* -------------------------
       Hash refresh token for storage
    -------------------------- */

    const hashedToken = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex")

    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE * 1000)

    /* -------------------------
       Clean expired sessions + save new session
    -------------------------- */

    await prisma.$transaction([
      prisma.session.deleteMany({
        where: { userId: user.id, expiresAt: { lt: new Date() } },
      }),
      prisma.session.create({
        data: {
          token: hashedToken,
          userId: user.id,
          expiresAt,
          ipAddress: getClientIp(req),
          userAgent: req.headers.get("user-agent") ?? null,
        },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }),
    ])

    /* -------------------------
       Build response
    -------------------------- */

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      tokens: { accessToken },
    })

    response.cookies.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: REFRESH_TOKEN_MAX_AGE,
    })

    return response
  } catch (error) {
    console.error("Login error FULL:", error)
    console.error("Login error message:", error instanceof Error ? error.message : error)
    console.error("Login error stack:", error instanceof Error ? error.stack : "no stack")

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}