import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withAuth, AuthenticatedRequest } from "@/lib/middleware"

/* =====================================================
   VALIDATION
===================================================== */

const updateQuestionSchema = z.object({
  text:         z.string().min(1).max(2000).optional(),
  type:         z.enum(["GENERAL", "CODE"]).optional(),
  codeTemplate: z.string().max(5000).optional().nullable(),
})

/* =====================================================
   PUT /api/questions/[id]
   Update a question — ADMIN or INTERVIEWER
===================================================== */

async function putHandler(
  req: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (req.user.role === "CANDIDATE") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const body   = await req.json()
    const parsed = updateQuestionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const existing = await prisma.question.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!existing) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 })
    }

    const updated = await prisma.question.update({
      where: { id },
      data:  parsed.data,
      select: {
        id:           true,
        text:         true,
        type:         true,
        codeTemplate: true,
        updatedAt:    true,
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error("Question update error:", error instanceof Error ? error.message : error)
    return NextResponse.json({ error: "Failed to update question" }, { status: 500 })
  }
}

/* =====================================================
   DELETE /api/questions/[id]
   Delete a question — ADMIN only
   Checks if question is used in any interview first
===================================================== */

async function deleteHandler(
  req: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (req.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params

    const question = await prisma.question.findUnique({
      where: { id },
      select: {
        id:    true,
        _count: { select: { interviewquestion: true } },
      },
    })

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 })
    }

    // Warn if question is used in interviews but still allow delete
    // (cascade delete handles interviewquestion records)
    await prisma.question.delete({ where: { id } })

    return NextResponse.json({
      success: true,
      removedFromInterviews: question._count.interviewquestion,
    })
  } catch (error) {
    console.error("Question delete error:", error instanceof Error ? error.message : error)
    return NextResponse.json({ error: "Failed to delete question" }, { status: 500 })
  }
}

export const PUT    = withAuth(putHandler)
export const DELETE = withAuth(deleteHandler)