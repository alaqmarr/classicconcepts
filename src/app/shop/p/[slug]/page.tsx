import { prisma } from "@/lib/db";
import Link from "next/link";
import { CheckCircle2, Tag, ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { InteractiveProductView } from "./InteractiveProductView";
import { getYouTubeEmbedUrl } from "@/lib/youtube";

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  const products = await prisma.product.findMany({
    select: { slug: true }
  });
  
  return products.map((product) => ({
    slug: product.slug,
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug },
    include: { 
      category: true,
      podiumSubCategory: true,
      images: true 
    }
  });

  if (!product) return { title: "Product Not Found - Classic Concepts" };

  const subCatText = product.podiumSubCategory ? ` | ${product.podiumSubCategory.name}` : "";
  const title = `${product.name}${subCatText} | ${product.category.name} - Classic Concepts`;
  const description =
    product.description ||
    `Buy ${product.name} (${product.category.name}) directly from Classic Concepts — India's leading manufacturer of premium acrylic podiums, lecterns, and custom acrylic products.`;
  const mainImage = product.images?.find((img) => img.isMain)?.url || product.images?.[0]?.url || "/short-logo.png";
  const canonicalUrl = `https://classicconcepts.in/shop/p/${product.slug}`;

  return {
    title,
    description,
    keywords: [
      product.name,
      product.sku || "",
      product.category.name,
      product.podiumSubCategory?.name || "",
      product.isPodium ? "Acrylic Podium" : "Acrylic Products",
      "Classic Concepts",
      "Acrylic Lectern India",
      "Acrylic Manufacturer",
    ].filter(Boolean),
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
          alt: product.name,
        }
      ],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [mainImage],
    }
  };
}

export default async function ProductDetailPage({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      category: true,
      podiumSubCategory: true,
      images: { orderBy: { createdAt: 'asc' } },
      features: { orderBy: { createdAt: 'asc' } },
      specifications: { orderBy: { createdAt: 'asc' } },
      variants: {
        include: { images: true },
        orderBy: { createdAt: 'asc' }
      },
    }
  });

  const settings = await prisma.siteSetting.findUnique({ where: { id: "default" } });

  if (!product) {
    notFound();
  }

  const dimensions = product.specifications.filter(s => s.type === "dimension");
  const standardSpecs = product.specifications.filter(s => s.type !== "dimension");
  const mainImage = product.images?.find((img) => img.isMain)?.url || product.images?.[0]?.url || "https://classicconcepts.in/logo.png";
  const effectivePrice = product.discountPrice || product.basePrice;

  // Rich Schema.org Product + BreadcrumbList JSON-LD for SEO
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.images.map((img) => img.url),
    description:
      product.description ||
      `${product.name} manufactured by Classic Concepts (${product.category.name}).`,
    sku: product.sku || product.slug,
    brand: {
      "@type": "Brand",
      name: "Classic Concepts",
    },
    category: product.podiumSubCategory
      ? `${product.category.name} > ${product.podiumSubCategory.name}`
      : product.category.name,
    ...(effectivePrice
      ? {
          offers: {
            "@type": "Offer",
            url: `https://classicconcepts.in/shop/p/${product.slug}`,
            priceCurrency: "INR",
            price: effectivePrice,
            availability:
              product.stockStatus?.toLowerCase().includes("out")
                ? "https://schema.org/OutOfStock"
                : "https://schema.org/InStock",
            seller: {
              "@type": "Organization",
              name: "Classic Concepts",
            },
          },
        }
      : {}),
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
        name: product.isPodium ? "Podiums" : "Shop",
        item: product.isPodium
          ? "https://classicconcepts.in/podiums"
          : "https://classicconcepts.in/shop",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: product.category.name,
        item: `https://classicconcepts.in/shop/c/${product.category.slug}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: product.name,
        item: `https://classicconcepts.in/shop/p/${product.slug}`,
      },
    ],
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#fafbfc] to-[#f0f4ff] flex flex-col pb-24 relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Soft Radial Blush Behind Product */}
      <div className="absolute top-[10%] left-[50%] -translate-x-1/2 w-[80%] max-w-[800px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(227,24,55,0.04)_0%,rgba(255,223,0,0.03)_40%,rgba(59,130,246,0.03)_70%,transparent_100%)] pointer-events-none z-0"></div>

      <div className="bg-slate-900 py-4 border-b border-white/10 relative z-10">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between text-sm font-medium text-slate-300">
            <Link
              href={product.isPodium ? "/podiums" : "/shop"}
              className="hover:text-white transition-colors flex items-center gap-2"
            >
              <ArrowLeft size={16} /> Back to {product.isPodium ? "Podiums" : "Shop"}
            </Link>
            {product.podiumSubCategory && (
              <Link
                href={`/podiums?sub=${product.podiumSubCategory.slug}`}
                className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-bold hover:bg-blue-500/30 transition-colors"
              >
                {product.podiumSubCategory.name}
              </Link>
            )}
          </div>
        </div>
      </div>

      <section className="container mx-auto px-6 pt-12 pb-16">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <InteractiveProductView 
            product={product} 
            phone={settings?.whatsappNumber || "+917337222876"} 
          />
        </div>
      </section>

      {/* Product Details Tabs */}
      <section className="container mx-auto px-6 space-y-12">
        
        {/* Description & Features */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8 min-w-0">
            {product.descriptionHtml && (
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                  <Tag className="text-[#0056b3]" /> Description
                </h2>
                <div 
                  className="prose prose-slate max-w-none text-slate-600 break-words"
                  dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
                />
              </div>
            )}
            
            {product.features.length > 0 && (
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                  <CheckCircle2 className="text-[#0056b3]" /> Key Features
                </h2>
                <ul className="space-y-4">
                  {product.features.map(feature => (
                    <li key={feature.id} className="flex items-start gap-3">
                      <CheckCircle2 size={20} className="text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">{feature.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="space-y-8 min-w-0">
            {/* Specifications */}
            {(standardSpecs.length > 0 || dimensions.length > 0) && (
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
                <h2 className="text-xl font-bold text-slate-900 mb-6">Specifications</h2>
                
                {dimensions.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Dimensions</h3>
                    <div className="space-y-3">
                      {dimensions.map(dim => (
                        <div key={dim.id} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                          <span className="text-slate-600 font-medium">{dim.name}</span>
                          <span className="text-slate-900 font-bold text-right">{dim.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {standardSpecs.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">General Specs</h3>
                    <div className="space-y-3">
                      {standardSpecs.map(spec => (
                        <div key={spec.id} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                          <span className="text-slate-600 font-medium">{spec.name}</span>
                          <span className="text-slate-900 font-bold text-right">{spec.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Important Note */}
            {product.importantNoteHtml && (
              <div className="bg-amber-50 rounded-3xl p-8 shadow-sm border border-amber-200">
                <h2 className="text-xl font-bold text-amber-900 mb-4">Important Note</h2>
                <div 
                  className="prose prose-sm prose-amber max-w-none text-amber-800 break-words"
                  dangerouslySetInnerHTML={{ __html: product.importantNoteHtml }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Video Embed */}
        {product.videoUrl && (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Product Video</h2>
            <div className="w-full aspect-video rounded-2xl overflow-hidden shadow-lg border border-slate-100 bg-slate-900 mx-auto max-w-4xl">
               <iframe 
                 width="100%" 
                 height="100%" 
                 src={getYouTubeEmbedUrl(product.videoUrl) || ''} 
                 title={`${product.name} Video`} 
                 frameBorder="0" 
                 allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                 allowFullScreen>
               </iframe>
            </div>
          </div>
        )}

      </section>
    </main>
  );
}
