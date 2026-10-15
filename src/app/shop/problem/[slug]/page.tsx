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
    const problemStatements = await prisma.problemStatement.findMany({
      select: { slug: true }
    });
    
    return problemStatements.map((problemStatement) => ({
      slug: problemStatement.slug,
    }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const problemStatement = await prisma.problemStatement.findUnique({
    where: { slug }
  });

  if (!problemStatement) return { title: "Problem Statement Not Found - Classic Concepts" };

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

export default async function ProblemStatementShopPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const problemStatement = await prisma.problemStatement.findUnique({
    where: { slug }
  });

  if (!problemStatement) {
    notFound();
  }

  const [products, allProblemStatements, totalProductsOverall, settings] = await Promise.all([
    prisma.product.findMany({
      where: {
        problemStatements: { some: { id: problemStatement.id } },
      },
      include: {
        images: { orderBy: { createdAt: 'asc' } },
        category: true,
      },
      orderBy: { name: 'asc' }
    }),
    prisma.problemStatement.findMany({
      orderBy: { name: 'asc' }
    }),
    prisma.product.count(),
    prisma.siteSetting.findUnique({ where: { id: "default" } }),
  ]);

  return (
    <main className="min-h-screen bg-[#fafbfc] flex flex-col">
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Shop", href: "/shop" },
          { label: "ProblemStatements", href: "/shop/c" },
          { label: problemStatement.name }
        ]}
        title={
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
            {problemStatement.name}
          </span>
        }
      />

      <section className="py-12 container mx-auto px-6 relative z-20 flex flex-col md:flex-row gap-8">
        
        {/* Sidebar Filters */}
        <aside className="w-full md:w-64 flex-shrink-0 space-y-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Filter size={18} className="text-[#0056b3]" />
              ProblemStatements
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
              {allProblemStatements.map(cat => {
                const isActive = cat.id === problemStatement.id;
                return (
                  <li key={cat.id}>
                    <Link href={`/shop/problem/${cat.slug}`} className={`${isActive ? "text-[#0056b3] font-bold" : "text-slate-600 hover:text-[#0056b3] font-medium"} text-sm flex items-center justify-between transition-colors`}>
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
            contextLabel={problemStatement.name}
            itemLabel="products"
            clearHref="/shop"
            clearText="Browse All Products"
          />
        </div>
      </section>
    </main>
  );
}
