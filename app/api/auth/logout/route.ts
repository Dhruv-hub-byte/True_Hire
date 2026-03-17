import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"

/* =====================================================
   POST /api/auth/logout
   Clears the httpOnly refresh token cookie and
   deletes the session from the database
===================================================== */

export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get("refreshToken")?.value

    // Delete session from DB if token exists
    if (refreshToken) {
      const hashedToken = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex")

      await prisma.session.deleteMany({
        where: { token: hashedToken },
      })
    }

    // Clear the cookie regardless
    const response = NextResponse.json({ success: true })

    response.cookies.set("refreshToken", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 0, // expire immediately
    })

    return response
  } catch (error) {
    console.error("Logout error:", error instanceof Error ? error.message : error)

    // Always succeed on logout — clear cookie even if DB fails
    const response = NextResponse.json({ success: true })

    response.cookies.set("refreshToken", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 0,
    })

    return response
  }
}