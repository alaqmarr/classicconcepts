import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProductGridWithSearch } from "@/components/shop/ProductGridWithSearch";
import Link from "next/link";
import { Filter } from "lucide-react";
import { notFound } from "next/navigation";

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const categories = await prisma.category.findMany({
      select: { slug: true }
    });
    
    return categories.map((category) => ({
      slug: category.slug,
    }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = await prisma.category.findUnique({
    where: { slug }
  });

  if (!category) return { title: "Category Not Found - Classic Concepts" };

  const title = `${category.name} - Buy Premium Acrylic ${category.name} | Classic Concepts`;
  const description = `Browse our collection of premium acrylic ${category.name.toLowerCase()} manufactured by Classic Concepts. Durable, elegant finish, and custom designs at competitive prices.`;
  const mainImage = category.imageUrl || "/short-logo.png";
  const canonicalUrl = `https://classicconcepts.in/shop/c/${category.slug}`;

  return {
    title,
    description,
    keywords: [category.name, `Acrylic ${category.name}`, "Classic Concepts", "Acrylic Manufacturer India"],
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
          alt: category.name,
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

export default async function CategoryShopPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const category = await prisma.category.findUnique({
    where: { slug }
  });

  if (!category) {
    notFound();
  }

  const [products, allCategories, totalProductsOverall, settings] = await Promise.all([
    prisma.product.findMany({
      where: {
        categoryId: category.id,
      },
      include: {
        images: { orderBy: { createdAt: 'asc' } },
        category: true,
      },
      orderBy: { name: 'asc' }
    }),
    prisma.category.findMany({
      orderBy: { name: 'asc' }
    }),
    prisma.product.count(),
    prisma.siteSetting.findUnique({ where: { id: "default" } }),
  ]);

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${category.name} - Classic Concepts`,
    url: `https://classicconcepts.in/shop/c/${category.slug}`,
    description: `Browse premium acrylic ${category.name.toLowerCase()} by Classic Concepts.`,
  };

  return (
    <main className="min-h-screen bg-[#fafbfc] flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Shop", href: "/shop" },
          { label: "Categories", href: "/shop/c" },
          { label: category.name }
        ]}
        title={
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
            {category.name}
          </span>
        }
      />

      <section className="py-12 container mx-auto px-6 relative z-20 flex flex-col md:flex-row gap-8">
        
        {/* Sidebar Filters */}
        <aside className="w-full md:w-64 flex-shrink-0 space-y-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Filter size={18} className="text-[#0056b3]" />
              Categories
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
              {allCategories.map(cat => {
                const isActive = cat.id === category.id;
                return (
                  <li key={cat.id}>
                    <Link href={`/shop/c/${cat.slug}`} className={`${isActive ? "text-[#0056b3] font-bold" : "text-slate-600 hover:text-[#0056b3] font-medium"} text-sm flex items-center justify-between transition-colors`}>
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
            contextLabel={category.name}
            itemLabel="products"
            clearHref="/shop"
            clearText="Browse All Products"
          />
        </div>
      </section>
    </main>
  );
}
