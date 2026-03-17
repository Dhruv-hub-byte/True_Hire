import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/* =====================================================
   GET /api/health
   Public health check — no auth required
===================================================== */

const APP_VERSION = process.env.npm_package_version ?? "1.0.0"

export async function GET() {
  const timestamp = new Date().toISOString()

  try {
    // Verify DB is reachable with a 3s timeout
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("DB health check timed out")), 3000)
      ),
    ])

    return NextResponse.json(
      {
        status: "ok",
        timestamp,
        version: APP_VERSION,
        services: {
          database: "connected",
        },
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      }
    )
  } catch (error) {
    console.error(
      "Health check error:",
      error instanceof Error ? error.message : error
    )

    return NextResponse.json(
      {
        status: "error",
        timestamp,
        version: APP_VERSION,
        services: {
          database: "disconnected",
        },
      },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      }
    )
  }
}