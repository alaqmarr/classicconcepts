export const dynamic = "force-dynamic";
import { getFullCatalogIndex, getPublicSiteSettings } from "@/lib/public-data";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProductCard } from "@/components/shop/ProductCard";
import { ShopSmartSearchBar } from "@/components/ai/ShopSmartSearchBar";
import {
  getSiteContentMap,
  getContentValue,
  hasContentOverride,
} from "@/lib/site-content";
import { EditableText } from "@/components/inline-edit/EditableText";
import Link from "next/link";
import { Filter, Search } from "lucide-react";

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
      const matchesDesc = Boolean(p.description?.toLowerCase().includes(queryLower));
      if (!matchesName && !matchesSku && !matchesDesc) {
        return false;
      }
    }
    return true;
  });

  const totalProductsOverall = catalog.totalProductsOverall;
  const categories = catalog.categories.filter((c) => c._count.products > 0);

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

      <section className="py-12 container mx-auto px-6 relative z-20">
        {/* ACRIO Smart Search Bar */}
        <ShopSmartSearchBar
          onlyPodiums={false}
          placeholder="Search products, SKU, or talk to ACRIO in plain words (e.g., 'menu stand for restaurant', 'school trophy', 'LED stage podium')..."
        />

        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Filters */}
          <aside className="w-full md:w-64 flex-shrink-0 space-y-8">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                <Filter size={18} className="text-[#0056b3]" />
                <EditableText
                  contentKey="shop.sidebar.categories_title"
                  value={getContentValue(
                    content,
                    "shop.sidebar.categories_title",
                    "Categories"
                  )}
                  hasCustomValue={hasContentOverride(
                    content,
                    "shop.sidebar.categories_title"
                  )}
                  label="Sidebar Categories Heading"
                />
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/shop"
                    className={`${
                      !categorySlug
                        ? "text-[#0056b3] font-bold"
                        : "text-slate-600 hover:text-[#0056b3] font-medium"
                    } text-sm flex items-center justify-between group`}
                  >
                    <EditableText
                      contentKey="shop.sidebar.all_products_label"
                      value={getContentValue(
                        content,
                        "shop.sidebar.all_products_label",
                        "All Products"
                      )}
                      hasCustomValue={hasContentOverride(
                        content,
                        "shop.sidebar.all_products_label"
                      )}
                      label="All Products Filter Label"
                    />
                    <span className="bg-blue-50 text-[#0056b3] px-2 py-0.5 rounded-full text-xs group-hover:bg-[#0056b3] group-hover:text-white transition-colors">
                      {totalProductsOverall}
                    </span>
                  </Link>
                </li>
                {categories.map((cat) => (
                  <li key={cat.id}>
                    <Link
                      href={`/shop/c/${cat.slug}`}
                      className={`${
                        categorySlug === cat.slug
                          ? "text-[#0056b3] font-bold"
                          : "text-slate-600 hover:text-[#0056b3] font-medium"
                      } text-sm flex items-center justify-between transition-colors gap-2`}
                    >
                      <EditableText
                        entity={{
                          model: "category",
                          id: cat.id,
                          field: "name",
                        }}
                        value={cat.name}
                        label={`Category Name — ${cat.name}`}
                      />
                      <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-xs shrink-0">
                        {cat._count.products}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 space-y-6">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-slate-600 text-sm font-medium">
                Showing{" "}
                <span className="font-bold text-slate-900">
                  {products.length}
                </span>{" "}
                <EditableText
                  contentKey="shop.toolbar.count_suffix"
                  value={getContentValue(
                    content,
                    "shop.toolbar.count_suffix",
                    "products (Sorted A–Z)"
                  )}
                  hasCustomValue={hasContentOverride(
                    content,
                    "shop.toolbar.count_suffix"
                  )}
                  label="Products Count Label"
                />
              </p>

              <form
                className="relative w-full sm:w-72"
                method="GET"
                action="/shop"
              >
                <input
                  type="text"
                  name="q"
                  defaultValue={searchQuery}
                  placeholder="Quick filter by name / SKU..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-full py-2 pl-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:border-transparent transition-all"
                />
                <button
                  type="submit"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0056b3]"
                >
                  <Search size={18} />
                </button>
              </form>
            </div>

            {products.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-6">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    phone={settings?.whatsappNumber || "+917337222876"}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-200">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                  <Search size={32} />
                </div>
                <EditableText
                  as="h3"
                  contentKey="shop.empty.heading"
                  value={getContentValue(
                    content,
                    "shop.empty.heading",
                    "No products found"
                  )}
                  hasCustomValue={hasContentOverride(
                    content,
                    "shop.empty.heading"
                  )}
                  label="Empty Search Heading"
                  className="text-xl font-bold text-slate-800 mb-2 block"
                />
                <EditableText
                  as="p"
                  mode="multiline"
                  contentKey="shop.empty.subtitle"
                  value={getContentValue(
                    content,
                    "shop.empty.subtitle",
                    "Try talking to ACRIO in the search bar above to tell us what you need in simple words."
                  )}
                  hasCustomValue={hasContentOverride(
                    content,
                    "shop.empty.subtitle"
                  )}
                  label="Empty Search Subtitle"
                  className="text-slate-500 max-w-md mx-auto block"
                />
                <Link
                  href="/shop"
                  className="inline-block mt-6 bg-[#0056b3] text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-800 transition-colors"
                >
                  Clear Filter
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
