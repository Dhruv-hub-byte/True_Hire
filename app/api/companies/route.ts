import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { withAuth, AuthenticatedRequest } from "@/lib/middleware"

/* =====================================================
   RATE LIMITING (in-memory — swap for Upstash in prod)
===================================================== */

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

/* =====================================================
   VALIDATION
===================================================== */

const createCompanySchema = z.object({
  name: z
    .string()
    .min(2, "Company name must be at least 2 characters")
    .max(100, "Company name too long")
    .trim(),
  description: z.string().max(1000, "Description too long").optional(),
  website: z.string().url("Invalid website URL").optional().or(z.literal("")),
  logo: z.string().url("Invalid logo URL").optional().or(z.literal("")),
})

/* =====================================================
   GET /api/companies
   List companies (search + pagination)
===================================================== */

async function getHandler(req: NextRequest) {
  try {
    const ip = getClientIp(req)

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429 }
      )
    }

    const { searchParams } = new URL(req.url)

    const search = searchParams.get("search")?.trim() || ""
    const page = Math.max(Number(searchParams.get("page") || 1), 1)
    const limit = Math.min(Number(searchParams.get("limit") || 10), 50)
    const skip = (page - 1) * limit

    if (isNaN(page) || isNaN(limit)) {
      return NextResponse.json(
        { error: "Invalid pagination parameters" },
        { status: 400 }
      )
    }

    // MySQL string comparisons are case-insensitive by default (utf8_general_ci / utf8mb4_general_ci)
    // mode: "insensitive" is PostgreSQL-only in Prisma — not needed here
    const where = search
      ? { name: { contains: search } }
      : {}

    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          description: true,
          website: true,
          logo: true,
          createdAt: true,
        },
      }),
      prisma.company.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: companies,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Company fetch error:", error instanceof Error ? error.message : error)

    return NextResponse.json(
      { error: "Failed to fetch companies" },
      { status: 500 }
    )
  }
}

/* =====================================================
   POST /api/companies
   Create company (ADMIN ONLY)
===================================================== */

async function postHandler(req: NextRequest) {
  const authReq = req as AuthenticatedRequest

  try {
    const ip = getClientIp(req)

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429 }
      )
    }

    /* -------------------------
       Auth check — ADMIN only
    -------------------------- */

    if (!authReq.user || authReq.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    /* -------------------------
       Validate input
    -------------------------- */

    const body = await req.json()
    const parsed = createCompanySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { name, description, website, logo } = parsed.data

    /* -------------------------
       Case-insensitive duplicate check
    -------------------------- */

    // MySQL collation handles case-insensitivity natively
    const exists = await prisma.company.findFirst({
      where: { name },
    })

    if (exists) {
      return NextResponse.json(
        { error: "Company already exists" },
        { status: 409 }
      )
    }

    /* -------------------------
       Create company
       Note: id is @default(cuid()) — Prisma handles it automatically
    -------------------------- */

    const company = await prisma.company.create({
      data: {
        name,
        description: description || null,
        website: website || null,
        logo: logo || null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        website: true,
        logo: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(
      { success: true, data: company },
      { status: 201 }
    )
  } catch (error) {
    console.error("Company create error:", error instanceof Error ? error.message : error)

    return NextResponse.json(
      { error: "Failed to create company" },
      { status: 500 }
    )
  }
}

/* =====================================================
   EXPORT
===================================================== */

export const GET = withAuth(getHandler)
export const POST = withAuth(postHandler)