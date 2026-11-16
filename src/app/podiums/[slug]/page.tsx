import { getFullCatalogIndex, getPublicSiteSettings } from "@/lib/public-data";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProductGridWithSearch } from "@/components/shop/ProductGridWithSearch";
import { ShopSmartSearchBar } from "@/components/ai/ShopSmartSearchBar";
import { EditableText } from "@/components/inline-edit/EditableText";
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

  const [catalog, settings] = await Promise.all([
    getFullCatalogIndex(),
    getPublicSiteSettings(),
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

  const quickPills = [
    {
      label: "All Podiums",
      href: "/podiums",
      count: allPodiumsCount,
      active: false,
    },
    ...allSubCategories.map((sub) => ({
      label: sub.name,
      href: `/podiums/${sub.slug}`,
      count: Math.max(sub._count.products, sub._count.multiProducts),
      active: sub.id === subCategory.id,
    })),
  ];

  const filterGroups = [
    {
      title: "Podium Sub-Categories",
      items: [
        {
          label: "All Podiums",
          href: "/podiums",
          count: allPodiumsCount,
          active: false,
        },
        ...allSubCategories.map((sub) => ({
          label: sub.name,
          href: `/podiums/${sub.slug}`,
          count: Math.max(sub._count.products, sub._count.multiProducts),
          active: sub.id === subCategory.id,
        })),
      ],
    },
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

      <section className="py-8 sm:py-10 container mx-auto px-4 sm:px-6 relative z-20 space-y-6">
        <ShopSmartSearchBar
          onlyPodiums={true}
          whatsappNumber={settings?.whatsappNumber || "+917337220568"}
          defaultCategoryHint={subCategory.name}
        />

        {/* Editable Sub-Category Overview Card */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-2xs border border-slate-200/80">
          <EditableText
            as="h2"
            entity={{
              model: "podiumSubCategory",
              id: subCategory.id,
              field: "name",
            }}
            value={subCategory.name}
            label={`Sub-Category Name — ${subCategory.name}`}
            className="text-base sm:text-lg font-bold text-slate-900 mb-1 block"
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
            className="text-xs sm:text-sm text-slate-600 leading-relaxed block"
          />
        </div>

        <ProductGridWithSearch
          products={products}
          phone={settings?.whatsappNumber || "+917337220568"}
          contextLabel={subCategory.name}
          itemLabel="podiums"
          clearHref="/podiums"
          clearText="View All Podiums"
          quickPills={quickPills}
          filterGroups={filterGroups}
        />
      </section>
    </main>
  );
}
