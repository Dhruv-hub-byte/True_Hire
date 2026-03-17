import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withAuth, AuthenticatedRequest } from "@/lib/middleware"

/* =====================================================
   RATE LIMITING
===================================================== */

const RATE_LIMIT_WINDOW_MS = 60 * 1000
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

/* =====================================================
   VALIDATION
===================================================== */

const createQuestionSchema = z.object({
  text:         z.string().min(1, "Question text is required").max(2000, "Too long"),
  type:         z.enum(["GENERAL", "CODE"]).default("GENERAL"),
  codeTemplate: z.string().max(5000, "Code template too long").optional(),
})

/* =====================================================
   GET /api/companies/[id]/questions
   List all questions for a company
===================================================== */

async function getHandler(
  req: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(req)
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    if (req.user.role === "CANDIDATE") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id: companyId } = await params

    const company = await prisma.company.findUnique({
      where: { id: companyId, deletedAt: null },
      select: { id: true },
    })

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }

    const questions = await prisma.question.findMany({
      where: { companyId },
      select: {
        id:           true,
        text:         true,
        type:         true,
        codeTemplate: true,
        createdAt:    true,
        updatedAt:    true,
        _count: {
          select: { interviewquestion: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      success: true,
      data: questions.map((q) => ({
        ...q,
        usedInInterviews: q._count.interviewquestion,
        _count: undefined,
      })),
      total: questions.length,
    })
  } catch (error) {
    console.error("Questions fetch error:", error instanceof Error ? error.message : error)
    return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 })
  }
}

/* =====================================================
   POST /api/companies/[id]/questions
   Create a question for a company — ADMIN or INTERVIEWER
===================================================== */

async function postHandler(
  req: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(req)
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    if (req.user.role === "CANDIDATE") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id: companyId } = await params

    const body   = await req.json()
    const parsed = createQuestionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId, deletedAt: null },
      select: { id: true },
    })

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }

    const { text, type, codeTemplate } = parsed.data

    const question = await prisma.question.create({
      data: {
        text,
        type,
        codeTemplate: type === "CODE" ? (codeTemplate || null) : null,
        companyId,
      },
      select: {
        id:           true,
        text:         true,
        type:         true,
        codeTemplate: true,
        createdAt:    true,
      },
    })

    return NextResponse.json({ success: true, data: question }, { status: 201 })
  } catch (error) {
    console.error("Question create error:", error instanceof Error ? error.message : error)
    return NextResponse.json({ error: "Failed to create question" }, { status: 500 })
  }
}

export const GET  = withAuth(getHandler)
export const POST = withAuth(postHandler)