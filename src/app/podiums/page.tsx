export const dynamic = "force-dynamic";
import { getFullCatalogIndex, getPublicSiteSettings } from "@/lib/public-data";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProductGridWithSearch } from "@/components/shop/ProductGridWithSearch";
import { ShopSmartSearchBar } from "@/components/ai/ShopSmartSearchBar";
import {
  getSiteContentMap,
  getContentValue,
  hasContentOverride,
} from "@/lib/site-content";
import { EditableText } from "@/components/inline-edit/EditableText";
import { ShieldCheck } from "lucide-react";

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

const DEFAULT_PODIUM_CHIPS = [
  "Clear stage podium with school logo",
  "Economy podium for classroom",
  "Wood & acrylic lectern for auditorium",
  "Heavy duty LED podium for hotel",
  "Motorized height adjustable podium",
];

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
      const matchesDesc = Boolean(
        p.description?.toLowerCase().includes(queryLower)
      );
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

  const quickPills = [
    {
      label: "All Podiums",
      href: "/podiums",
      count: allPodiumsCount,
      active: !subSlug && !catSlug,
    },
    ...subCategories.map((sub) => ({
      label: sub.name,
      href: `/podiums/${sub.slug}`,
      count: Math.max(sub._count.products, sub._count.multiProducts),
      active: sub.slug === subSlug,
    })),
  ];

  const filterGroups = [
    ...(subCategories.length > 0
      ? [
          {
            title: "Podium Sub-Categories",
            items: [
              {
                label: "All Podiums",
                href: "/podiums",
                count: allPodiumsCount,
                active: !subSlug && !catSlug,
              },
              ...subCategories.map((sub) => ({
                label: sub.name,
                href: `/podiums/${sub.slug}`,
                count: Math.max(sub._count.products, sub._count.multiProducts),
                active: sub.slug === subSlug,
              })),
            ],
          },
        ]
      : []),
    ...(podiumCategories.length > 0
      ? [
          {
            title: "Podium Categories",
            items: podiumCategories.map((cat) => ({
              label: cat.name,
              href: `/podiums?category=${cat.slug}`,
              count: cat._count.products,
              active: cat.slug === catSlug,
            })),
          },
        ]
      : []),
    {
      title: "Other Product Lines",
      items: [
        {
          label: "Browse Full Shop Catalog",
          href: "/shop",
          count: catalog.totalProductsOverall,
          active: false,
        },
      ],
    },
  ];

  const resolvedQuickIdeas = DEFAULT_PODIUM_CHIPS.map((def, idx) =>
    getContentValue(content, `podiums.search.chip_${idx + 1}`, def)
  );

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

      <section className="py-8 sm:py-10 container mx-auto px-4 sm:px-6 relative z-20 space-y-6">
        {/* ACRIO Smart Podium Search Bar */}
        <ShopSmartSearchBar
          onlyPodiums={true}
          whatsappNumber={settings?.whatsappNumber || "+917337222876"}
          customQuickIdeas={resolvedQuickIdeas}
          contentPrefix="podiums.search"
          placeholder="Search podiums by SKU, style, or describe what you need (e.g., 'LED podium with logo for hotel', 'wooden & acrylic school lectern')..."
        />

        {/* Editable Patented Designs & 3-Range Quick Guide */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-4">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-blue-50/60 border border-blue-100">
            <ShieldCheck className="w-5 h-5 text-[#0056b3] shrink-0 mt-0.5" />
            <div className="text-xs text-slate-700 leading-relaxed flex-1">
              <EditableText
                as="span"
                contentKey="podiums.highlight.patent_title"
                value={getContentValue(
                  content,
                  "podiums.highlight.patent_title",
                  "Patented & Copyright Protected Designs"
                )}
                hasCustomValue={hasContentOverride(
                  content,
                  "podiums.highlight.patent_title"
                )}
                label="Patented Designs Heading"
                className="font-extrabold text-slate-900 block mb-0.5"
              />
              <EditableText
                as="p"
                mode="multiline"
                contentKey="podiums.highlight.patent_desc"
                value={getContentValue(
                  content,
                  "podiums.highlight.patent_desc",
                  "Original Classic Concepts podium models with official patent, registered design, and copyright documents. Hover or tap the info icon on any podium card for details."
                )}
                hasCustomValue={hasContentOverride(
                  content,
                  "podiums.highlight.patent_desc"
                )}
                label="Patented Designs Description"
                className="text-xs text-slate-700 leading-relaxed"
              />
            </div>
          </div>

          <details className="group border-t border-slate-100 pt-3">
            <summary className="cursor-pointer list-none flex items-center justify-between text-xs font-bold text-[#0056b3] hover:text-blue-800 gap-2">
              <EditableText
                contentKey="podiums.guide.summary_title"
                value={getContentValue(
                  content,
                  "podiums.guide.summary_title",
                  "Compare Our 3 Podium Ranges (Essential vs Classic Signature vs Premium Stage & Digital)"
                )}
                hasCustomValue={hasContentOverride(
                  content,
                  "podiums.guide.summary_title"
                )}
                label="Podium Range Guide Heading"
              />
              <EditableText
                contentKey="podiums.guide.badge"
                value={getContentValue(
                  content,
                  "podiums.guide.badge",
                  "Quick Guide"
                )}
                hasCustomValue={hasContentOverride(
                  content,
                  "podiums.guide.badge"
                )}
                label="Quick Guide Badge"
                className="text-[11px] bg-blue-50 px-2.5 py-1 rounded-full group-open:bg-[#0056b3] group-open:text-white transition-colors shrink-0"
              />
            </summary>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <th className="p-2.5 font-bold">
                      <EditableText
                        contentKey="podiums.guide.col_1"
                        value={getContentValue(
                          content,
                          "podiums.guide.col_1",
                          "Range"
                        )}
                        hasCustomValue={hasContentOverride(
                          content,
                          "podiums.guide.col_1"
                        )}
                        label="Table Column 1"
                      />
                    </th>
                    <th className="p-2.5 font-bold">
                      <EditableText
                        contentKey="podiums.guide.col_2"
                        value={getContentValue(
                          content,
                          "podiums.guide.col_2",
                          "Best Used For"
                        )}
                        hasCustomValue={hasContentOverride(
                          content,
                          "podiums.guide.col_2"
                        )}
                        label="Table Column 2"
                      />
                    </th>
                    <th className="p-2.5 font-bold">
                      <EditableText
                        contentKey="podiums.guide.col_3"
                        value={getContentValue(
                          content,
                          "podiums.guide.col_3",
                          "Material & Build"
                        )}
                        hasCustomValue={hasContentOverride(
                          content,
                          "podiums.guide.col_3"
                        )}
                        label="Table Column 3"
                      />
                    </th>
                    <th className="p-2.5 font-bold">
                      <EditableText
                        contentKey="podiums.guide.col_4"
                        value={getContentValue(
                          content,
                          "podiums.guide.col_4",
                          "Mic, LED & Logo"
                        )}
                        hasCustomValue={hasContentOverride(
                          content,
                          "podiums.guide.col_4"
                        )}
                        label="Table Column 4"
                      />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr>
                    <td className="p-2.5 font-bold text-slate-900">
                      <EditableText
                        contentKey="podiums.guide.row1_name"
                        value={getContentValue(
                          content,
                          "podiums.guide.row1_name",
                          "Essential Range"
                        )}
                        hasCustomValue={hasContentOverride(
                          content,
                          "podiums.guide.row1_name"
                        )}
                        label="Row 1 Range Name"
                      />
                    </td>
                    <td className="p-2.5">
                      <EditableText
                        contentKey="podiums.guide.row1_use"
                        value={getContentValue(
                          content,
                          "podiums.guide.row1_use",
                          "Classrooms, training rooms, churches & daily office briefings"
                        )}
                        hasCustomValue={hasContentOverride(
                          content,
                          "podiums.guide.row1_use"
                        )}
                        label="Row 1 Best Used For"
                      />
                    </td>
                    <td className="p-2.5">
                      <EditableText
                        contentKey="podiums.guide.row1_build"
                        value={getContentValue(
                          content,
                          "podiums.guide.row1_build",
                          "Strong clear or frosted cast acrylic, lightweight & easy to move"
                        )}
                        hasCustomValue={hasContentOverride(
                          content,
                          "podiums.guide.row1_build"
                        )}
                        label="Row 1 Material & Build"
                      />
                    </td>
                    <td className="p-2.5">
                      <EditableText
                        contentKey="podiums.guide.row1_features"
                        value={getContentValue(
                          content,
                          "podiums.guide.row1_features",
                          "Front logo plate + optional mic hole"
                        )}
                        hasCustomValue={hasContentOverride(
                          content,
                          "podiums.guide.row1_features"
                        )}
                        label="Row 1 Mic, LED & Logo"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-[#0056b3]">
                      <EditableText
                        contentKey="podiums.guide.row2_name"
                        value={getContentValue(
                          content,
                          "podiums.guide.row2_name",
                          "Classic Signature Range"
                        )}
                        hasCustomValue={hasContentOverride(
                          content,
                          "podiums.guide.row2_name"
                        )}
                        label="Row 2 Range Name"
                      />
                    </td>
                    <td className="p-2.5">
                      <EditableText
                        contentKey="podiums.guide.row2_use"
                        value={getContentValue(
                          content,
                          "podiums.guide.row2_use",
                          "5-star hotels, banquet halls, auditoriums & corporate events"
                        )}
                        hasCustomValue={hasContentOverride(
                          content,
                          "podiums.guide.row2_use"
                        )}
                        label="Row 2 Best Used For"
                      />
                    </td>
                    <td className="p-2.5">
                      <EditableText
                        contentKey="podiums.guide.row2_build"
                        value={getContentValue(
                          content,
                          "podiums.guide.row2_build",
                          "Heavy 12mm to 18mm clear acrylic or Wood + Acrylic combinations"
                        )}
                        hasCustomValue={hasContentOverride(
                          content,
                          "podiums.guide.row2_build"
                        )}
                        label="Row 2 Material & Build"
                      />
                    </td>
                    <td className="p-2.5">
                      <EditableText
                        contentKey="podiums.guide.row2_features"
                        value={getContentValue(
                          content,
                          "podiums.guide.row2_features",
                          "Dual gooseneck mic mounts, inner shelf, warm LED & custom logo"
                        )}
                        hasCustomValue={hasContentOverride(
                          content,
                          "podiums.guide.row2_features"
                        )}
                        label="Row 2 Mic, LED & Logo"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-[#0c1a40]">
                      <EditableText
                        contentKey="podiums.guide.row3_name"
                        value={getContentValue(
                          content,
                          "podiums.guide.row3_name",
                          "Premium & Motorized / Digital"
                        )}
                        hasCustomValue={hasContentOverride(
                          content,
                          "podiums.guide.row3_name"
                        )}
                        label="Row 3 Range Name"
                      />
                    </td>
                    <td className="p-2.5">
                      <EditableText
                        contentKey="podiums.guide.row3_use"
                        value={getContentValue(
                          content,
                          "podiums.guide.row3_use",
                          "VIP stages, universities, government summits & large conventions"
                        )}
                        hasCustomValue={hasContentOverride(
                          content,
                          "podiums.guide.row3_use"
                        )}
                        label="Row 3 Best Used For"
                      />
                    </td>
                    <td className="p-2.5">
                      <EditableText
                        contentKey="podiums.guide.row3_build"
                        value={getContentValue(
                          content,
                          "podiums.guide.row3_build",
                          "Up to 25mm thick cast acrylic, motorized height adjust or touch screen"
                        )}
                        hasCustomValue={hasContentOverride(
                          content,
                          "podiums.guide.row3_build"
                        )}
                        label="Row 3 Material & Build"
                      />
                    </td>
                    <td className="p-2.5">
                      <EditableText
                        contentKey="podiums.guide.row3_features"
                        value={getContentValue(
                          content,
                          "podiums.guide.row3_features",
                          "Built-in AV/mic routing, LED glow base, lockable castors & crest"
                        )}
                        hasCustomValue={hasContentOverride(
                          content,
                          "podiums.guide.row3_features"
                        )}
                        label="Row 3 Mic, LED & Logo"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </details>
        </div>

        {/* Full-Width Podiums Grid with Slide-Over Filter Sheet */}
        <ProductGridWithSearch
          products={products}
          phone={settings?.whatsappNumber || "+917337222876"}
          initialQuery={searchQuery || ""}
          contextLabel={
            activeSubCategory
              ? activeSubCategory.name
              : activeCategory
                ? activeCategory.name
                : "All Podiums"
          }
          itemLabel="podiums"
          clearHref={subSlug || catSlug || searchQuery ? "/podiums" : undefined}
          clearText={
            subSlug || catSlug || searchQuery ? "View All Podiums" : undefined
          }
          quickPills={quickPills}
          filterGroups={filterGroups}
        />
      </section>
    </main>
  );
}
