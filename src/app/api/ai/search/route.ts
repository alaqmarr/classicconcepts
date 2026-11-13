import { NextResponse } from "next/server";
import { runSmartCatalogSearch } from "@/lib/ai";
import { checkPublicAiRateLimit } from "@/lib/ai-context";

export const dynamic = "force-dynamic";

function extractIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for") || "";
  return forwarded.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "anon";
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim().slice(0, 300);
    const onlyPodiums = searchParams.get("podiums") === "1" || searchParams.get("podiums") === "true";
    const categorySlug = searchParams.get("category") || undefined;
    const requestedAi = searchParams.get("ai") === "1" || searchParams.get("ai") === "true";
    const limit = Math.min(24, Math.max(1, Number(searchParams.get("limit")) || 12));

    const ip = extractIp(req);
    const allowAi = requestedAi ? checkPublicAiRateLimit(ip, 20, 10 * 60 * 1000) : false;

    const result = await runSmartCatalogSearch(q, {
      onlyPodiums,
      categorySlug,
      useAi: allowAi,
      limit,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("Smart search GET error:", err);
    return NextResponse.json({
      products: [],
      summary: null,
      matchedCategories: [],
      source: "smart-local",
    });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const q = typeof body?.query === "string" ? body.query.trim().slice(0, 300) : "";
    const onlyPodiums = Boolean(body?.onlyPodiums);
    const categorySlug = typeof body?.categorySlug === "string" ? body.categorySlug : undefined;
    const requestedAi = body?.useAi !== false;
    const limit = Math.min(24, Math.max(1, Number(body?.limit) || 12));

    const ip = extractIp(req);
    const allowAi = requestedAi ? checkPublicAiRateLimit(ip, 20, 10 * 60 * 1000) : false;

    const result = await runSmartCatalogSearch(q, {
      onlyPodiums,
      categorySlug,
      useAi: allowAi,
      limit,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("Smart search POST error:", err);
    return NextResponse.json({
      products: [],
      summary: null,
      matchedCategories: [],
      source: "smart-local",
    });
  }
}
