import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PRODUCT_CARD_SELECT } from "@/lib/product-select";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const excludeParam = searchParams.get("exclude") || "";
    const excludeSlugs = excludeParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    // Find categories of products currently in cart
    let preferredCategoryIds: string[] = [];
    if (excludeSlugs.length > 0) {
      const cartProducts = await prisma.product.findMany({
        where: { slug: { in: excludeSlugs } },
        select: { categoryId: true },
      });
      preferredCategoryIds = Array.from(
        new Set(cartProducts.map((p) => p.categoryId).filter(Boolean))
      );
    }

    // Fetch related products in same categories first
    let relatedProducts: any[] = [];
    if (preferredCategoryIds.length > 0) {
      relatedProducts = await prisma.product.findMany({
        where: {
          categoryId: { in: preferredCategoryIds },
          slug: { notIn: excludeSlugs },
        },
        select: PRODUCT_CARD_SELECT,
        orderBy: { name: "asc" },
        take: 8,
      });
    }

    // If fewer than 8, fill with other products sorted A-Z
    if (relatedProducts.length < 8) {
      const existingIds = relatedProducts.map((p) => p.id);
      const additionalProducts = await prisma.product.findMany({
        where: {
          id: { notIn: existingIds },
          slug: { notIn: excludeSlugs },
        },
        select: PRODUCT_CARD_SELECT,
        orderBy: { name: "asc" },
        take: 8 - relatedProducts.length,
      });
      relatedProducts = [...relatedProducts, ...additionalProducts];
    }

    return NextResponse.json({ products: relatedProducts });
  } catch (error) {
    console.error("Failed to fetch product suggestions:", error);
    return NextResponse.json({ products: [] }, { status: 500 });
  }
}
