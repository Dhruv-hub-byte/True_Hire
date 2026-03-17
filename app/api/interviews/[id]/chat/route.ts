import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withAuth, AuthenticatedRequest } from "@/lib/middleware"

/* =====================================================
   VALIDATION
===================================================== */

const sendMessageSchema = z.object({
  message: z.string().min(1).max(1000),
})

/* =====================================================
   GET /api/interviews/[id]/chat
   Returns messages after a given timestamp for polling.
   ?after=ISO_TIMESTAMP  — only return messages after this time
   No ?after param       — return full history
===================================================== */

async function getHandler(
  req: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: interviewId } = await params
    const { userId, role }    = req.user
    const after = new URL(req.url).searchParams.get("after")

    const interview = await prisma.interview.findUnique({
      where:  { id: interviewId },
      select: { candidateId: true, interviewerId: true },
    })

    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 })
    }

    const isParticipant =
      interview.candidateId   === userId ||
      interview.interviewerId === userId

    if (!isParticipant && role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const messages = await prisma.chatmessage.findMany({
      where: {
        interviewId,
        // If ?after= is provided only return newer messages
        ...(after ? { createdAt: { gt: new Date(after) } } : {}),
      },
      orderBy: { createdAt: "asc" },
      select:  { id: true, message: true, senderRole: true, createdAt: true },
    })

    return NextResponse.json({ success: true, data: messages })
  } catch (error) {
    console.error("Chat fetch error:", error instanceof Error ? error.message : error)
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 })
  }
}

/* =====================================================
   POST /api/interviews/[id]/chat
   Send a new message
===================================================== */

async function postHandler(
  req: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: interviewId } = await params
    const { userId, role }    = req.user

    const body   = await req.json()
    const parsed = sendMessageSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors.message?.[0] ?? "Invalid message" },
        { status: 400 }
      )
    }

    const interview = await prisma.interview.findUnique({
      where:  { id: interviewId },
      select: { candidateId: true, interviewerId: true, status: true },
    })

    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 })
    }

    if (interview.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Cannot send messages in a cancelled interview" },
        { status: 400 }
      )
    }

    const isParticipant =
      interview.candidateId   === userId ||
      interview.interviewerId === userId

    if (!isParticipant && role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const senderRole =
      role === "ADMIN"                   ? "ADMIN"       :
      interview.interviewerId === userId ? "INTERVIEWER" :
      "CANDIDATE"

    const chatMessage = await prisma.chatmessage.create({
      data: {
        interviewId,
        message:    parsed.data.message,
        senderRole: senderRole as any,
      },
      select: { id: true, message: true, senderRole: true, createdAt: true },
    })

    return NextResponse.json({ success: true, data: chatMessage }, { status: 201 })
  } catch (error) {
    console.error("Chat send error:", error instanceof Error ? error.message : error)
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
  }
}

export const GET  = withAuth(getHandler)
export const POST = withAuth(postHandler)