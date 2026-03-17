import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withAuth, AuthenticatedRequest } from "@/lib/middleware"

/* =====================================================
   VALIDATION
===================================================== */

const updateCompanySchema = z.object({
  name:        z.string().min(1).max(100).trim().optional(),
  description: z.string().max(500).optional().nullable(),
  logo:        z.string().url().optional().nullable(),
  website:     z.string().url().optional().nullable(),
})

/* =====================================================
   GET /api/companies/[id]
===================================================== */

async function getHandler(
  req: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const company = await prisma.company.findUnique({
      where:  { id, deletedAt: null },
      select: {
        id:          true,
        name:        true,
        description: true,
        logo:        true,
        website:     true,
        createdAt:   true,
        updatedAt:   true,
      },
    })

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: company })
  } catch (error) {
    console.error("Get company error:", error instanceof Error ? error.message : error)
    return NextResponse.json({ error: "Failed to fetch company" }, { status: 500 })
  }
}

/* =====================================================
   PUT /api/companies/[id]
   Update company — ADMIN only
===================================================== */

async function putHandler(
  req: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (req.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const body   = await req.json()
    const parsed = updateCompanySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const company = await prisma.company.findUnique({
      where:  { id, deletedAt: null },
      select: { id: true },
    })

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }

    const updated = await prisma.company.update({
      where:  { id },
      data:   parsed.data,
      select: { id: true, name: true, description: true, logo: true, website: true },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error("Update company error:", error instanceof Error ? error.message : error)
    return NextResponse.json({ error: "Failed to update company" }, { status: 500 })
  }
}

/* =====================================================
   DELETE /api/companies/[id]
   Soft delete — ADMIN only
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

    const company = await prisma.company.findUnique({
      where:  { id, deletedAt: null },
      select: { id: true },
    })

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }

    await prisma.company.update({
      where: { id },
      data:  { deletedAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete company error:", error instanceof Error ? error.message : error)
    return NextResponse.json({ error: "Failed to delete company" }, { status: 500 })
  }
}

export const GET    = withAuth(getHandler)
export const PUT    = withAuth(putHandler)
export const DELETE = withAuth(deleteHandler)