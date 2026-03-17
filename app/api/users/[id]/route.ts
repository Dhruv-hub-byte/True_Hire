import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withAuth, AuthenticatedRequest } from "@/lib/middleware"
import { hashPassword, comparePassword } from "@/lib/auth"

/* =====================================================
   VALIDATION
===================================================== */

const updateUserSchema = z.object({
  name:         z.string().min(2).max(100).trim().optional(),
  phone:        z.string().max(20).optional().nullable(),
  profileImage: z.string().url("Invalid image URL").optional().nullable(),
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword:     z.string().min(8, "Password must be at least 8 characters"),
})

/* =====================================================
   GET /api/users/[id]
   Get a single user — own profile or ADMIN
===================================================== */

async function getHandler(
  req: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Only allow users to view their own profile, or ADMIN to view any
    if (req.user.userId !== id && req.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id, deletedAt: null },
      select: {
        id:            true,
        email:         true,
        name:          true,
        role:          true,
        status:        true,
        phone:         true,
        profileImage:  true,
        emailVerified: true,
        lastLoginAt:   true,
        createdAt:     true,
        company: {
          select: { id: true, name: true, logo: true },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: user })
  } catch (error) {
    console.error("Get user error:", error instanceof Error ? error.message : error)
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 })
  }
}

/* =====================================================
   PUT /api/users/[id]
   Update profile — own profile only (or ADMIN)
   Handles both profile update and password change
===================================================== */

async function putHandler(
  req: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (req.user.userId !== id && req.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()

    // Password change request
    if (body.currentPassword || body.newPassword) {
      const parsed = changePasswordSchema.safeParse(body)

      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
          { status: 400 }
        )
      }

      const user = await prisma.user.findUnique({
        where: { id },
        select: { password: true },
      })

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      const valid = await comparePassword(parsed.data.currentPassword, user.password)

      if (!valid) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 400 }
        )
      }

      const hashed = await hashPassword(parsed.data.newPassword)

      await prisma.user.update({
        where: { id },
        data:  { password: hashed },
      })

      return NextResponse.json({
        success: true,
        message: "Password updated successfully",
      })
    }

    // Profile update
    const parsed = updateUserSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const updated = await prisma.user.update({
      where: { id },
      data:  parsed.data,
      select: {
        id:           true,
        name:         true,
        phone:        true,
        profileImage: true,
        updatedAt:    true,
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error("Update user error:", error instanceof Error ? error.message : error)
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}

/* =====================================================
   DELETE /api/users/[id]
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

    // Prevent deleting yourself
    if (req.user.userId === id) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, deletedAt: true },
    })

    if (!user || user.deletedAt !== null) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    await prisma.user.update({
      where: { id },
      data:  { deletedAt: new Date(), isActive: false, status: "INACTIVE" },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete user error:", error instanceof Error ? error.message : error)
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
  }
}

export const GET    = withAuth(getHandler)
export const PUT    = withAuth(putHandler)
export const DELETE = withAuth(deleteHandler)