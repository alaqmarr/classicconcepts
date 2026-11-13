import { NextResponse } from "next/server";
import { getFullCatalogIndex } from "@/lib/public-data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const excludeParam = searchParams.get("exclude") || "";
    const excludeSlugs = new Set(
      excludeParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    );

    const catalog = await getFullCatalogIndex();

    // Find categories of products currently in cart directly from 100MB Redis index
    const preferredCategoryIds = new Set<string>();
    if (excludeSlugs.size > 0) {
      for (const p of catalog.products) {
        if (excludeSlugs.has(p.slug) && p.categoryId) {
          preferredCategoryIds.add(p.categoryId);
        }
      }
    }

    const relatedProducts = [];
    const seenIds = new Set<string>();

    if (preferredCategoryIds.size > 0) {
      for (const p of catalog.products) {
        if (excludeSlugs.has(p.slug)) continue;
        if (preferredCategoryIds.has(p.categoryId)) {
          relatedProducts.push(p);
          seenIds.add(p.id);
          if (relatedProducts.length >= 8) break;
        }
      }
    }

    if (relatedProducts.length < 8) {
      for (const p of catalog.products) {
        if (excludeSlugs.has(p.slug) || seenIds.has(p.id)) continue;
        relatedProducts.push(p);
        seenIds.add(p.id);
        if (relatedProducts.length >= 8) break;
      }
    }

    return NextResponse.json({ products: relatedProducts });
  } catch (error) {
    console.error("Failed to fetch product suggestions:", error);
    return NextResponse.json({ products: [] }, { status: 500 });
  }
}
