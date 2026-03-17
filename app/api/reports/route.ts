import { NextRequest, NextResponse } from "next/server"
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
   GET /api/reports
   GET /api/reports?interviewId=xxx
   ADMIN sees all — others see only their own
====================================================== */

async function getHandler(req: AuthenticatedRequest) {
  try {
    const ip = getClientIp(req)

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429 }
      )
    }

    const { searchParams } = new URL(req.url)
    const interviewId = searchParams.get("interviewId")?.trim() || undefined

    /* -------------------------
       Pagination
    -------------------------- */

    const page = Math.max(Number(searchParams.get("page") || 1), 1)
    const limit = Math.min(Number(searchParams.get("limit") || 20), 100)
    const skip = (page - 1) * limit

    /* -------------------------
       Role-based filtering:
       ADMIN sees all reports
       Interviewer/Candidate see only reports for their interviews
    -------------------------- */

    const { userId, role } = req.user

    const where =
      role === "ADMIN"
        ? interviewId ? { interviewId } : {}
        : {
            ...(interviewId ? { interviewId } : {}),
            interview: {
              OR: [
                { candidateId: userId },
                { interviewerId: userId },
              ],
            },
          }

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        select: {
          id: true,
          summary: true,
          strengths: true,
          weaknesses: true,
          recommendations: true,
          overallScore: true,
          createdAt: true,
          updatedAt: true,
          interview: {
            select: {
              id: true,
              title: true,
              status: true,
              startTime: true,
              endTime: true,
              // Safe user fields only — no password
              user_interview_candidateIdTouser: {
                select: { id: true, name: true, email: true, profileImage: true },
              },
              user_interview_interviewerIdTouser: {
                select: { id: true, name: true, email: true },
              },
              company: {
                select: { id: true, name: true, logo: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.report.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: reports,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Reports fetch error:", error instanceof Error ? error.message : error)

    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    )
  }
}

/* ======================================================
   EXPORT
====================================================== */

export const GET = withAuth(getHandler)