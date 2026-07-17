import { prisma } from "@/lib/db";
import Image from "next/image";
import Link from "next/link";
import { Clients } from "@/components/home/Clients";
import { PageHeader } from "@/components/layout/PageHeader";
import { getYouTubeEmbedUrl } from "@/lib/youtube";

export const metadata = {
  title: "In the Press - Classic Concepts",
  description: "Read about Classic Concepts in the press and watch our media features.",
};

export default async function AboutPressPage() {
  const settings = await prisma.siteSetting.findUnique({ where: { id: "default" } });

  return (
    <main className="min-h-screen bg-[#fafbfc] flex flex-col">
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "About Us", href: "/about" },
          { label: "Press Release" }
        ]}
        title={
          <>
            In the <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Press</span>
          </>
        }
      />

      {/* Main Press Content */}
      <section className="py-20 relative z-20">
        <div className="container mx-auto px-6 max-w-5xl space-y-20">
          
          {/* YouTube Video Section */}
          <div className="space-y-8 text-center">
            <h2 className="text-3xl font-bold text-slate-800">Classic Concepts in Action</h2>
            <div className="w-full aspect-video rounded-2xl overflow-hidden shadow-xl border border-slate-200 bg-slate-900 mx-auto">
               <iframe 
                 width="100%" 
                 height="100%" 
                 src={getYouTubeEmbedUrl(settings?.pressVideoUrl || "https://www.youtube.com/embed/dQw4w9WgXcQ") || ''} 
                 title="Classic Concepts Press Video" 
                 frameBorder="0" 
                 allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                 allowFullScreen>
               </iframe>
            </div>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto">
              Watch our latest features and learn more about our commitment to quality acrylic manufacturing and innovative design solutions.
            </p>
          </div>

          {/* Newspaper Clippings Section */}
          <div className="space-y-12 pt-12 border-t border-slate-200">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-slate-800">Media Coverage</h2>
              <p className="text-slate-600 text-lg">
                We are proud to be recognized by leading publications for our excellence in the acrylic industry.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Press Clipping 1 */}
              <div className="group relative bg-white p-4 rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-slate-100">
                  <Image 
                    src={settings?.pressClipping1 || "/press-clipping-1.png"} 
                    alt="Press Feature 1" 
                    fill 
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              </div>

              {/* Press Clipping 2 */}
              <div className="group relative bg-white p-4 rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-slate-100">
                  <Image 
                    src={settings?.pressClipping2 || "/press-clipping-2.png"} 
                    alt="Press Feature 2" 
                    fill 
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Editorial Text Section */}
          <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-100 text-slate-700 text-lg leading-relaxed font-light space-y-6">
            <p>
              Classic Concepts is a leading acrylic manufacturer that specializes in creating high-quality, custom-made acrylic products for a wide range of industries. With years of experience in the industry, the company has established itself as a reliable partner for businesses looking for top-notch acrylic solutions.
            </p>
            <p>
              The company's manufacturing facility is equipped with state-of-the-art equipment and technology, allowing it to produce acrylic products of varying shapes, sizes, and colors. Whether you need acrylic displays, signage, point-of-sale displays, or any other custom-made acrylic product, Classic Concepts has the expertise and resources to meet your needs.
            </p>
            <p>
              One of the company's key strengths is its focus on quality. Each product is meticulously crafted to meet the highest standards, ensuring that they are durable, long-lasting, and visually stunning. The company's team of skilled artisans pays close attention to detail, ensuring that every product is made to perfection.
            </p>
            <p>
              Another factor that sets Classic Concepts apart is its commitment to customer satisfaction. The company takes a collaborative approach, working closely with clients to understand their specific needs and preferences. The team then creates custom solutions that meet these requirements, providing clients with products that are tailored to their unique needs.
            </p>
            <p>
              Whether you're looking for a one-of-a-kind display or a large-scale project, Classic Concepts is the ideal partner for your acrylic manufacturing needs. With its commitment to quality, customer satisfaction, and cutting-edge technology, the company is well-positioned to help your business succeed.
            </p>
          </div>

        </div>
      </section>

      {/* Reused Clients Section */}
      <Clients />
    </main>
  );
}
