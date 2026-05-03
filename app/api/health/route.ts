import { prisma } from "@/lib/prisma";

/** GET /api/health — liveness + DB connectivity check for Railway */
export async function GET() {
  try {
    // Lightweight DB ping — checks connection is alive
    await prisma.$queryRaw`SELECT 1`;

    return Response.json(
      {
        status: "ok",
        timestamp: new Date().toISOString(),
        db: "connected",
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[health] DB check failed:", err);
    return Response.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        db: "unreachable",
      },
      { status: 503 }
    );
  }
}
