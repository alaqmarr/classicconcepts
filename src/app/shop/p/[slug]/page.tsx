import {
  getCachedProductDetailBySlug,
  getFullCatalogIndex,
  getPublicSiteSettings,
} from "@/lib/public-data";
import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { notFound } from "next/navigation";
import { InteractiveProductView } from "./InteractiveProductView";
import { ProductDetailSections } from "./ProductDetailSections";
import { ProductCard } from "@/components/shop/ProductCard";

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
  const phone = "+917337220568";

  // Related products from the same category (or podiums)
  const relatedProducts = catalog.products
    .filter(
      (p) =>
        p.id !== product.id &&
        (product.isPodium ? p.isPodium : p.categoryId === product.category.id)
    )
    .slice(0, 6);

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

  const categoryBackHref = product.isPodium
    ? "/podiums"
    : `/shop/c/${product.category.slug}`;

  return (
    <main className="min-h-screen bg-[#f8fafc] flex flex-col pb-24 relative">
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

      {/* Full-Width Top Breadcrumb & Back Navigation Bar */}
      <div className="bg-[#0c1a40] py-3.5 border-b border-white/10 relative z-10">
        <div className="container mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-3">
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-300"
          >
            <Link href="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <ChevronRight size={13} className="text-slate-500" />
            <Link
              href={product.isPodium ? "/podiums" : "/shop"}
              className="hover:text-white transition-colors"
            >
              {product.isPodium ? "Podiums" : "Shop"}
            </Link>
            <ChevronRight size={13} className="text-slate-500" />
            <Link
              href={categoryBackHref}
              className="hover:text-white transition-colors"
            >
              {product.category.name}
            </Link>
            {product.podiumSubCategory && (
              <>
                <ChevronRight size={13} className="text-slate-500" />
                <Link
                  href={`/podiums/${product.podiumSubCategory.slug}`}
                  className="text-sky-300 hover:text-white transition-colors"
                >
                  {product.podiumSubCategory.name}
                </Link>
              </>
            )}
            <ChevronRight size={13} className="text-slate-500" />
            <span className="text-white font-bold truncate max-w-[200px] sm:max-w-md">
              {product.name}
            </span>
          </nav>

          <div className="flex items-center gap-2">
            {product.podiumSubCategory && (
              <Link
                href={`/podiums/${product.podiumSubCategory.slug}`}
                className="px-3 py-1 rounded-full bg-white/10 text-sky-200 border border-white/15 text-xs font-bold hover:bg-white/20 transition-colors"
              >
                {product.podiumSubCategory.name}
              </Link>
            )}
            <Link
              href={categoryBackHref}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-[#0056b3] hover:bg-[#004494] px-3.5 py-1.5 rounded-lg transition-colors"
            >
              <ArrowLeft size={14} /> Back to{" "}
              {product.isPodium ? "Podiums" : product.category.name}
            </Link>
          </div>
        </div>
      </div>

      <section className="container mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-8 relative">
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-slate-200 overflow-hidden">
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
            phone={phone}
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

      {/* Full-Width Related Products Section */}
      {relatedProducts.length > 0 && (
        <section className="container mx-auto px-4 sm:px-6 mt-10 pt-8 border-t border-slate-200 relative">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                More in {product.isPodium ? "Podiums" : product.category.name}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Explore other precision-fabricated models from our catalog
              </p>
            </div>
            <Link
              href={categoryBackHref}
              className="text-xs sm:text-sm font-bold text-[#0056b3] hover:underline inline-flex items-center gap-1"
            >
              View All {product.isPodium ? "Podiums" : product.category.name}{" "}
              <ChevronRight size={15} />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3.5 sm:gap-5">
            {relatedProducts.map((rel) => (
              <ProductCard key={rel.id} product={rel} phone={phone} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
