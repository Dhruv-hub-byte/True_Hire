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

const reportSchema = z.object({
  summary: z.string().min(1, "Summary is required").max(5000, "Summary too long"),
  strengths: z
    .array(z.string().min(1).max(500))
    .min(1, "At least one strength is required"),
  weaknesses: z
    .array(z.string().min(1).max(500))
    .min(1, "At least one weakness is required"),
  recommendations: z
    .array(z.string().min(1).max(500))
    .min(1, "At least one recommendation is required"),
  overallScore: z
    .number()
    .min(0, "Score must be at least 0")
    .max(100, "Score cannot exceed 100"),
})

/* ======================================================
   GET /api/interviews/[id]/report
   Fetch report for an interview
====================================================== */

async function getHandler(
  req: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
       Validate interview exists + access
    -------------------------- */

    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      select: {
        id: true,
        candidateId: true,
        interviewerId: true,
        report: {
          select: {
            id: true,
            summary: true,
            strengths: true,
            weaknesses: true,
            recommendations: true,
            overallScore: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    })

    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 })
    }

    /* -------------------------
       Access control:
       candidate, interviewer, or ADMIN
    -------------------------- */

    const { userId, role } = req.user

    const isParticipant =
      interview.candidateId === userId ||
      interview.interviewerId === userId

    if (!isParticipant && role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!interview.report) {
      return NextResponse.json(
        { error: "Report not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: interview.report })
  } catch (error) {
    console.error("Report fetch error:", error instanceof Error ? error.message : error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/* ======================================================
   POST /api/interviews/[id]/report
   Create report — interviewer or ADMIN only
====================================================== */

async function postHandler(
  req: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
       Validate body first — fail fast
    -------------------------- */

    const body = await req.json()
    const parsed = reportSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    /* -------------------------
       Validate interview exists + status
    -------------------------- */

    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      select: {
        id: true,
        interviewerId: true,
        status: true,
        report: { select: { id: true } },
      },
    })

    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 })
    }

    /* -------------------------
       Only interviewer or ADMIN can create reports
    -------------------------- */

    if (
      interview.interviewerId !== req.user.userId &&
      req.user.role !== "ADMIN"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    /* -------------------------
       Only allow reports for completed interviews
    -------------------------- */

    if (interview.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Reports can only be created for completed interviews" },
        { status: 400 }
      )
    }

    /* -------------------------
       Prevent duplicate reports
       report is @unique on interviewId in schema
    -------------------------- */

    if (interview.report) {
      return NextResponse.json(
        { error: "A report already exists for this interview. Use PUT to update it." },
        { status: 409 }
      )
    }

    /* -------------------------
       Create report
       Note: id is @default(cuid()) — Prisma handles it
       updatedAt is @updatedAt — Prisma handles it
    -------------------------- */

    const { summary, strengths, weaknesses, recommendations, overallScore } = parsed.data

    const report = await prisma.report.create({
      data: {
        summary,
        strengths,
        weaknesses,
        recommendations,
        overallScore,
        interview: { connect: { id: interviewId } },
      },
      select: {
        id: true,
        summary: true,
        strengths: true,
        weaknesses: true,
        recommendations: true,
        overallScore: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ success: true, data: report }, { status: 201 })
  } catch (error) {
    console.error("Report create error:", error instanceof Error ? error.message : error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/* ======================================================
   PUT /api/interviews/[id]/report
   Update existing report — interviewer or ADMIN only
====================================================== */

async function putHandler(
  req: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(req)

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429 }
      )
    }

    const { id: interviewId } = await params

    const body = await req.json()
    const parsed = reportSchema.partial().safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    /* -------------------------
       Validate interview + report exist
    -------------------------- */

    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      select: {
        id: true,
        interviewerId: true,
        report: { select: { id: true } },
      },
    })

    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 })
    }

    if (!interview.report) {
      return NextResponse.json(
        { error: "No report exists for this interview. Use POST to create one." },
        { status: 404 }
      )
    }

    /* -------------------------
       Only interviewer or ADMIN can update reports
    -------------------------- */

    if (
      interview.interviewerId !== req.user.userId &&
      req.user.role !== "ADMIN"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const report = await prisma.report.update({
      where: { interviewId },
      data: parsed.data,
      select: {
        id: true,
        summary: true,
        strengths: true,
        weaknesses: true,
        recommendations: true,
        overallScore: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ success: true, data: report })
  } catch (error) {
    console.error("Report update error:", error instanceof Error ? error.message : error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/* ======================================================
   EXPORT
====================================================== */

export const GET = withAuth(getHandler)
export const POST = withAuth(postHandler)
export const PUT = withAuth(putHandler)