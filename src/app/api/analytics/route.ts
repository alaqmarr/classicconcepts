import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Coalesce analytics writes in memory and flush periodically to prevent SQLite write contention
const globalAnalytics = globalThis as unknown as {
  visitBuffer?: Map<string, number>;
  flushTimer?: ReturnType<typeof setTimeout> | null;
};

if (!globalAnalytics.visitBuffer) {
  globalAnalytics.visitBuffer = new Map<string, number>();
}

async function flushVisitsToDb() {
  globalAnalytics.flushTimer = null;
  const buffer = globalAnalytics.visitBuffer;
  if (!buffer || buffer.size === 0) return;

  const entries = Array.from(buffer.entries());
  buffer.clear();

  try {
    await prisma.$transaction(
      entries.map(([path, count]) =>
        prisma.pageVisit.upsert({
          where: { path },
          update: { visits: { increment: count } },
          create: { path, visits: count },
        })
      )
    );
  } catch (err) {
    console.error("Analytics batch flush error:", err);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawPath = typeof body?.path === "string" ? body.path.trim() : "";

    if (!rawPath || rawPath.length > 200 || !rawPath.startsWith("/")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const buffer = globalAnalytics.visitBuffer!;
    if (buffer.size < 500 || buffer.has(rawPath)) {
      buffer.set(rawPath, (buffer.get(rawPath) || 0) + 1);
    }

    if (!globalAnalytics.flushTimer) {
      globalAnalytics.flushTimer = setTimeout(flushVisitsToDb, 10_000);
      if (typeof globalAnalytics.flushTimer.unref === "function") {
        globalAnalytics.flushTimer.unref();
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to queue analytics" }, { status: 500 });
  }
}
