import { getFullCatalogIndex, getPublicSiteSettings } from "@/lib/public-data";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProductGridWithSearch } from "@/components/shop/ProductGridWithSearch";
import {
  getSiteContentMap,
  getContentValue,
  hasContentOverride,
} from "@/lib/site-content";
import { EditableText } from "@/components/inline-edit/EditableText";
import Link from "next/link";
import { Layers } from "lucide-react";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const catalog = await getFullCatalogIndex();
  const subCategory =
    catalog.podiumSubCategories.find((s) => s.slug === slug) || null;

  if (!subCategory)
    return { title: "Podium Sub-Category Not Found - Classic Concepts" };

  const title = `${subCategory.name} - Buy Premium Acrylic Podiums | Classic Concepts`;
  const description =
    subCategory.description ||
    `Explore our collection of ${subCategory.name.toLowerCase()} made Since 2008 by Classic Concepts, India's leading acrylic podium manufacturer.`;
  const mainImage = subCategory.imageUrl || "/logo.png";
  const canonicalUrl = `https://classicconcepts.in/podiums/${subCategory.slug}`;

  return {
    title,
    description,
    keywords: [
      subCategory.name,
      `${subCategory.name} India`,
      "Acrylic Podium",
      "Classic Concepts",
      "Acrylic Lectern Manufacturer",
    ],
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
          width: 1200,
          height: 630,
          alt: subCategory.name,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [mainImage],
    },
  };
}

export default async function PodiumSubCategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [catalog, settings, content] = await Promise.all([
    getFullCatalogIndex(),
    getPublicSiteSettings(),
    getSiteContentMap(),
  ]);

  const subCategory =
    catalog.podiumSubCategories.find((s) => s.slug === slug) || null;

  if (!subCategory) {
    notFound();
  }

  const allSubCategories = catalog.podiumSubCategories;
  const allPodiumsCount = catalog.allPodiumsCount;
  const products = catalog.products.filter(
    (p) => p.isPodium && p.podiumSubCategoryIds.includes(subCategory.id)
  );

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${subCategory.name} - Classic Concepts`,
    url: `https://classicconcepts.in/podiums/${subCategory.slug}`,
    description:
      subCategory.description ||
      `Browse ${subCategory.name} manufactured by Classic Concepts.`,
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
        name: "Podiums",
        item: "https://classicconcepts.in/podiums",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: subCategory.name,
        item: `https://classicconcepts.in/podiums/${subCategory.slug}`,
      },
    ],
  };

  const defaultDesc =
    subCategory.description ||
    `Explore our precision-engineered collection of ${subCategory.name.toLowerCase()} with custom branding, mic provisions, and pan-India delivery.`;

  return (
    <main className="min-h-screen bg-[#fafbfc] flex flex-col relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(collectionJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_right,rgba(227,24,55,0.03)_0%,rgba(255,223,0,0.02)_40%,rgba(59,130,246,0.02)_80%,transparent_100%)] pointer-events-none"></div>

      <PageHeader
        contentKeyPrefix={`podiums.sub.${subCategory.slug}`}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Podiums", href: "/podiums" },
          { label: subCategory.name },
        ]}
        title={
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
            {subCategory.name}
          </span>
        }
        description={defaultDesc}
      />

      <section className="py-12 container mx-auto px-6 relative z-20 flex flex-col md:flex-row gap-8">
        {/* Sidebar Filters */}
        <aside className="w-full md:w-64 flex-shrink-0 space-y-6">
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
                  className="text-slate-600 hover:text-[#0056b3] font-medium px-3 py-2 rounded-xl text-sm flex items-center justify-between transition-colors"
                >
                  <span>All Podiums</span>
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs">
                    {allPodiumsCount}
                  </span>
                </Link>
              </li>
              {allSubCategories.map((sub) => {
                const isActive = sub.id === subCategory.id;
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
        </aside>

        {/* Main Content */}
        <div className="flex-1 space-y-6">
          {/* Editable Sub-Category Overview Card */}
          <div className="bg-white rounded-2xl p-5 shadow-2xs border border-slate-200/80">
            <EditableText
              as="h2"
              entity={{
                model: "podiumSubCategory",
                id: subCategory.id,
                field: "name",
              }}
              value={subCategory.name}
              label={`Sub-Category Name — ${subCategory.name}`}
              className="text-lg font-bold text-slate-900 mb-1 block"
            />
            <EditableText
              as="p"
              mode="multiline"
              entity={{
                model: "podiumSubCategory",
                id: subCategory.id,
                field: "description",
              }}
              value={defaultDesc}
              label={`Sub-Category Description — ${subCategory.name}`}
              className="text-sm text-slate-600 leading-relaxed block"
            />
          </div>

          {/* Quick Sub-Category Pills */}
          {allSubCategories.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/podiums"
                className="px-4 py-2 rounded-full text-xs font-bold bg-white text-slate-600 border border-slate-200 hover:border-[#0056b3] hover:text-[#0056b3] transition-all"
              >
                All Podiums
              </Link>
              {allSubCategories.map((sub) => (
                <Link
                  key={sub.id}
                  href={`/podiums/${sub.slug}`}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                    sub.id === subCategory.id
                      ? "bg-[#0056b3] text-white shadow-sm"
                      : "bg-white text-slate-600 border border-slate-200 hover:border-[#0056b3] hover:text-[#0056b3]"
                  }`}
                >
                  {sub.name}
                </Link>
              ))}
            </div>
          )}

          <ProductGridWithSearch
            products={products}
            phone={settings?.whatsappNumber || "+917337222876"}
            contextLabel={subCategory.name}
            itemLabel="podiums"
            clearHref="/podiums"
            clearText="View All Podiums"
          />
        </div>
      </section>
    </main>
  );
}
