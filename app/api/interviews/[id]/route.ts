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

const updateInterviewSchema = z.object({
  title: z.string().min(1, "Title cannot be empty").max(200, "Title too long").trim().optional(),
  description: z.string().max(2000, "Description too long").optional(),
  status: z
    .enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
    .optional(),
  interviewerId: z.string().min(1, "interviewerId cannot be empty").optional(),
})

/* ======================================================
   GET /api/interviews/[id]
   Fetch a single interview
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

    const { id } = await params

    const interview = await prisma.interview.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        startTime: true,
        endTime: true,
        duration: true,
        status: true,
        videoRecording: true,
        audioRecording: true,
        screenRecording: true,
        transcript: true,
        sentimentScore: true,
        confidenceScore: true,
        communicationScore: true,
        cheatingProbability: true,
        createdAt: true,
        updatedAt: true,
        // Safe user fields only — no password, no deletedAt
        user_interview_candidateIdTouser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            profileImage: true,
            phone: true,
          },
        },
        user_interview_interviewerIdTouser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            profileImage: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
            logo: true,
            website: true,
          },
        },
        interviewquestion: {
          select: {
            id: true,
            order: true,
            answer: true,
            timeSpent: true,
            // Correct schema fields: text, type, codeTemplate (no title/difficulty)
            question: {
              select: {
                id: true,
                text: true,
                type: true,
                codeTemplate: true,
              },
            },
          },
          orderBy: { order: "asc" },
        },
        violation: {
          select: {
            id: true,
            type: true,
            description: true,
            severity: true,
            timestamp: true,
          },
          orderBy: { timestamp: "desc" },
        },
        report: {
          select: {
            id: true,
            summary: true,
            strengths: true,
            weaknesses: true,
            recommendations: true,
            overallScore: true,
            createdAt: true,
          },
        },
      },
    })

    if (!interview) {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 }
      )
    }

    /* -------------------------
       Access control:
       candidate, interviewer, or ADMIN
    -------------------------- */

    const { userId, role } = req.user

    const isParticipant =
      interview.user_interview_candidateIdTouser.id === userId ||
      interview.user_interview_interviewerIdTouser?.id === userId

    if (!isParticipant && role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json({ success: true, data: interview })
  } catch (error) {
    console.error("Interview fetch error:", error instanceof Error ? error.message : error)
    return NextResponse.json(
      { error: "Failed to fetch interview" },
      { status: 500 }
    )
  }
}

/* ======================================================
   PUT /api/interviews/[id]
   Update interview — interviewer or ADMIN only
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

    const { id } = await params

    /* -------------------------
       Validate body first — fail fast before DB call
    -------------------------- */

    const body = await req.json()
    const parsed = updateInterviewSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    /* -------------------------
       Fetch interview
    -------------------------- */

    const interview = await prisma.interview.findUnique({
      where: { id },
      select: {
        id: true,
        interviewerId: true,
        status: true,
      },
    })

    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 })
    }

    /* -------------------------
       Access control:
       interviewer or ADMIN
    -------------------------- */

    if (
      interview.interviewerId !== req.user.userId &&
      req.user.role !== "ADMIN"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    /* -------------------------
       Guard against invalid status transitions
    -------------------------- */

    if (parsed.data.status) {
      const current = interview.status
      const next = parsed.data.status

      const invalidTransitions: Record<string, string[]> = {
        COMPLETED: ["SCHEDULED", "IN_PROGRESS"],
        CANCELLED: ["IN_PROGRESS", "COMPLETED"],
      }

      if (invalidTransitions[current]?.includes(next)) {
        return NextResponse.json(
          { error: `Cannot transition interview from ${current} to ${next}` },
          { status: 400 }
        )
      }
    }

    /* -------------------------
       If changing interviewer, verify new interviewer exists + is active
    -------------------------- */

    if (parsed.data.interviewerId) {
      const newInterviewer = await prisma.user.findUnique({
        where: { id: parsed.data.interviewerId },
        select: { id: true, role: true, isActive: true, deletedAt: true },
      })

      if (!newInterviewer || newInterviewer.deletedAt !== null) {
        return NextResponse.json(
          { error: "Interviewer not found" },
          { status: 404 }
        )
      }

      if (!newInterviewer.isActive) {
        return NextResponse.json(
          { error: "Interviewer account is inactive" },
          { status: 400 }
        )
      }

      if (newInterviewer.role === "CANDIDATE") {
        return NextResponse.json(
          { error: "Specified user cannot be assigned as interviewer" },
          { status: 400 }
        )
      }
    }

    /* -------------------------
       Update interview
    -------------------------- */

    const updated = await prisma.interview.update({
      where: { id },
      data: parsed.data,
      select: {
        id: true,
        title: true,
        description: true,
        startTime: true,
        endTime: true,
        duration: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        user_interview_interviewerIdTouser: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error("Interview update error:", error instanceof Error ? error.message : error)
    return NextResponse.json({ error: "Update failed" }, { status: 500 })
  }
}

/* ======================================================
   DELETE /api/interviews/[id]
   Hard delete — ADMIN only
====================================================== */

async function deleteHandler(
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

    const { id } = await params

    if (req.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    /* -------------------------
       Check exists before deleting
    -------------------------- */

    const interview = await prisma.interview.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 })
    }

    await prisma.interview.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Interview delete error:", error instanceof Error ? error.message : error)
    return NextResponse.json({ error: "Delete failed" }, { status: 500 })
  }
}

/* ======================================================
   EXPORT
====================================================== */

export const GET = withAuth(getHandler)
export const PUT = withAuth(putHandler)
export const DELETE = withAuth(deleteHandler)