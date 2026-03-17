import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withAuth, AuthenticatedRequest } from "@/lib/middleware"
import { generateAndSaveReport } from "@/lib/ai-report"

/* =====================================================
   VALIDATION
===================================================== */

const submitSchema = z.object({
  answers: z.record(z.string(), z.string()),
})

/* =====================================================
   POST /api/interviews/[id]/submit
   Candidate submits answers → marks COMPLETED → AI generates report
===================================================== */

async function postHandler(
  req: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: interviewId } = await params
    const { userId, role }    = req.user

    /* -------------------------
       Validate body
    -------------------------- */

    const body   = await req.json()
    const parsed = submitSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { answers } = parsed.data

    /* -------------------------
       Fetch interview
    -------------------------- */

    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      select: {
        id:           true,
        candidateId:  true,
        status:       true,
        interviewquestion: {
          select: { id: true, questionId: true },
        },
      },
    })

    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 })
    }

    /* -------------------------
       Only candidate or ADMIN can submit
    -------------------------- */

    if (role !== "ADMIN" && interview.candidateId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    /* -------------------------
       Only allow for SCHEDULED or IN_PROGRESS
    -------------------------- */

    if (
      interview.status !== "IN_PROGRESS" &&
      interview.status !== "SCHEDULED"
    ) {
      return NextResponse.json(
        { error: `Cannot submit an interview with status ${interview.status}` },
        { status: 400 }
      )
    }

    /* -------------------------
       Save answers + mark COMPLETED atomically
    -------------------------- */

    await prisma.$transaction([
      ...interview.interviewquestion.map((iq) =>
        prisma.interviewquestion.update({
          where: { id: iq.id },
          data:  { answer: answers[iq.questionId] ?? null },
        })
      ),
      prisma.interview.update({
        where: { id: interviewId },
        data:  { status: "COMPLETED", endTime: new Date() },
      }),
    ])

    /* -------------------------
       Trigger AI report generation
       Fire and forget — don't block the response
       Candidate gets instant confirmation, report generates in background
    -------------------------- */

    generateAndSaveReport(interviewId).catch((err) => {
      console.error(
        "[Submit] AI report generation failed for interview",
        interviewId,
        err instanceof Error ? err.message : err
      )
    })

    return NextResponse.json({
      success: true,
      message: "Interview submitted successfully. Your report will be ready shortly.",
    })
  } catch (error) {
    console.error("Submit error:", error instanceof Error ? error.message : error)
    return NextResponse.json({ error: "Submission failed" }, { status: 500 })
  }
}

export const POST = withAuth(postHandler)