import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
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

const createInterviewSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long").trim(),
  description: z.nullable(z.string().max(2000, "Description too long")).optional(),
  //           ^^ wrap with z.nullable() FIRST, then .optional()
  startTime: z.string().datetime("Invalid startTime — use ISO 8601"),
  endTime: z.string().datetime("Invalid endTime — use ISO 8601"),
  duration: z
    .number()
    .positive("Duration must be positive")
    .int("Duration must be a whole number"),
  candidateId:   z.string().min(1, "candidateId is required"),
  companyId:     z.string().min(1, "companyId is required"),
  interviewerId: z.nullable(z.string()).optional(),
  //             ^^ same fix here
})

/* ======================================================
   GET /api/interviews
====================================================== */

async function getHandler(req: NextRequest) {
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

    /* -------------------------
       Pagination
    -------------------------- */

    const { searchParams } = new URL(req.url)
    const page = Math.max(Number(searchParams.get("page") || 1), 1)
    const limit = Math.min(Number(searchParams.get("limit") || 20), 100)
    const skip = (page - 1) * limit

    /* -------------------------
       Role-based filtering:
       ADMIN sees all, others see only their own
    -------------------------- */

    const where =
      authReq.user.role === "ADMIN"
        ? {}
        : {
            OR: [
              { candidateId: authReq.user.userId },
              { interviewerId: authReq.user.userId },
            ],
          }

    // Always filter out interviews linked to deleted companies
    const fullWhere = {
      ...where,
      company: { deletedAt: null },
    }

    const [interviews, total] = await Promise.all([
      prisma.interview.findMany({
        where: fullWhere,
        select: {
          id: true,
          title: true,
          description: true,
          startTime: true,
          endTime: true,
          duration: true,
          status: true,
          createdAt: true,
          // Candidate — safe fields only, no password
          user_interview_candidateIdTouser: {
            select: { id: true, name: true, email: true, profileImage: true },
          },
          // Interviewer — safe fields only, no password
          user_interview_interviewerIdTouser: {
            select: { id: true, name: true, email: true, profileImage: true },
          },
          company: {
            select: { id: true, name: true, logo: true },
          },
          interviewquestion: {
            select: {
              id: true,
              order: true,
              answer: true,
              timeSpent: true,
              question: {
                // Correct fields from schema: text, type, codeTemplate
                select: { id: true, text: true, type: true, codeTemplate: true },
              },
            },
          },
          report: {
            select: {
              id: true,
              overallScore: true,
              summary: true,
              createdAt: true,
            },
          },
          violation: {
            select: {
              id: true,
              type: true,
              severity: true,
              description: true,
              timestamp: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.interview.count({ where: fullWhere }),
    ])

    return NextResponse.json({
      success: true,
      data: interviews,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Interview fetch error:", error instanceof Error ? error.message : error)

    return NextResponse.json(
      { error: "Failed to fetch interviews" },
      { status: 500 }
    )
  }
}

/* ======================================================
   POST /api/interviews
   ADMIN or INTERVIEWER only
====================================================== */

async function postHandler(req: NextRequest) {
  const authReq = req as AuthenticatedRequest

  if (!authReq.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (authReq.user.role === "CANDIDATE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const ip = getClientIp(req)

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429 }
      )
    }

    /* -------------------------
       Validate input
    -------------------------- */

    const body = await req.json()
    const validation = createInterviewSchema.safeParse(body)

    if (!validation.success) {
      console.error("Interview validation failed:", JSON.stringify(validation.error.flatten().fieldErrors, null, 2))
      console.error("Received body:", JSON.stringify(body, null, 2))
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { title, description, startTime, endTime, duration, candidateId, companyId, interviewerId } =
      validation.data

    /* -------------------------
       Validate time range
    -------------------------- */

    const start = new Date(startTime)
    const end = new Date(endTime)

    if (end <= start) {
      return NextResponse.json(
        { error: "endTime must be after startTime" },
        { status: 400 }
      )
    }

    // Allow 5 minute buffer for form submission delays
    if (start < new Date(Date.now() - 5 * 60 * 1000)) {
      return NextResponse.json(
        { error: "startTime cannot be in the past" },
        { status: 400 }
      )
    }

    /* -------------------------
       Verify company + candidate exist (parallel)
    -------------------------- */

    const [company, candidate] = await Promise.all([
      prisma.company.findUnique({
        where: { id: companyId, deletedAt: null },
        select: { id: true },
      }),
      prisma.user.findUnique({
        where: { id: candidateId },
        select: { id: true, role: true, isActive: true, status: true, deletedAt: true },
      }),
    ])

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }

    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 })
    }

    if (candidate.role !== "CANDIDATE") {
      return NextResponse.json(
        { error: "Specified user is not a candidate" },
        { status: 400 }
      )
    }

    if (candidate.deletedAt !== null) {
      return NextResponse.json(
        { error: "Candidate account not found" },
        { status: 404 }
      )
    }

    if (!candidate.isActive || candidate.status === "SUSPENDED") {
      return NextResponse.json(
        { error: "Candidate account is inactive or suspended" },
        { status: 400 }
      )
    }

    /* -------------------------
       Create interview
       Note: id is @default(cuid()) — Prisma handles it automatically
    -------------------------- */

    const interview = await prisma.interview.create({
      data: {
        title,
        description: description || null,
        startTime: start,
        endTime: end,
        duration,
        user_interview_candidateIdTouser: {
          connect: { id: candidateId },
        },
        ...(interviewerId ? {
          user_interview_interviewerIdTouser: {
            connect: { id: interviewerId },
          },
        } : {}),
        company: {
          connect: { id: companyId },
        },
      },
      select: {
        id: true,
        title: true,
        description: true,
        startTime: true,
        endTime: true,
        duration: true,
        status: true,
        createdAt: true,
        user_interview_candidateIdTouser: {
          select: { id: true, name: true, email: true, profileImage: true },
        },
        user_interview_interviewerIdTouser: {
          select: { id: true, name: true, email: true, profileImage: true },
        },
        company: {
          select: { id: true, name: true, logo: true },
        },
      },
    })

    return NextResponse.json({ success: true, data: interview }, { status: 201 })
  } catch (error) {
    console.error("Interview create error:", error instanceof Error ? error.message : error)

    return NextResponse.json(
      { error: "Failed to create interview" },
      { status: 500 }
    )
  }
}

/* ======================================================
   EXPORT
====================================================== */

export const GET = withAuth(getHandler)
export const POST = withAuth(postHandler)