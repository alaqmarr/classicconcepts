import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProductCard } from "@/components/shop/ProductCard";
import Link from "next/link";
import { Filter, Layers, Search } from "lucide-react";
import { notFound } from "next/navigation";

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  const subCategories = await prisma.podiumSubCategory.findMany({
    select: { slug: true },
  });

  return subCategories.map((sub) => ({
    slug: sub.slug,
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const subCategory = await prisma.podiumSubCategory.findUnique({
    where: { slug },
  });

  if (!subCategory) return { title: "Podium Sub-Category Not Found - Classic Concepts" };

  const title = `${subCategory.name} - Buy Premium Acrylic Podiums | Classic Concepts`;
  const description =
    subCategory.description ||
    `Explore our premium collection of ${subCategory.name.toLowerCase()} crafted by Classic Concepts — India's leading acrylic podium manufacturer.`;
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
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { slug } = await params;
  const resolvedParams = await searchParams;
  const searchQuery = typeof resolvedParams.q === "string" ? resolvedParams.q : undefined;

  const subCategory = await prisma.podiumSubCategory.findUnique({
    where: { slug },
  });

  if (!subCategory) {
    notFound();
  }

  const [allSubCategories, allPodiumsCount, products, settings] = await Promise.all([
    prisma.podiumSubCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        _count: {
          select: { products: true },
        },
      },
    }),
    prisma.product.count({ where: { isPodium: true } }),
    prisma.product.findMany({
      where: {
        isPodium: true,
        podiumSubCategoryId: subCategory.id,
        ...(searchQuery ? { name: { contains: searchQuery } } : {}),
      },
      include: {
        images: { orderBy: { createdAt: "asc" } },
        category: true,
        podiumSubCategory: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.siteSetting.findUnique({ where: { id: "default" } }),
  ]);

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

  return (
    <main className="min-h-screen bg-[#fafbfc] flex flex-col relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Subtle Radial Gradient Pattern */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_right,rgba(227,24,55,0.03)_0%,rgba(255,223,0,0.02)_40%,rgba(59,130,246,0.02)_80%,transparent_100%)] pointer-events-none"></div>

      <PageHeader
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
      />

      <section className="py-12 container mx-auto px-6 relative z-20 flex flex-col md:flex-row gap-8">
        {/* Sidebar Filters */}
        <aside className="w-full md:w-64 flex-shrink-0 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Layers size={18} className="text-[#0056b3]" />
              Podium Sub-Categories
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
                      } px-3 py-2 rounded-xl text-sm flex items-center justify-between transition-colors`}
                    >
                      <span>{sub.name}</span>
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs">
                        {sub._count.products}
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

          {/* Top Bar (Search) */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-slate-600 text-sm font-medium">
              Showing <span className="font-bold text-slate-900">{products.length}</span> podiums in{" "}
              <span className="font-bold text-[#0056b3]">{subCategory.name}</span> (Sorted A–Z)
            </p>

            <form className="relative w-full sm:w-72" method="GET" action={`/podiums/${subCategory.slug}`}>
              <input
                type="text"
                name="q"
                defaultValue={searchQuery}
                placeholder={`Search in ${subCategory.name}...`}
                className="w-full bg-slate-50 border border-slate-200 rounded-full py-2 pl-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:border-transparent transition-all"
              />
              <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0056b3]">
                <Search size={18} />
              </button>
            </form>
          </div>

          {/* Product Grid */}
          {products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
              <h3 className="text-xl font-bold text-slate-800 mb-2">No podiums found</h3>
              <p className="text-slate-500 max-w-md mx-auto">
                We couldn&apos;t find any podiums in {subCategory.name} matching your criteria.
              </p>
              <Link
                href="/podiums"
                className="inline-block mt-6 bg-[#0056b3] text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-800 transition-colors"
              >
                View All Podiums
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
