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
import { Filter, Layers, Search, ShieldCheck, PackageCheck, Sparkles, Info } from "lucide-react";

export const metadata = {
  title: "Podiums - Classic Concepts",
  description: "Browse our premium collection of acrylic podiums.",
  openGraph: {
    title: "Podiums - Classic Concepts",
    description: "Browse our premium collection of acrylic podiums.",
    url: "https://classicconcepts.in/podiums",
    siteName: "Classic Concepts",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "Classic Concepts Podiums",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Podiums - Classic Concepts",
    description: "Browse our premium collection of acrylic podiums.",
    images: ["/logo.png"],
  },
};

export default async function PodiumsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;
  const searchQuery =
    typeof resolvedParams.q === "string" ? resolvedParams.q : undefined;
  const subSlug =
    typeof resolvedParams.sub === "string" ? resolvedParams.sub : undefined;
  const catSlug =
    typeof resolvedParams.category === "string"
      ? resolvedParams.category
      : undefined;

  const [catalog, settings, content] = await Promise.all([
    getFullCatalogIndex(),
    getPublicSiteSettings(),
    getSiteContentMap(),
  ]);

  const subCategories = catalog.podiumSubCategories;
  const allPodiumsCount = catalog.allPodiumsCount;
  const queryLower = searchQuery?.trim().toLowerCase();

  const products = catalog.products.filter((p) => {
    if (!p.isPodium) return false;
    if (subSlug && !p.podiumSubCategorySlugs.includes(subSlug)) return false;
    if (catSlug && p.category.slug !== catSlug) return false;
    if (queryLower) {
      const matchesName = p.name.toLowerCase().includes(queryLower);
      const matchesSku = Boolean(p.sku?.toLowerCase().includes(queryLower));
      const matchesDesc = Boolean(p.description?.toLowerCase().includes(queryLower));
      if (!matchesName && !matchesSku && !matchesDesc) return false;
    }
    return true;
  });

  const podiumCategories = catalog.categories
    .filter((c) => c._count.podiumProducts > 0)
    .map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      _count: { products: c._count.podiumProducts },
    }));

  const activeSubCategory = subSlug
    ? subCategories.find((s) => s.slug === subSlug)
    : null;
  const activeCategory = catSlug
    ? podiumCategories.find((c) => c.slug === catSlug)
    : null;

  return (
    <main className="min-h-screen bg-[#fafbfc] flex flex-col relative">
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_right,rgba(227,24,55,0.03)_0%,rgba(255,223,0,0.02)_40%,rgba(59,130,246,0.02)_80%,transparent_100%)] pointer-events-none"></div>
      <PageHeader
        contentKeyPrefix={
          activeSubCategory
            ? `podiums.sub.${activeSubCategory.slug}`
            : activeCategory
            ? `podiums.cat.${activeCategory.slug}`
            : "podiums.banner"
        }
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Podiums", href: "/podiums" },
          ...(activeSubCategory ? [{ label: activeSubCategory.name }] : []),
          ...(activeCategory ? [{ label: activeCategory.name }] : []),
        ]}
        title={
          activeSubCategory ? (
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
              {activeSubCategory.name}
            </span>
          ) : activeCategory ? (
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
              {activeCategory.name}
            </span>
          ) : (
            <>
              Premium{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                Podiums
              </span>
            </>
          )
        }
        description="Precision-crafted clear, frosted, wooden-hybrid, and LED-illuminated acrylic podiums & lecterns manufactured in India."
      />

      <section className="py-12 container mx-auto px-6 relative z-20">
        {/* ACRIO Smart Podium Search Bar */}
        <ShopSmartSearchBar
          onlyPodiums={true}
          placeholder="Search podiums by SKU, style, or talk to ACRIO (e.g., 'LED podium with logo for hotel', 'wooden & acrylic school lectern')..."
        />

        {/* Original Patented Designs, Warranty & 3-Range Quick Guide */}
        <div className="mb-8 bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50/60 border border-blue-100">
              <ShieldCheck className="w-5 h-5 text-[#0056b3] shrink-0 mt-0.5" />
              <div className="text-xs text-slate-700 leading-relaxed">
                <span className="font-extrabold text-slate-900 block mb-0.5">
                  Patented &amp; Copyright Protected Designs
                </span>
                Original Classic Concepts podium models with official patent, registered design, and copyright documents. Hover or tap{" "}
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#0056b3] text-white align-text-bottom">
                  <Info size={10} />
                </span>{" "}
                on any podium card for details.
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
              <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-700 leading-relaxed">
                <span className="font-extrabold text-slate-900 block mb-0.5">
                  5-Year Non-Yellowing Clarity Guarantee
                </span>
                Made Since 2008 from 100% imported clear cast acrylic (up to 25mm thick) with custom UV-printed or engraved company and school logos.
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50/60 border border-amber-100">
              <PackageCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-700 leading-relaxed">
                <span className="font-extrabold text-slate-900 block mb-0.5">
                  Safe Wooden Crated Delivery Across India
                </span>
                Every podium is foam-wrapped inside a heavy wooden crate so it reaches your hotel, auditorium, college, or office safely.
              </div>
            </div>
          </div>

          <details className="group border-t border-slate-100 pt-3">
            <summary className="cursor-pointer list-none flex items-center justify-between text-xs font-bold text-[#0056b3] hover:text-blue-800">
              <span>Compare Our 3 Podium Ranges (Essential vs Classic Signature vs Premium Stage &amp; Digital)</span>
              <span className="text-[11px] bg-blue-50 px-2.5 py-1 rounded-full group-open:bg-[#0056b3] group-open:text-white transition-colors">
                Quick Guide
              </span>
            </summary>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <th className="p-2.5 font-bold">Range</th>
                    <th className="p-2.5 font-bold">Best Used For</th>
                    <th className="p-2.5 font-bold">Material &amp; Build</th>
                    <th className="p-2.5 font-bold">Mic, LED &amp; Logo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr>
                    <td className="p-2.5 font-bold text-slate-900">Essential Range</td>
                    <td className="p-2.5">Classrooms, training rooms, churches &amp; daily office briefings</td>
                    <td className="p-2.5">Strong clear or frosted cast acrylic, lightweight &amp; easy to move</td>
                    <td className="p-2.5">Front logo plate + optional mic hole</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-[#0056b3]">Classic Signature Range</td>
                    <td className="p-2.5">5-star hotels, banquet halls, auditoriums &amp; corporate events</td>
                    <td className="p-2.5">Heavy 12mm to 18mm clear acrylic or Wood + Acrylic combinations</td>
                    <td className="p-2.5">Dual gooseneck mic mounts, inner shelf, warm LED &amp; custom logo</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-indigo-700">Premium &amp; Motorized / Digital</td>
                    <td className="p-2.5">VIP stages, universities, government summits &amp; large conventions</td>
                    <td className="p-2.5">Up to 25mm thick cast acrylic, motorized height adjust or touch screen</td>
                    <td className="p-2.5">Built-in AV/mic routing, LED glow base, lockable castors &amp; crest</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </details>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {(subCategories.length > 0 || podiumCategories.length > 0) && (
            <aside className="w-full md:w-64 flex-shrink-0 space-y-6">
              {subCategories.length > 0 && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                    <Layers size={18} className="text-[#0056b3]" />
                    <EditableText
                      contentKey="podiums.sidebar.subcategories_title"
                      value={getContentValue(
                        content,
                        "podiums.sidebar.subcategories_title",
                        "Podium Sub-Categories"
                      )}
                      hasCustomValue={hasContentOverride(
                        content,
                        "podiums.sidebar.subcategories_title"
                      )}
                      label="Podium Sub-Categories Heading"
                    />
                  </h3>
                  <ul className="space-y-2.5">
                    <li>
                      <Link
                        href="/podiums"
                        className={`${
                          !subSlug && !catSlug
                            ? "text-[#0056b3] font-bold bg-blue-50/70"
                            : "text-slate-600 hover:text-[#0056b3] font-medium"
                        } px-3 py-2 rounded-xl text-sm flex items-center justify-between transition-colors`}
                      >
                        <EditableText
                          contentKey="podiums.sidebar.all_label"
                          value={getContentValue(
                            content,
                            "podiums.sidebar.all_label",
                            "All Podiums"
                          )}
                          hasCustomValue={hasContentOverride(
                            content,
                            "podiums.sidebar.all_label"
                          )}
                          label="All Podiums Filter Label"
                        />
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs">
                          {allPodiumsCount}
                        </span>
                      </Link>
                    </li>
                    {subCategories.map((sub) => {
                      const isActive = sub.slug === subSlug;
                      return (
                        <li key={sub.id}>
                          <Link
                            href={`/podiums/${sub.slug}`}
                            className={`${
                              isActive
                                ? "text-[#0056b3] font-bold bg-blue-50/70"
                                : "text-slate-600 hover:text-[#0056b3] font-medium"
                            } px-3 py-2 rounded-xl text-sm flex items-center justify-between transition-colors gap-2`}
                          >
                            <EditableText
                              entity={{
                                model: "podiumSubCategory",
                                id: sub.id,
                                field: "name",
                              }}
                              value={sub.name}
                              label={`Sub-Category Name: ${sub.name}`}
                            />
                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs shrink-0">
                              {Math.max(sub._count.products, sub._count.multiProducts)}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {podiumCategories.length > 0 && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                    <Filter size={18} className="text-[#0056b3]" />
                    <EditableText
                      contentKey="podiums.sidebar.categories_title"
                      value={getContentValue(
                        content,
                        "podiums.sidebar.categories_title",
                        "Categories"
                      )}
                      hasCustomValue={hasContentOverride(
                        content,
                        "podiums.sidebar.categories_title"
                      )}
                      label="Podium Categories Heading"
                    />
                  </h3>
                  <ul className="space-y-2.5">
                    {podiumCategories.map((cat) => {
                      const isActive = cat.slug === catSlug;
                      return (
                        <li key={cat.id}>
                          <Link
                            href={`/podiums?category=${cat.slug}`}
                            className={`${
                              isActive
                                ? "text-[#0056b3] font-bold bg-blue-50/70"
                                : "text-slate-600 hover:text-[#0056b3] font-medium"
                            } px-3 py-2 rounded-xl text-sm flex items-center justify-between transition-colors gap-2`}
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
                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs shrink-0">
                              {cat._count.products}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </aside>
          )}

          {/* Main Content */}
          <div className="flex-1 space-y-6">
            {subCategories.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/podiums"
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                    !subSlug && !catSlug
                      ? "bg-[#0056b3] text-white shadow-sm"
                      : "bg-white text-slate-600 border border-slate-200 hover:border-[#0056b3] hover:text-[#0056b3]"
                  }`}
                >
                  All Podiums
                </Link>
                {subCategories.map((sub) => (
                  <Link
                    key={sub.id}
                    href={`/podiums/${sub.slug}`}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                      sub.slug === subSlug
                        ? "bg-[#0056b3] text-white shadow-sm"
                        : "bg-white text-slate-600 border border-slate-200 hover:border-[#0056b3] hover:text-[#0056b3]"
                    }`}
                  >
                    <EditableText
                      entity={{
                        model: "podiumSubCategory",
                        id: sub.id,
                        field: "name",
                      }}
                      value={sub.name}
                      label={`Sub-Category Pill — ${sub.name}`}
                    />
                  </Link>
                ))}
              </div>
            )}

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-slate-600 text-sm font-medium">
                Showing{" "}
                <span className="font-bold text-slate-900">
                  {products.length}
                </span>{" "}
                <EditableText
                  contentKey="podiums.toolbar.count_suffix"
                  value={getContentValue(
                    content,
                    "podiums.toolbar.count_suffix",
                    "podiums (Sorted A–Z)"
                  )}
                  hasCustomValue={hasContentOverride(
                    content,
                    "podiums.toolbar.count_suffix"
                  )}
                  label="Podiums Count Label"
                />
              </p>

              <form
                className="relative w-full sm:w-72"
                method="GET"
                action="/podiums"
              >
                {subSlug && <input type="hidden" name="sub" value={subSlug} />}
                {catSlug && (
                  <input type="hidden" name="category" value={catSlug} />
                )}
                <input
                  type="text"
                  name="q"
                  defaultValue={searchQuery}
                  placeholder="Quick filter podiums..."
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
                  contentKey="podiums.empty.heading"
                  value={getContentValue(
                    content,
                    "podiums.empty.heading",
                    "No podiums found"
                  )}
                  hasCustomValue={hasContentOverride(
                    content,
                    "podiums.empty.heading"
                  )}
                  label="Empty Podiums Heading"
                  className="text-xl font-bold text-slate-800 mb-2 block"
                />
                <EditableText
                  as="p"
                  mode="multiline"
                  contentKey="podiums.empty.subtitle"
                  value={getContentValue(
                    content,
                    "podiums.empty.subtitle",
                    "Talk to ACRIO in the search bar above to find the closest podium model."
                  )}
                  hasCustomValue={hasContentOverride(
                    content,
                    "podiums.empty.subtitle"
                  )}
                  label="Empty Podiums Subtitle"
                  className="text-slate-500 max-w-md mx-auto block"
                />
                <Link
                  href="/podiums"
                  className="inline-block mt-6 bg-[#0056b3] text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-800 transition-colors"
                >
                  View All Podiums
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
