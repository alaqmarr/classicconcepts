import { prisma } from "@/lib/db";
import { PRODUCT_CARD_SELECT } from "@/lib/product-select";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProductGridWithSearch } from "@/components/shop/ProductGridWithSearch";
import Link from "next/link";
import { Filter } from "lucide-react";
import { notFound } from "next/navigation";

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const industries = await prisma.industry.findMany({
      select: { slug: true }
    });
    
    return industries.map((industry) => ({
      slug: industry.slug,
    }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const industry = await prisma.industry.findUnique({
    where: { slug }
  });

  if (!industry) return { title: "Industry Not Found - Classic Concepts" };

  const title = `${industry.name} Acrylic Solutions - Shop at Classic Concepts`;
  const description = `Browse our collection of premium acrylic products and podiums for ${industry.name.toLowerCase()} by Classic Concepts.`;
  const mainImage = industry.imageUrl || "/short-logo.png";
  const canonicalUrl = `https://classicconcepts.in/shop/industry/${industry.slug}`;

  return {
    title,
    description,
    keywords: [industry.name, `Acrylic for ${industry.name}`, "Classic Concepts"],
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
        }
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [mainImage],
    }
  };
}

export default async function IndustryShopPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const industry = await prisma.industry.findUnique({
    where: { slug }
  });

  if (!industry) {
    notFound();
  }

  const [products, allIndustries, totalProductsOverall, settings] = await Promise.all([
    prisma.product.findMany({
      where: {
        industries: { some: { id: industry.id } },
      },
      select: PRODUCT_CARD_SELECT,
      orderBy: { name: 'asc' }
    }),
    prisma.industry.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true },
    }),
    prisma.product.count(),
    prisma.siteSetting.findUnique({
      where: { id: "default" },
      select: { whatsappNumber: true },
    }),
  ]);

  return (
    <main className="min-h-screen bg-[#fafbfc] flex flex-col">
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Shop", href: "/shop" },
          { label: "Industries", href: "/shop/c" },
          { label: industry.name }
        ]}
        title={
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
            {industry.name}
          </span>
        }
      />

      <section className="py-12 container mx-auto px-6 relative z-20 flex flex-col md:flex-row gap-8">
        
        {/* Sidebar Filters */}
        <aside className="w-full md:w-64 flex-shrink-0 space-y-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Filter size={18} className="text-[#0056b3]" />
              Industries
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/shop" className="text-slate-600 hover:text-[#0056b3] font-medium text-sm flex items-center justify-between group transition-colors">
                  <span>All Products</span>
                  <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-xs group-hover:bg-blue-50 group-hover:text-[#0056b3] transition-colors">
                    {totalProductsOverall}
                  </span>
                </Link>
              </li>
              {allIndustries.map(cat => {
                const isActive = cat.id === industry.id;
                return (
                  <li key={cat.id}>
                    <Link href={`/shop/industry/${cat.slug}`} className={`${isActive ? "text-[#0056b3] font-bold" : "text-slate-600 hover:text-[#0056b3] font-medium"} text-sm flex items-center justify-between transition-colors`}>
                      <span>{cat.name}</span>
                      {isActive && (
                        <span className="bg-blue-50 text-[#0056b3] px-2 py-0.5 rounded-full text-xs">
                          {products.length}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1">
          <ProductGridWithSearch
            products={products}
            phone={settings?.whatsappNumber || "+917337222876"}
            contextLabel={industry.name}
            itemLabel="products"
            clearHref="/shop"
            clearText="Browse All Products"
          />
        </div>
      </section>
    </main>
  );
}
