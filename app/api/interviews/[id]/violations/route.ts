import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { withAuth, AuthenticatedRequest } from "@/lib/middleware"

/* ======================================================
   RATE LIMITING (in-memory — swap for Upstash in prod)
====================================================== */

const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX = 30

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

/* ======================================================
   VALIDATION
====================================================== */

const violationSchema = z.object({
  type: z.enum([
    "TAB_SWITCH",
    "FOCUS_LOSS",
    "COPY_PASTE_ATTEMPT",
    "RIGHT_CLICK_ATTEMPT",
    "TEXT_SELECTION_ATTEMPT",
    "MULTIPLE_MONITORS",
    "SUSPICIOUS_BEHAVIOR",
  ]),
  description: z.string().max(1000, "Description too long").default(""),
  severity: z.number().int().min(1).max(5).default(1),
})

/* ======================================================
   GET /api/interviews/[id]/violations
   Fetch all violations for an interview
====================================================== */

async function getHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authReq = req as AuthenticatedRequest

  if (!authReq.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const ip = getClientIp(req)

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429 }
      )
    }

    const { id: interviewId } = await params

    /* -------------------------
       Validate interview exists
    -------------------------- */

    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      select: {
        id: true,
        candidateId: true,
        interviewerId: true,
      },
    })

    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 })
    }

    /* -------------------------
       Access control:
       candidate, interviewer, or ADMIN
    -------------------------- */

    const { userId, role } = authReq.user

    const isParticipant =
      interview.candidateId === userId ||
      interview.interviewerId === userId

    if (!isParticipant && role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    /* -------------------------
       Fetch violations
       select only safe user fields — no password
    -------------------------- */

    const violations = await prisma.violation.findMany({
      where: { interviewId },
      select: {
        id: true,
        type: true,
        description: true,
        severity: true,
        timestamp: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            profileImage: true,
          },
        },
      },
      orderBy: { timestamp: "desc" },
    })

    return NextResponse.json({
      success: true,
      data: violations,
      total: violations.length,
    })
  } catch (error) {
    console.error("Violation fetch error:", error instanceof Error ? error.message : error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/* ======================================================
   POST /api/interviews/[id]/violations
   Create a violation — candidate or interviewer only
====================================================== */

async function postHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authReq = req as AuthenticatedRequest

  if (!authReq.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const ip = getClientIp(req)

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429 }
      )
    }

    const { id: interviewId } = await params

    /* -------------------------
       Validate interview exists + status
    -------------------------- */

    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      select: {
        id: true,
        candidateId: true,
        interviewerId: true,
        status: true,
      },
    })

    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 })
    }

    /* -------------------------
       Only allow violations during active interview
    -------------------------- */

    if (interview.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Violations can only be recorded during an active interview" },
        { status: 400 }
      )
    }

    /* -------------------------
       Only candidate or interviewer can record violations
       ADMIN excluded intentionally — violations are system/participant events
    -------------------------- */

    const { userId } = authReq.user

    const isParticipant =
      interview.candidateId === userId ||
      interview.interviewerId === userId

    if (!isParticipant) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    /* -------------------------
       Validate body
    -------------------------- */

    const body = await req.json()
    const parsed = violationSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { type, description, severity } = parsed.data

    /* -------------------------
       Create violation + update cheatingProbability atomically
       Weight by severity so high-severity violations count more
    -------------------------- */

    const violation = await prisma.violation.create({
      data: {
        type,
        description,
        severity,
        interview: { connect: { id: interviewId } },
        user: { connect: { id: userId } },
      },
      select: {
        id: true,
        type: true,
        description: true,
        severity: true,
        timestamp: true,
        createdAt: true,
      },
    })

    /* -------------------------
       Recalculate cheating probability
       Weighted by severity: each violation contributes (severity / 5) * 0.15
       Capped at 0.95
    -------------------------- */

    const allViolations = await prisma.violation.findMany({
      where: { interviewId },
      select: { severity: true },
    })

    const weightedScore = allViolations.reduce(
      (sum, v) => sum + (v.severity / 5) * 0.15,
      0
    )

    const cheatingProbability = Math.min(weightedScore, 0.95)

    await prisma.interview.update({
      where: { id: interviewId },
      data: { cheatingProbability },
    })

    return NextResponse.json(
      { success: true, data: violation },
      { status: 201 }
    )
  } catch (error) {
    console.error("Violation create error:", error instanceof Error ? error.message : error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/* ======================================================
   EXPORT
====================================================== */

export const GET = withAuth(getHandler)
export const POST = withAuth(postHandler)