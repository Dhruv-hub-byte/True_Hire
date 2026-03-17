import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth, AuthenticatedRequest } from "@/lib/middleware"
import { user_role } from "@prisma/client"

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
   GET /api/users
   ADMIN only — list all users with filters + pagination
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

    /* -------------------------
       ADMIN only
    -------------------------- */

    if (req.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)

    /* -------------------------
       Filters
    -------------------------- */

    const role = searchParams.get("role")
    const status = searchParams.get("status")
    const search = searchParams.get("search")?.trim() || undefined
    const includeDeleted = searchParams.get("includeDeleted") === "true"

    /* -------------------------
       Validate role filter if provided
    -------------------------- */

    const validRoles: user_role[] = ["ADMIN", "INTERVIEWER", "CANDIDATE"]

    if (role && !validRoles.includes(role as user_role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(", ")}` },
        { status: 400 }
      )
    }

    /* -------------------------
       Validate status filter if provided
    -------------------------- */

    const validStatuses = ["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING_VERIFICATION"]

    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      )
    }

    /* -------------------------
       Pagination
    -------------------------- */

    const page = Math.max(Number(searchParams.get("page") || 1), 1)
    const limit = Math.min(Number(searchParams.get("limit") || 20), 100)
    const skip = (page - 1) * limit

    /* -------------------------
       Build where clause
    -------------------------- */

    const where = {
      ...(role ? { role: role as user_role } : {}),
      ...(status ? { status: status as any } : {}),
      // Exclude soft-deleted users unless explicitly requested
      ...(!includeDeleted ? { deletedAt: null } : {}),
      // Search by name or email
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { email: { contains: search } },
            ],
          }
        : {}),
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          isActive: true,
          emailVerified: true,
          profileImage: true,
          phone: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
          company: {
            select: { id: true, name: true, logo: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: users,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Users fetch error:", error instanceof Error ? error.message : error)

    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    )
  }
}

/* ======================================================
   EXPORT
====================================================== */

export const GET = withAuth(getHandler)