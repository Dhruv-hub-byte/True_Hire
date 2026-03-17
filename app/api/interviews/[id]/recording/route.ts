import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth, AuthenticatedRequest } from "@/lib/middleware"

/* =====================================================
   RATE LIMITING (in-memory — swap for Upstash in prod)
===================================================== */

const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX = 10

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
   CONSTANTS
===================================================== */

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

const ALLOWED_MIME_TYPES = [
  "video/webm",
  "video/mp4",
  "video/ogg",
  "video/quicktime",
]

const ALLOWED_EXTENSIONS = [".webm", ".mp4", ".ogg", ".mov"]

/* =====================================================
   HELPERS
===================================================== */

function getExtension(filename: string): string {
  return filename.slice(filename.lastIndexOf(".")).toLowerCase()
}

/**
 * Upload buffer to your cloud storage provider.
 *
 * Replace this implementation with your actual provider:
 *   - AWS S3:        use @aws-sdk/client-s3
 *   - Cloudinary:    use cloudinary SDK
 *   - Supabase:      use supabase.storage.from(...).upload(...)
 *   - Uploadthing:   use their Next.js SDK
 *
 * Must return a public URL string.
 */
async function uploadToStorage(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<string> {
  // -------------------------------------------------------
  // EXAMPLE: AWS S3
  // -------------------------------------------------------
  // import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
  //
  // const s3 = new S3Client({ region: process.env.AWS_REGION })
  //
  // await s3.send(new PutObjectCommand({
  //   Bucket: process.env.AWS_S3_BUCKET!,
  //   Key: `recordings/${filename}`,
  //   Body: buffer,
  //   ContentType: mimeType,
  // }))
  //
  // return `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/recordings/${filename}`
  // -------------------------------------------------------

  // -------------------------------------------------------
  // EXAMPLE: Supabase Storage
  // -------------------------------------------------------
  // import { createClient } from "@supabase/supabase-js"
  //
  // const supabase = createClient(
  //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
  //   process.env.SUPABASE_SERVICE_KEY!
  // )
  //
  // const { error } = await supabase.storage
  //   .from("recordings")
  //   .upload(filename, buffer, { contentType: mimeType })
  //
  // if (error) throw new Error(error.message)
  //
  // const { data } = supabase.storage.from("recordings").getPublicUrl(filename)
  // return data.publicUrl
  // -------------------------------------------------------

  throw new Error(
    "uploadToStorage() is not implemented. " +
    "Please configure a cloud storage provider (S3, Supabase, Cloudinary, etc.)"
  )
}

/* =====================================================
   POST /api/interviews/[id]/recording
   Upload interview video recording
===================================================== */

async function postHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authReq = req as AuthenticatedRequest

  /* -------------------------
     Auth check
  -------------------------- */

  if (!authReq.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    /* -------------------------
       Rate limiting
    -------------------------- */

    const ip = getClientIp(req)

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429 }
      )
    }

    /* -------------------------
       Resolve params (Next.js 15+)
    -------------------------- */

    const { id: interviewId } = await params

    if (!interviewId) {
      return NextResponse.json(
        { error: "Interview ID is required" },
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
        candidateId: true,
        interviewerId: true,
        status: true,
      },
    })

    if (!interview) {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 }
      )
    }

    // Only allow uploads during or after an active interview
    if (
      interview.status !== "IN_PROGRESS" &&
      interview.status !== "COMPLETED"
    ) {
      return NextResponse.json(
        { error: "Recordings can only be uploaded for active or completed interviews" },
        { status: 400 }
      )
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
       Parse form data
    -------------------------- */

    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      )
    }

    /* -------------------------
       Validate MIME type (not spoofable via extension alone)
    -------------------------- */

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}`,
        },
        { status: 400 }
      )
    }

    /* -------------------------
       Validate file extension
    -------------------------- */

    const ext = getExtension(file.name)

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        {
          error: `Invalid file extension. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`,
        },
        { status: 400 }
      )
    }

    /* -------------------------
       Validate file size
    -------------------------- */

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large (max 100MB)" },
        { status: 400 }
      )
    }

    /* -------------------------
       Upload to cloud storage
    -------------------------- */

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const filename = `${interviewId}-${Date.now()}${ext}`
    const publicUrl = await uploadToStorage(buffer, filename, file.type)

    /* -------------------------
       Save URL to DB
    -------------------------- */

    await prisma.interview.update({
      where: { id: interviewId },
      data: { videoRecording: publicUrl },
    })

    return NextResponse.json({
      success: true,
      url: publicUrl,
    })
  } catch (error) {
    console.error(
      "Recording upload error:",
      error instanceof Error ? error.message : error
    )

    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    )
  }
}

/* =====================================================
   EXPORT
===================================================== */

export const POST = withAuth(postHandler)