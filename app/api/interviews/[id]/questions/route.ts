import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withAuth, AuthenticatedRequest } from "@/lib/middleware"

/* =====================================================
   VALIDATION
===================================================== */

const assignSchema = z.object({
  questionIds: z
    .array(z.string().min(1))
    .min(1, "At least one question is required")
    .max(20, "Maximum 20 questions per interview"),
})

/* =====================================================
   POST /api/interviews/[id]/questions
   Assign questions to an interview (replaces existing)
   ADMIN or INTERVIEWER only
===================================================== */

async function postHandler(
  req: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (req.user.role === "CANDIDATE") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id: interviewId } = await params
    const body   = await req.json()
    const parsed = assignSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { questionIds } = parsed.data

    /* -------------------------
       Validate interview exists
    -------------------------- */

    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      select: { id: true, companyId: true, status: true },
    })

    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 })
    }

    if (interview.status === "COMPLETED" || interview.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Cannot assign questions to a completed or cancelled interview" },
        { status: 400 }
      )
    }

    /* -------------------------
       Validate all questions belong to the same company
    -------------------------- */

    const questions = await prisma.question.findMany({
      where: { id: { in: questionIds }, companyId: interview.companyId },
      select: { id: true },
    })

    if (questions.length !== questionIds.length) {
      return NextResponse.json(
        { error: "One or more questions not found or do not belong to this company" },
        { status: 400 }
      )
    }

    /* -------------------------
       Replace existing questions atomically
       Delete old ones → create new ones with order
    -------------------------- */

    await prisma.$transaction([
      prisma.interviewquestion.deleteMany({ where: { interviewId } }),
      prisma.interviewquestion.createMany({
        data: questionIds.map((questionId, index) => ({
          interviewId,
          questionId,
          order: index + 1,
        })),
      }),
    ])

    return NextResponse.json({
      success: true,
      message: `${questionIds.length} question${questionIds.length !== 1 ? "s" : ""} assigned`,
      total: questionIds.length,
    })
  } catch (error) {
    console.error("Assign questions error:", error instanceof Error ? error.message : error)
    return NextResponse.json({ error: "Failed to assign questions" }, { status: 500 })
  }
}

/* =====================================================
   GET /api/interviews/[id]/questions
   Get questions assigned to an interview
===================================================== */

async function getHandler(
  req: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: interviewId } = await params

    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      select: { id: true, candidateId: true, interviewerId: true },
    })

    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 })
    }

    const { userId, role } = req.user
    const isParticipant =
      interview.candidateId === userId || interview.interviewerId === userId

    if (!isParticipant && role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const questions = await prisma.interviewquestion.findMany({
      where: { interviewId },
      select: {
        id:        true,
        order:     true,
        answer:    true,
        timeSpent: true,
        question: {
          select: {
            id:           true,
            text:         true,
            type:         true,
            codeTemplate: true,
          },
        },
      },
      orderBy: { order: "asc" },
    })

    return NextResponse.json({ success: true, data: questions })
  } catch (error) {
    console.error("Get questions error:", error instanceof Error ? error.message : error)
    return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 })
  }
}

export const GET  = withAuth(getHandler)
export const POST = withAuth(postHandler)