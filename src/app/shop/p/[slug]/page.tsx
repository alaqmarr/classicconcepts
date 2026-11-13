import {
  getCachedProductDetailBySlug,
  getFullCatalogIndex,
  getPublicSiteSettings,
} from "@/lib/public-data";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { InteractiveProductView } from "./InteractiveProductView";
import { ProductDetailSections } from "./ProductDetailSections";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getCachedProductDetailBySlug(slug);

  if (!product) return { title: "Product Not Found - Classic Concepts" };

  const subCatText = product.podiumSubCategory
    ? ` | ${product.podiumSubCategory.name}`
    : "";
  const title = `${product.name}${subCatText} | ${product.category.name} - Classic Concepts`;
  const description =
    product.description ||
    `Buy ${product.name} (${product.category.name}) directly from Classic Concepts, India's manufacturer of clear cast acrylic podiums, lecterns, and custom acrylic products Since 2008.`;
  const mainImage =
    product.images?.find((img) => img.isMain)?.url ||
    product.images?.[0]?.url ||
    "/short-logo.png";
  const canonicalUrl = `https://classicconcepts.in/shop/p/${product.slug}`;

  return {
    title,
    description,
    keywords: [
      product.name,
      product.sku || "",
      product.category.name,
      product.podiumSubCategory?.name || "",
      product.isPodium ? "Acrylic Podium" : "Acrylic Products",
      "Classic Concepts",
      "Acrylic Lectern India",
      "Acrylic Manufacturer",
    ].filter(Boolean),
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "Classic Concepts",
      images: [
        {
          url: mainImage,
          width: 800,
          height: 800,
          alt: product.name,
        },
      ],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [mainImage],
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [product, settings, catalog] = await Promise.all([
    getCachedProductDetailBySlug(slug),
    getPublicSiteSettings(),
    getFullCatalogIndex(),
  ]);

  const allCategories = catalog.categories.map((c) => ({
    id: c.id,
    name: c.name,
    subCategories: c.subCategories.map((s) => ({ id: s.id, name: s.name })),
  }));
  const allProblemStatements = catalog.problemStatements.map((ps) => ({
    id: ps.id,
    name: ps.name,
  }));
  const allIndustries = catalog.industries.map((ind) => ({
    id: ind.id,
    name: ind.name,
  }));

  if (!product) {
    notFound();
  }

  const effectivePrice = product.discountPrice || product.basePrice;

  // Rich Schema.org Product + BreadcrumbList JSON-LD for SEO
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.images.map((img) => img.url),
    description:
      product.description ||
      `${product.name} manufactured by Classic Concepts (${product.category.name}).`,
    sku: product.sku || product.slug,
    brand: {
      "@type": "Brand",
      name: "Classic Concepts",
    },
    category: product.podiumSubCategory
      ? `${product.category.name} > ${product.podiumSubCategory.name}`
      : product.category.name,
    ...(effectivePrice
      ? {
          offers: {
            "@type": "Offer",
            url: `https://classicconcepts.in/shop/p/${product.slug}`,
            priceCurrency: "INR",
            price: effectivePrice,
            availability: product.stockStatus?.toLowerCase().includes("out")
              ? "https://schema.org/OutOfStock"
              : "https://schema.org/InStock",
            seller: {
              "@type": "Organization",
              name: "Classic Concepts",
            },
          },
        }
      : {}),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://classicconcepts.in",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: product.isPodium ? "Podiums" : "Shop",
        item: product.isPodium
          ? "https://classicconcepts.in/podiums"
          : "https://classicconcepts.in/shop",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: product.category.name,
        item: `https://classicconcepts.in/shop/c/${product.category.slug}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: product.name,
        item: `https://classicconcepts.in/shop/p/${product.slug}`,
      },
    ],
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#fafbfc] to-[#f0f4ff] flex flex-col pb-24 relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c"),
        }}
      />

      {/* Soft Radial Blush Behind Product */}
      <div className="absolute top-[10%] left-[50%] -translate-x-1/2 w-[80%] max-w-[800px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(227,24,55,0.04)_0%,rgba(255,223,0,0.03)_40%,rgba(59,130,246,0.03)_70%,transparent_100%)] pointer-events-none z-0"></div>

      <div className="bg-slate-900 py-4 border-b border-white/10 relative z-10">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between text-sm font-medium text-slate-300">
            <Link
              href={product.isPodium ? "/podiums" : "/shop"}
              className="hover:text-white transition-colors flex items-center gap-2"
            >
              <ArrowLeft size={16} /> Back to{" "}
              {product.isPodium ? "Podiums" : "Shop"}
            </Link>
            {product.podiumSubCategory && (
              <Link
                href={`/podiums/${product.podiumSubCategory.slug}`}
                className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-bold hover:bg-blue-500/30 transition-colors"
              >
                {product.podiumSubCategory.name}
              </Link>
            )}
          </div>
        </div>
      </div>

      <section className="container mx-auto px-6 pt-12 pb-12 relative z-10">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <InteractiveProductView
            product={{
              id: product.id,
              name: product.name,
              slug: product.slug,
              sku: product.sku,
              basePrice: product.basePrice,
              discountPrice: product.discountPrice,
              discountBadge: product.discountBadge,
              stockStatus: product.stockStatus,
              videoUrl: product.videoUrl,
              description: product.description,
              descriptionHtml: product.descriptionHtml,
              category: {
                id: product.category.id,
                name: product.category.name,
                slug: product.category.slug,
              },
              subCategoryIds: Array.from(
                new Set([
                  ...(product.subCategory ? [product.subCategory.id] : []),
                  ...product.subCategories.map((s) => s.id),
                ])
              ),
              problemStatementIds: product.problemStatements.map((ps) => ps.id),
              industryIds: product.industries.map((ind) => ind.id),
              images: product.images.map((img) => ({
                url: img.url,
                isMain: img.isMain,
              })),
              variants: product.variants.map((v) => ({
                id: v.id,
                name: v.name,
                price: v.price,
                imageUrl: v.imageUrl,
                images: v.images.map((vi) => ({ url: vi.url })),
              })),
            }}
            phone={settings?.whatsappNumber || "+917337222876"}
            allCategories={allCategories}
            allProblemStatements={allProblemStatements}
            allIndustries={allIndustries}
          />
        </div>
      </section>

      {/* Structured Bullet Description, Key Features, Dimensions & Specifications (with On-Page Admin Inline Editing) */}
      <ProductDetailSections
        productId={product.id}
        productName={product.name}
        categoryName={product.category.name}
        sku={product.sku}
        description={product.description}
        descriptionHtml={product.descriptionHtml}
        importantNoteHtml={product.importantNoteHtml}
        initialFeatures={product.features.map((f) => ({
          id: f.id,
          text: f.text,
        }))}
        initialSpecifications={product.specifications.map((s) => ({
          id: s.id,
          name: s.name,
          value: s.value,
          type: s.type,
        }))}
      />
    </main>
  );
}
