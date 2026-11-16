import { getFullCatalogIndex, getPublicSiteSettings } from "@/lib/public-data";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProductGridWithSearch } from "@/components/shop/ProductGridWithSearch";
import { ShopSmartSearchBar } from "@/components/ai/ShopSmartSearchBar";
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
  const industry = catalog.industries.find((i) => i.slug === slug) || null;

  if (!industry) return { title: "Industry Not Found - Classic Concepts" };

  const title = `${industry.name} Acrylic Solutions - Shop at Classic Concepts`;
  const description = `Browse our collection of premium acrylic products and podiums for ${industry.name.toLowerCase()} by Classic Concepts.`;
  const mainImage = industry.imageUrl || "/short-logo.png";
  const canonicalUrl = `https://classicconcepts.in/shop/industry/${industry.slug}`;

  return {
    title,
    description,
    keywords: [
      industry.name,
      `Acrylic for ${industry.name}`,
      "Classic Concepts",
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
          width: 800,
          height: 800,
          alt: industry.name,
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

export default async function IndustryShopPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [catalog, settings] = await Promise.all([
    getFullCatalogIndex(),
    getPublicSiteSettings(),
  ]);

  const industry = catalog.industries.find((i) => i.slug === slug) || null;

  if (!industry) {
    notFound();
  }

  const products = catalog.products.filter((p) =>
    p.industryIds.includes(industry.id)
  );
  const allIndustries = catalog.industries;
  const totalProductsOverall = catalog.totalProductsOverall;
  const categories = catalog.categories.filter((c) => c._count.products > 0);

  const quickPills = [
    {
      label: "All Products",
      href: "/shop",
      count: totalProductsOverall,
      active: false,
    },
    ...allIndustries.map((ind) => ({
      label: ind.name,
      href: `/shop/industry/${ind.slug}`,
      active: ind.id === industry.id,
    })),
  ];

  const filterGroups = [
    {
      title: "Industries",
      items: allIndustries.map((ind) => ({
        label: ind.name,
        href: `/shop/industry/${ind.slug}`,
        active: ind.id === industry.id,
      })),
    },
    {
      title: "Product Categories",
      items: [
        {
          label: "All Products",
          href: "/shop",
          count: totalProductsOverall,
          active: false,
        },
        ...categories.map((cat) => ({
          label: cat.name,
          href: `/shop/c/${cat.slug}`,
          count: cat._count.products,
          active: false,
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
  ];

  return (
    <main className="min-h-screen bg-[#fafbfc] flex flex-col">
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Shop", href: "/shop" },
          { label: "Industries", href: "/shop/industry" },
          { label: industry.name },
        ]}
        title={
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
            {industry.name}
          </span>
        }
      />

      <section className="py-8 sm:py-10 container mx-auto px-4 sm:px-6 relative z-20 space-y-6">
        <ShopSmartSearchBar
          onlyPodiums={false}
          whatsappNumber={settings?.whatsappNumber || "+917337220568"}
          defaultCategoryHint={industry.name}
        />

        <ProductGridWithSearch
          products={products}
          phone={settings?.whatsappNumber || "+917337220568"}
          contextLabel={industry.name}
          itemLabel="products"
          clearHref="/shop"
          clearText="Browse All Products"
          quickPills={quickPills}
          filterGroups={filterGroups}
        />
      </section>
    </main>
  );
}
