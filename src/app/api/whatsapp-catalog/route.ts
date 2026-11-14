import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rememberCached } from "@/lib/redis-cache";

export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-cc-sync-key",
};

function toAbsoluteUrl(url: string | null | undefined, origin: string): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${origin}${url.startsWith("/") ? "" : "/"}${url}`;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: NextRequest) {
  try {
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      req.nextUrl.origin ||
      "https://classicconcepts.in";

    const customerQuery = (req.nextUrl.searchParams.get("customer") || "").trim();

    const catalogPayload = await rememberCached(
      "whatsapp-sync:catalog:v1",
      ["catalog", "taxonomy", "brand"],
      3600,
      async () => {
        const [products, categories, machinery] = await Promise.all([
          prisma.product.findMany({
            include: {
              category: { select: { name: true, slug: true } },
              subCategory: { select: { name: true, slug: true } },
              images: {
                orderBy: [{ isMain: "desc" }, { createdAt: "asc" }],
                take: 3,
                select: { url: true, isMain: true },
              },
              features: {
                take: 5,
                select: { text: true },
              },
              specifications: {
                take: 8,
                select: { name: true, value: true, type: true },
              },
            },
            orderBy: [{ isPodium: "desc" }, { updatedAt: "desc" }],
          }),
          prisma.category.findMany({
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
            },
          }),
          prisma.machinery.findMany({
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              name: true,
              description: true,
              imageUrl: true,
            },
          }),
        ]);

        return {
          products: products.map((p) => ({
            id: p.id,
            brand: "CLASSIC_CONCEPTS" as const,
            brandLabel: "Classic Concepts",
            itemType: "PRODUCT" as const,
            name: p.name,
            slug: p.slug,
            sku: p.sku || null,
            description: p.description || null,
            categoryName: p.category?.name || "Acrylic Products",
            categorySlug: p.category?.slug || "",
            subCategoryName: p.subCategory?.name || null,
            basePrice: p.basePrice ?? null,
            discountPrice: p.discountPrice ?? null,
            stockStatus: p.stockStatus || "In stock",
            isPodium: p.isPodium,
            mainImage: toAbsoluteUrl(p.images[0]?.url || null, origin),
            features: p.features.map((f) => f.text),
            specifications: p.specifications.map((s) => ({
              key: s.name,
              value: s.value,
            })),
            url: `${origin}/shop/p/${p.slug}`,
            updatedAt: p.updatedAt.toISOString(),
          })),
          categories: categories.map((c) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            description: c.description || null,
            url: `${origin}/shop/c/${c.slug}`,
          })),
          machinery: machinery.map((m) => ({
            id: m.id,
            name: m.name,
            description: m.description || null,
            imageUrl: toAbsoluteUrl(m.imageUrl, origin),
          })),
        };
      }
    );

    let customerEnquiries: {
      id: string;
      brand: "CLASSIC_CONCEPTS";
      name: string;
      email: string;
      phone: string;
      message: string;
      source: string;
      status: string;
      createdAt: string;
    }[] = [];

    let customerCartOrders: {
      id: string;
      name: string;
      phone: string;
      total: number | null;
      status: string;
      itemsSummary: string;
      createdAt: string;
    }[] = [];

    if (customerQuery) {
      const last10 = customerQuery.replace(/\D/g, "").slice(-10);
      const isEmail = customerQuery.includes("@");
      const orFilters: any[] = [];
      if (last10.length >= 7) {
        orFilters.push({ phone: { contains: last10 } });
      }
      if (isEmail) {
        orFilters.push({ email: { equals: customerQuery } });
      }

      if (orFilters.length > 0) {
        const [enqRows, cartRows] = await Promise.all([
          prisma.enquiry.findMany({
            where: { OR: orFilters },
            orderBy: { createdAt: "desc" },
            take: 8,
          }),
          prisma.cartOrder.findMany({
            where: { OR: orFilters },
            include: { items: true },
            orderBy: { createdAt: "desc" },
            take: 8,
          }),
        ]);

        customerEnquiries = enqRows.map((e) => ({
          id: e.id,
          brand: "CLASSIC_CONCEPTS",
          name: e.name,
          email: e.email,
          phone: e.phone,
          message: e.message,
          source: `classicconcepts.in (${e.source})`,
          status: e.status,
          createdAt: e.createdAt.toISOString(),
        }));

        customerCartOrders = cartRows.map((o) => ({
          id: o.id,
          name: o.name,
          phone: o.phone,
          total: o.total ?? null,
          status: o.status,
          itemsSummary: o.items
            .map((it) => `${it.quantity}x ${it.productName}`)
            .join(", "),
          createdAt: o.createdAt.toISOString(),
        }));
      }
    }

    return NextResponse.json(
      {
        ok: true,
        source: "classicconcepts.in",
        syncedAt: new Date().toISOString(),
        ...catalogPayload,
        customerEnquiries,
        customerCartOrders,
      },
      { headers: CORS_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Failed to export Classic Concepts catalog",
      },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
