import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  ALL_CACHE_TAGS,
  flushAllCacheAndWarm,
  getCacheHealthStats,
  invalidateCacheTags,
  type CacheTag,
} from "@/lib/redis-cache";
import { warmPublicCache } from "@/lib/public-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const stats = await getCacheHealthStats();
    return NextResponse.json({ ok: true, stats });
  } catch (err: any) {
    console.error("GET /api/admin/cache error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to read cache health stats." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "warm");

    if (action === "flush_and_warm") {
      // Ensure public warmer is bound in this worker before flushing & rebuilding
      await flushAllCacheAndWarm();
      await warmPublicCache();
    } else if (action === "invalidate_tags" && Array.isArray(body?.tags)) {
      const validTags = body.tags.filter((t: unknown): t is CacheTag =>
        typeof t === "string" && (ALL_CACHE_TAGS as readonly string[]).includes(t)
      );
      if (validTags.length > 0) {
        await invalidateCacheTags(validTags);
      }
      await warmPublicCache();
    } else {
      await warmPublicCache();
    }

    const stats = await getCacheHealthStats();
    return NextResponse.json({ ok: true, action, stats });
  } catch (err: any) {
    console.error("POST /api/admin/cache error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Cache action failed." },
      { status: 500 }
    );
  }
}
