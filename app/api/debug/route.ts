import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    databaseUrlStart: process.env.DATABASE_URL?.substring(0, 20) ?? "NOT SET",
    nodeEnv: process.env.NODE_ENV,
    allEnvKeys: Object.keys(process.env).filter(k => 
      k.includes("DATABASE") || k.includes("PRISMA")
    ),
  })
}