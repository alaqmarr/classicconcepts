import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { runCustomerConcierge } from "@/lib/ai";
import { checkPublicAiRateLimit } from "@/lib/ai-context";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const query = typeof body?.query === "string" ? body.query.trim().slice(0, 500) : "";
    const history = Array.isArray(body?.history) ? body.history : undefined;

    const forwarded = req.headers.get("x-forwarded-for") || "";
    const ip = forwarded.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "anon";

    const [withinAiBudget, session] = await Promise.all([
      Promise.resolve(checkPublicAiRateLimit(ip, 25, 10 * 60 * 1000)),
      getServerSession(authOptions).catch(() => null),
    ]);
    const result = await runCustomerConcierge(query, withinAiBudget, history);

    if (!session?.user) {
      const { aiDiagnostic: _omit, ...publicResult } = result;
      return NextResponse.json(publicResult);
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Concierge route fallback error:", err);
    return NextResponse.json(
      {
        intent: "browse",
        message:
          "Welcome to Classic Concepts! Tell ACRIO what acrylic item, event, or workplace setup you are looking for, or message our team on WhatsApp.",
        highlights: [],
        products: [],
        suggestedLinks: [
          { label: "Explore Podiums", href: "/podiums" },
          { label: "Shop All Products", href: "/shop" },
        ],
        followUpChips: [
          "Clear stage podiums",
          "Acrylic trophies & awards",
          "Display stands & holders",
        ],
        whatsappNumber: "+917337222876",
        whatsappPrefill: "Hi Classic Concepts, I need help choosing an acrylic product.",
        source: "smart-local",
        modelUsed: "local-catalog",
        engineLabel: "Local Catalog Match • Fallback",
      },
      { status: 200 }
    );
  }
}
