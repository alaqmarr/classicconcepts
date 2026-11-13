import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { warmPublicCache } from "@/lib/public-data";
import { getCacheHealthStats } from "@/lib/redis-cache";

export const dynamic = "force-dynamic";

function isLoopbackRequest(req: Request): boolean {
  const host = req.headers.get("host") || "";
  const forwarded = req.headers.get("x-forwarded-for") || "";
  return (
    (host.startsWith("127.0.0.1") || host.startsWith("localhost")) &&
    !forwarded
  );
}

export async function POST(req: Request) {
  try {
    if (!isLoopbackRequest(req)) {
      const session = await getServerSession(authOptions);
      if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    await warmPublicCache();
    const stats = await getCacheHealthStats();
    return NextResponse.json({ ok: true, stats });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Cache warm failed" },
      { status: 500 }
    );
  }
}
