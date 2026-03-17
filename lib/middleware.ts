import { NextRequest, NextResponse } from "next/server"
import { verifyToken, extractTokenFromHeader } from "@/lib/auth"

/* =====================================================
   TYPES
===================================================== */

export type UserRole = "ADMIN" | "INTERVIEWER" | "CANDIDATE"

export interface AuthUser {
  userId: string
  email: string
  role: UserRole
}

export interface AuthenticatedRequest extends NextRequest {
  user: AuthUser // non-optional — guaranteed present inside withAuth handlers
}

type RouteHandler<T extends NextRequest = NextRequest> = (
  req: T,
  context: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>

/* =====================================================
   withAuth
   Verifies Bearer token and attaches user to request.
   Handlers wrapped with withAuth can safely access req.user.
===================================================== */

export function withAuth(
  handler: RouteHandler<AuthenticatedRequest>
): RouteHandler {
  return async (req, context) => {
    try {
      const token = extractTokenFromHeader(req.headers.get("authorization"))

      if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }

      const payload = verifyToken(token)

      if (!payload) {
        return NextResponse.json(
          { error: "Invalid or expired token" },
          { status: 401 }
        )
      }

      const authReq = req as AuthenticatedRequest

      authReq.user = {
        userId: payload.userId,
        email:  payload.email,
        role:   payload.role,
      }

      return handler(authReq, context)
    } catch (err) {
      console.error("Auth middleware error:", err instanceof Error ? err.message : err)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }
}

/* =====================================================
   withRole
   Combines withAuth + role check in a single wrapper.

   Usage:
     export const GET = withRole(["ADMIN"])(getHandler)
     export const POST = withRole(["ADMIN", "INTERVIEWER"])(postHandler)
===================================================== */

export function withRole(roles: UserRole[]) {
  return (handler: RouteHandler<AuthenticatedRequest>): RouteHandler =>
    withAuth(async (req, context) => {
      if (!roles.includes(req.user.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      return handler(req, context)
    })
}

/* =====================================================
   withCORS
   Adds CORS headers to all responses and handles preflight.

   IMPORTANT: wildcard "*" is insecure for credentialed requests.
   Set CORS_ORIGIN in .env to your actual frontend URL in production:
     CORS_ORIGIN=https://app.truehire.com
===================================================== */

function buildCorsHeaders(): Record<string, string> {
  const origin = process.env.CORS_ORIGIN

  // In production, never fall back to "*" for credentialed requests
  if (!origin && process.env.NODE_ENV === "production") {
    console.warn(
      "[CORS] CORS_ORIGIN is not set in production. " +
      "Defaulting to '*' which will break credentialed requests."
    )
  }

  return {
    "Access-Control-Allow-Origin":  origin ?? "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": origin ? "true" : "false",
    "Vary": "Origin",
  }
}

export function withCORS(handler: RouteHandler): RouteHandler {
  return async (req, context) => {
    // Handle preflight
    if (req.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: buildCorsHeaders(),
      })
    }

    const res = await handler(req, context)

    Object.entries(buildCorsHeaders()).forEach(([key, value]) =>
      res.headers.set(key, value)
    )

    return res
  }
}

/* =====================================================
   withRateLimit
   In-memory rate limiter — single process only.
   For multi-instance / serverless: replace with Upstash Redis.

   Usage:
     export const POST = withRateLimit(10, 60_000)(handler)
     export const GET  = withAuth(withRateLimit()(getHandler))  // default limits
===================================================== */

const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

// Periodically clean up expired entries to prevent memory leak
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of rateLimitStore) {
    if (now > record.resetAt) rateLimitStore.delete(key)
  }
}, 5 * 60 * 1000) // every 5 minutes

export function withRateLimit(
  maxRequests = 100,
  windowMs = 60_000
) {
  return (handler: RouteHandler): RouteHandler =>
    async (req, context) => {
      const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        req.headers.get("x-real-ip") ??
        "unknown"

      const now = Date.now()
      const record = rateLimitStore.get(ip)

      if (!record || now > record.resetAt) {
        rateLimitStore.set(ip, { count: 1, resetAt: now + windowMs })
      } else {
        record.count++

        if (record.count > maxRequests) {
          const retryAfter = Math.ceil((record.resetAt - now) / 1000)

          return NextResponse.json(
            { error: "Too many requests. Please try again later." },
            {
              status: 429,
              headers: {
                "Retry-After": String(retryAfter),
                "X-RateLimit-Limit": String(maxRequests),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": String(Math.ceil(record.resetAt / 1000)),
              },
            }
          )
        }
      }

      return handler(req, context)
    }
}