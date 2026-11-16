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
  const problemStatement =
    catalog.problemStatements.find((ps) => ps.slug === slug) || null;

  if (!problemStatement)
    return { title: "Problem Statement Not Found - Classic Concepts" };

  const title = `${problemStatement.name} - Acrylic Solutions | Classic Concepts`;
  const description = `Browse our collection of premium acrylic ${problemStatement.name.toLowerCase()} solutions by Classic Concepts.`;
  const mainImage = problemStatement.imageUrl || "/short-logo.png";
  const canonicalUrl = `https://classicconcepts.in/shop/problem/${problemStatement.slug}`;

  return {
    title,
    description,
    keywords: [problemStatement.name, "Classic Concepts", "Acrylic Solutions"],
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
          alt: problemStatement.name,
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

export default async function ProblemStatementShopPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [catalog, settings] = await Promise.all([
    getFullCatalogIndex(),
    getPublicSiteSettings(),
  ]);

  const problemStatement =
    catalog.problemStatements.find((ps) => ps.slug === slug) || null;

  if (!problemStatement) {
    notFound();
  }

  const products = catalog.products.filter((p) =>
    p.problemStatementIds.includes(problemStatement.id)
  );
  const allProblemStatements = catalog.problemStatements;
  const totalProductsOverall = catalog.totalProductsOverall;
  const categories = catalog.categories.filter((c) => c._count.products > 0);

  const quickPills = [
    {
      label: "All Products",
      href: "/shop",
      count: totalProductsOverall,
      active: false,
    },
    ...allProblemStatements.map((ps) => ({
      label: ps.name,
      href: `/shop/problem/${ps.slug}`,
      active: ps.id === problemStatement.id,
    })),
  ];

  const filterGroups = [
    {
      title: "Problem Statements",
      items: allProblemStatements.map((ps) => ({
        label: ps.name,
        href: `/shop/problem/${ps.slug}`,
        active: ps.id === problemStatement.id,
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

  return (
    <main className="min-h-screen bg-[#fafbfc] flex flex-col">
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Shop", href: "/shop" },
          { label: "Problem Statements", href: "/shop/problem" },
          { label: problemStatement.name },
        ]}
        title={
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
            {problemStatement.name}
          </span>
        }
      />

      <section className="py-8 sm:py-10 container mx-auto px-4 sm:px-6 relative z-20 space-y-6">
        <ShopSmartSearchBar
          onlyPodiums={false}
          whatsappNumber={settings?.whatsappNumber || "+917337220568"}
          defaultCategoryHint={problemStatement.name}
        />

        <ProductGridWithSearch
          products={products}
          phone={settings?.whatsappNumber || "+917337220568"}
          contextLabel={problemStatement.name}
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
