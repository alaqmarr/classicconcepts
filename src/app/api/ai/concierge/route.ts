import { NextResponse } from "next/server";
import { runCustomerConcierge } from "@/lib/ai";
import { checkPublicAiRateLimit } from "@/lib/ai-context";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const query = typeof body?.query === "string" ? body.query.trim().slice(0, 500) : "";

    const forwarded = req.headers.get("x-forwarded-for") || "";
    const ip = forwarded.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "anon";

    const withinAiBudget = checkPublicAiRateLimit(ip, 15, 10 * 60 * 1000);
    const result = await runCustomerConcierge(query, withinAiBudget);

    return NextResponse.json(result);
  } catch (err) {
    console.error("Concierge route fallback error:", err);
    return NextResponse.json(
      {
        message:
          "Welcome to Classic Concepts! Browse our flagship acrylic podiums and custom creations below, or chat with our engineering team on WhatsApp.",
        highlights: ["20+ years manufacturing excellence", "Custom logo & dimension fabrication"],
        products: [],
        suggestedLinks: [
          { label: "Explore Podiums", href: "/podiums" },
          { label: "Shop All Products", href: "/shop" },
        ],
        followUpChips: [],
        whatsappNumber: "+917337222876",
        whatsappPrefill: "Hi Classic Concepts, I need assistance choosing an acrylic product.",
        source: "smart-local",
      },
      { status: 200 }
    );
  }
}
