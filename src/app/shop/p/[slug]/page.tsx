import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/layout/PageHeader";
import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, CheckCircle2, Package, Tag, ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { InteractiveProductView } from "./InteractiveProductView";
import { getYouTubeEmbedUrl } from "@/lib/youtube";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug },
    include: { category: true }
  });

  if (!product) return { title: "Product Not Found - Classic Concepts" };

  return {
    title: `${product.name} | ${product.category.name} - Classic Concepts`,
    description: product.description || `Buy ${product.name} from Classic Concepts.`,
  };
}

export default async function ProductDetailPage({
  params
}: {
  params: { slug: string }
}) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      category: true,
      images: { orderBy: { createdAt: 'asc' } },
      features: { orderBy: { createdAt: 'asc' } },
      specifications: { orderBy: { createdAt: 'asc' } },
      variants: { orderBy: { createdAt: 'asc' } },
    }
  });

  const settings = await prisma.siteSetting.findUnique({ where: { id: "default" } });

  if (!product) {
    notFound();
  }

  const dimensions = product.specifications.filter(s => s.type === "dimension");
  const standardSpecs = product.specifications.filter(s => s.type !== "dimension");

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#fafbfc] to-[#f0f4ff] flex flex-col pb-24 relative">
      {/* Soft Radial Blush Behind Product */}
      <div className="absolute top-[10%] left-[50%] -translate-x-1/2 w-[80%] max-w-[800px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(227,24,55,0.04)_0%,rgba(255,223,0,0.03)_40%,rgba(59,130,246,0.03)_70%,transparent_100%)] pointer-events-none z-0"></div>

      <div className="bg-slate-900 py-4 border-b border-white/10 relative z-10">
        <div className="container mx-auto px-6">
          <div className="flex items-center text-sm font-medium text-slate-300">
            <Link href="/shop" className="hover:text-white transition-colors flex items-center gap-2">
              <ArrowLeft size={16} /> Back to Shop
            </Link>
          </div>
        </div>
      </div>

      <section className="container mx-auto px-6 pt-12 pb-16">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <InteractiveProductView 
            product={product} 
            phone={settings?.phone1 || "+919876543210"} 
          />
        </div>
      </section>

      {/* Product Details Tabs (Simplified as stacked sections for now, can be actual tabs) */}
      <section className="container mx-auto px-6 space-y-12">
        
        {/* Description & Features */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {product.descriptionHtml && (
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                  <Tag className="text-[#0056b3]" /> Description
                </h2>
                <div 
                  className="prose prose-slate max-w-none text-slate-600"
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

          <div className="space-y-8">
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
                  className="prose prose-sm prose-amber max-w-none text-amber-800"
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
