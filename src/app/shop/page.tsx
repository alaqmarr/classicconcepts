export const dynamic = "force-dynamic";
import { getFullCatalogIndex, getPublicSiteSettings } from "@/lib/public-data";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProductGridWithSearch } from "@/components/shop/ProductGridWithSearch";
import { ShopSmartSearchBar } from "@/components/ai/ShopSmartSearchBar";
import { getSiteContentMap, getContentValue } from "@/lib/site-content";

const DEFAULT_SHOP_CHIPS = [
  "Clear podium for stage",
  "Gifts for students under ₹1,000",
  "Brochure & menu stand for counter",
  "Suggestion box with lock",
  "Custom size acrylic display cover",
];

export const metadata = {
  title: "Shop All Products - Classic Concepts",
  description:
    "Browse our entire catalog of premium acrylic furniture and products.",
  openGraph: {
    title: "Shop All Products - Classic Concepts",
    description:
      "Browse our entire catalog of premium acrylic furniture and products.",
    url: "https://classicconcepts.in/shop",
    siteName: "Classic Concepts",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "Classic Concepts Shop",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shop All Products - Classic Concepts",
    description:
      "Browse our entire catalog of premium acrylic furniture and products.",
    images: ["/logo.png"],
  },
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;
  const searchQuery =
    typeof resolvedParams.q === "string" ? resolvedParams.q.trim() : undefined;
  const categorySlug =
    typeof resolvedParams.category === "string"
      ? resolvedParams.category.trim()
      : undefined;

  const [catalog, settings, content] = await Promise.all([
    getFullCatalogIndex(),
    getPublicSiteSettings(),
    getSiteContentMap(),
  ]);

  const queryLower = searchQuery?.toLowerCase();
  const products = catalog.products.filter((p) => {
    if (categorySlug && p.category.slug !== categorySlug) {
      return false;
    }
    if (queryLower) {
      const matchesName = p.name.toLowerCase().includes(queryLower);
      const matchesSku = Boolean(p.sku?.toLowerCase().includes(queryLower));
      const matchesDesc = Boolean(
        p.description?.toLowerCase().includes(queryLower)
      );
      if (!matchesName && !matchesSku && !matchesDesc) {
        return false;
      }
    }
    return true;
  });

  const totalProductsOverall = catalog.totalProductsOverall;
  const categories = catalog.categories.filter((c) => c._count.products > 0);
  const activeCat = categorySlug
    ? categories.find((c) => c.slug === categorySlug)
    : null;

  const quickPills = [
    {
      label: "All Products",
      href: "/shop",
      count: totalProductsOverall,
      active: !categorySlug,
    },
    ...categories.map((cat) => ({
      label: cat.name,
      href: `/shop/c/${cat.slug}`,
      count: cat._count.products,
      active: categorySlug === cat.slug,
    })),
  ];

  const filterGroups = [
    {
      title: "Product Categories",
      items: [
        {
          label: "All Products",
          href: "/shop",
          count: totalProductsOverall,
          active: !categorySlug,
        },
        ...categories.map((cat) => ({
          label: cat.name,
          href: `/shop/c/${cat.slug}`,
          count: cat._count.products,
          active: categorySlug === cat.slug,
        })),
      ],
    },
    ...(catalog.problemStatements.length > 0
      ? [
          {
            title: "Shop by Requirement",
            items: catalog.problemStatements.map((ps) => ({
              label: ps.name,
              href: `/shop/problem/${ps.slug}`,
              active: false,
            })),
          },
        ]
      : []),
    ...(catalog.industries.length > 0
      ? [
          {
            title: "Shop by Industry",
            items: catalog.industries.map((ind) => ({
              label: ind.name,
              href: `/shop/industry/${ind.slug}`,
              active: false,
            })),
          },
        ]
      : []),
  ];

  const resolvedQuickIdeas = DEFAULT_SHOP_CHIPS.map((def, idx) =>
    getContentValue(content, `shop.search.chip_${idx + 1}`, def)
  );

  return (
    <main className="min-h-screen bg-[#fafbfc] flex flex-col relative">
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_right,rgba(227,24,55,0.03)_0%,rgba(255,223,0,0.02)_40%,rgba(59,130,246,0.02)_80%,transparent_100%)] pointer-events-none"></div>
      <PageHeader
        contentKeyPrefix="shop.banner"
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Shop" }]}
        title={
          <>
            All{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
              Products
            </span>
          </>
        }
        description="Browse our complete catalog of precision-crafted acrylic podiums, stands, awards, and custom solutions."
      />

      <section className="py-8 sm:py-10 container mx-auto px-4 sm:px-6 relative z-20 space-y-6">
        {/* ACRIO Smart Search Bar */}
        <ShopSmartSearchBar
          onlyPodiums={false}
          whatsappNumber={settings?.whatsappNumber || "+917337220568"}
          customQuickIdeas={resolvedQuickIdeas}
          contentPrefix="shop.search"
          placeholder="Search products, SKU, or describe what you need in plain words (e.g., 'menu stand for restaurant', 'school trophy', 'LED stage podium')..."
        />

        {/* Full-Width Product Listing with Slide-Over Filter Sheet */}
        <ProductGridWithSearch
          products={products}
          phone={settings?.whatsappNumber || "+917337220568"}
          initialQuery={searchQuery || ""}
          contextLabel={
            activeCat
              ? activeCat.name
              : searchQuery
                ? `Search "${searchQuery}"`
                : "All Categories"
          }
          itemLabel="products"
          clearHref={categorySlug || searchQuery ? "/shop" : undefined}
          clearText={categorySlug || searchQuery ? "Reset View" : undefined}
          quickPills={quickPills}
          filterGroups={filterGroups}
        />
      </section>
    </main>
  );
}
