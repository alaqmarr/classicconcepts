import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeRichHtmlToStructuredText, isDimensionSpecification } from "@/lib/product-knowledge";

export const dynamic = "force-dynamic";

function isDummyProductRow(row: {
  id?: string | null;
  name?: string | null;
  slug?: string | null;
}): boolean {
  const id = String(row.id || "").trim().toLowerCase();
  const name = String(row.name || "").trim().toLowerCase();
  const slug = String(row.slug || "").trim().toLowerCase();
  return (
    !name ||
    id === "test" ||
    slug === "test" ||
    name === "test" ||
    name === "test product" ||
    /^test\s+product\b/i.test(name)
  );
}

/**
 * Public/Internal Catalog Bridge for Classic Concepts WhatsApp Hub (`ccwhatsapp`).
 * Exposes all active products, categories, podium styles, dimensions, technical specifications,
 * features, variants, rich HTML descriptions, important notes, industries, problemStatements,
 * resources, and recent enquiries so ACRIO WhatsApp AI Co-Pilot has 100% live product knowledge.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("q") || "").trim().toLowerCase();
    const limitParam = Number(searchParams.get("limit") || "250");
    const limit = Math.min(Math.max(limitParam, 1), 500);

    const [productsRaw, enquiries, globalResources] = await Promise.all([
      prisma.product.findMany({
        orderBy: [{ isPodium: "desc" }, { updatedAt: "desc" }],
        take: 350,
        include: {
          category: { select: { name: true, slug: true } },
          subCategory: { select: { name: true, slug: true } },
          subCategories: { select: { name: true, slug: true } },
          podiumSubCategory: { select: { name: true, slug: true } },
          podiumSubCategories: { select: { name: true, slug: true } },
          images: {
            orderBy: [{ isMain: "desc" }, { createdAt: "asc" }],
            take: 3,
            select: { url: true, isMain: true },
          },
          features: {
            select: { text: true },
          },
          specifications: {
            select: { name: true, value: true, type: true },
          },
          variants: {
            select: { id: true, name: true, price: true, imageUrl: true },
          },
          industries: {
            select: { name: true, slug: true, description: true },
          },
          problemStatements: {
            select: { name: true, slug: true, description: true },
          },
        },
      }),
      prisma.enquiry.findMany({
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.resource
        .findMany({
          select: { title: true, fileUrl: true, type: true },
          take: 30,
        })
        .catch(() => [] as { title: string; fileUrl: string; type: string }[]),
    ]);

    const products = productsRaw.filter((p) => !isDummyProductRow(p));

    const filtered = search
      ? products.filter((p) => {
          const descText = normalizeRichHtmlToStructuredText(p.descriptionHtml);
          const noteText = normalizeRichHtmlToStructuredText(p.importantNoteHtml);
          const haystack = [
            p.name,
            p.sku || "",
            p.slug,
            p.category?.name || "",
            p.subCategory?.name || "",
            ...p.subCategories.map((sc) => sc.name),
            p.podiumSubCategory?.name || "",
            ...p.podiumSubCategories.map((psc) => psc.name),
            p.description || "",
            descText,
            noteText,
            p.searchKeywords || "",
            ...p.features.map((f) => f.text),
            ...p.specifications.map((s) => `${s.name} ${s.value}`),
            ...p.variants.map((v) => `${v.name} ${v.price ?? ""}`),
            ...p.industries.map((i) => `${i.name} ${i.description || ""}`),
            ...p.problemStatements.map((ps) => `${ps.name} ${ps.description || ""}`),
          ]
            .join(" ")
            .toLowerCase();
          return haystack.includes(search);
        })
      : products;

    const mappedProducts = filtered.slice(0, limit).map((p) => {
      const descriptionText = [
        normalizeRichHtmlToStructuredText(p.description),
        normalizeRichHtmlToStructuredText(p.descriptionHtml),
      ]
        .filter(Boolean)
        .join("\n")
        .trim();
      const importantNoteText = normalizeRichHtmlToStructuredText(
        p.importantNoteHtml
      );
      const specs = p.specifications.map((s) => ({
        key: s.name,
        name: s.name,
        value: s.value,
        type: s.type || "specification",
      }));
      const dimensions = specs.filter((s) =>
        isDimensionSpecification({ name: s.name, value: s.value, type: s.type })
      );
      const technicalSpecifications = specs.filter(
        (s) =>
          !isDimensionSpecification({ name: s.name, value: s.value, type: s.type })
      );

      return {
        id: p.id,
        brand: "CLASSIC_CONCEPTS" as const,
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        categoryName: p.subCategory
          ? `${p.category.name} - ${p.subCategory.name}`
          : p.category.name,
        subCategories: p.subCategories.map((sc) => sc.name),
        podiumSubCategory: p.podiumSubCategory?.name || null,
        podiumSubCategories: p.podiumSubCategories.map((psc) => psc.name),
        description: p.description,
        descriptionHtml: p.descriptionHtml,
        descriptionText,
        importantNoteHtml: p.importantNoteHtml,
        importantNoteText,
        searchKeywords: p.searchKeywords,
        basePrice: p.basePrice,
        discountPrice: p.discountPrice,
        discountBadge: p.discountBadge,
        stockStatus: p.stockStatus,
        isPodium: p.isPodium,
        isRegisteredDesign: p.isRegisteredDesign,
        designRegistrationNo: p.designRegistrationNo,
        ipProtectionText: p.ipProtectionText,
        videoUrl: p.videoUrl,
        mainImage: p.images[0]?.url || null,
        url: `https://classicconcepts.in/shop/p/${p.slug}`,
        features: p.features.map((f) => f.text),
        specifications: specs,
        dimensions,
        technicalSpecifications,
        variants: p.variants.map((v) => ({
          id: v.id,
          name: v.name,
          price: v.price,
          imageUrl: v.imageUrl,
        })),
        industries: p.industries
          .filter((i) => !isDummyProductRow({ id: i.slug, name: i.name }))
          .map((i) => ({
            name: i.name,
            slug: i.slug,
            description: normalizeRichHtmlToStructuredText(i.description),
          })),
        problemStatements: p.problemStatements
          .filter((ps) => !isDummyProductRow({ id: ps.slug, name: ps.name }))
          .map((ps) => ({
            name: ps.name,
            slug: ps.slug,
            description: normalizeRichHtmlToStructuredText(ps.description),
          })),
        resources: globalResources.map((r) => ({ name: r.title, url: r.fileUrl })),
      };
    });

    return NextResponse.json({
      ok: true,
      brand: "CLASSIC_CONCEPTS",
      domain: "https://classicconcepts.in",
      count: mappedProducts.length,
      products: mappedProducts,
      enquiries: enquiries.map((e) => ({
        id: e.id,
        name: e.name,
        email: e.email,
        phone: e.phone,
        message: e.message,
        source: e.source,
        status: e.status,
        createdAt: e.createdAt.toISOString(),
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to load catalog" },
      { status: 500 }
    );
  }
}
