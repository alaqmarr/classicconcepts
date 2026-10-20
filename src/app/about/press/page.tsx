export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/db";
import Image from "next/image";
import { Clients } from "@/components/home/Clients";
import { PageHeader } from "@/components/layout/PageHeader";
import { getYouTubeEmbedUrl } from "@/lib/youtube";
import { Newspaper, ExternalLink, Calendar, BookOpen } from "lucide-react";

export const metadata = {
  title: "In the Press & Newsroom - Classic Concepts",
  description: "Read about Classic Concepts in the press, newspaper clippings, newsroom articles, and watch our media features.",
};

export default async function AboutPressPage() {
  const [settings, pressArticles] = await Promise.all([
    prisma.siteSetting.findUnique({ where: { id: "default" } }),
    prisma.pressArticle.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  const newspaperItems = pressArticles.filter((a) => a.category === "Newspaper");
  const newsroomItems = pressArticles.filter((a) => a.category === "Newsroom");

  return (
    <main className="min-h-screen bg-[#fafbfc] flex flex-col">
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "About Us", href: "/about" },
          { label: "Press & Newsroom" }
        ]}
        title={
          <>
            In the <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Press &amp; Newsroom</span>
          </>
        }
      />

      {/* Main Press Content */}
      <section className="py-20 relative z-20">
        <div className="container mx-auto px-6 w-full space-y-20">
          
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
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 text-[#0056b3] text-xs font-bold uppercase tracking-wider">
                <Newspaper size={15} />
                Print &amp; Media Coverage
              </div>
              <h2 className="text-3xl font-bold text-slate-800">Newspaper Clippings &amp; Media Coverage</h2>
              <p className="text-slate-600 text-lg">
                We are proud to be recognized by leading publications for our excellence in the acrylic industry.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Dynamic Newspaper Clippings from PressArticle */}
              {newspaperItems.map((item) => (
                <div
                  key={item.id}
                  className="group bg-white rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden flex flex-col"
                >
                  {item.imageUrl && (
                    <a
                      href={item.externalUrl || item.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative aspect-[4/3] w-full bg-slate-100 overflow-hidden block border-b border-slate-100"
                    >
                      <Image
                        src={item.imageUrl}
                        alt={item.title}
                        fill
                        unoptimized
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </a>
                  )}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {item.publication && (
                          <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0056b3] text-xs font-bold">
                            {item.publication}
                          </span>
                        )}
                        {item.date && (
                          <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                            <Calendar size={12} />
                            {item.date}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 group-hover:text-[#0056b3] transition-colors">
                        {item.title}
                      </h3>
                      {item.summary && (
                        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                          {item.summary}
                        </p>
                      )}
                    </div>

                    {(item.externalUrl || item.imageUrl) && (
                      <div className="pt-3 border-t border-slate-100">
                        <a
                          href={item.externalUrl || item.imageUrl || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0056b3] hover:underline"
                        >
                          <span>{item.externalUrl ? "Read Full Coverage" : "View Full Clipping"}</span>
                          <ExternalLink size={13} />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Legacy Press Clipping 1 & 2 from SiteSetting */}
              {(settings?.pressClipping1 || newspaperItems.length === 0) && (
                <div className="group relative bg-white p-4 rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-slate-100">
                    <Image 
                      src={settings?.pressClipping1 || "/press-clipping-1.png"} 
                      alt="Press Feature 1" 
                      fill 
                      unoptimized
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                </div>
              )}

              {(settings?.pressClipping2 || newspaperItems.length === 0) && (
                <div className="group relative bg-white p-4 rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-slate-100">
                    <Image 
                      src={settings?.pressClipping2 || "/press-clipping-2.png"} 
                      alt="Press Feature 2" 
                      fill 
                      unoptimized
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Newsroom Articles Section */}
          {newsroomItems.length > 0 && (
            <div className="space-y-12 pt-12 border-t border-slate-200">
              <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider">
                  <BookOpen size={15} />
                  Newsroom &amp; Announcements
                </div>
                <h2 className="text-3xl font-bold text-slate-800">Newsroom Articles</h2>
                <p className="text-slate-600 text-lg">
                  Latest press releases, company milestones, and industry insights from Classic Concepts.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {newsroomItems.map((article) => (
                  <article
                    key={article.id}
                    className="group bg-white rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col"
                  >
                    {article.imageUrl && (
                      <div className="relative aspect-[16/10] w-full bg-slate-100 overflow-hidden border-b border-slate-100">
                        <Image
                          src={article.imageUrl}
                          alt={article.title}
                          fill
                          unoptimized
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    )}
                    <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2.5">
                          <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold">
                            {article.publication || "Newsroom"}
                          </span>
                          {article.date && (
                            <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                              <Calendar size={12} />
                              {article.date}
                            </span>
                          )}
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 group-hover:text-[#0056b3] transition-colors leading-snug">
                          {article.title}
                        </h3>
                        {article.summary && (
                          <p className="text-sm text-slate-600 mt-3 leading-relaxed whitespace-pre-line">
                            {article.summary}
                          </p>
                        )}
                      </div>

                      {article.externalUrl && (
                        <div className="pt-4 border-t border-slate-100">
                          <a
                            href={article.externalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0056b3] hover:underline"
                          >
                            <span>Read Full Article</span>
                            <ExternalLink size={13} />
                          </a>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {/* Editorial Text Section */}
          <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-100 text-slate-700 text-lg leading-relaxed font-light space-y-6">
            <p>
              Classic Concepts is a leading acrylic manufacturer that specializes in creating high-quality, custom-made acrylic products for a wide range of industries. With years of experience in the industry, the company has established itself as a reliable partner for businesses looking for top-notch acrylic solutions.
            </p>
            <p>
              The company&apos;s manufacturing facility is equipped with state-of-the-art equipment and technology, allowing it to produce acrylic products of varying shapes, sizes, and colors. Whether you need acrylic displays, signage, point-of-sale displays, or any other custom-made acrylic product, Classic Concepts has the expertise and resources to meet your needs.
            </p>
            <p>
              One of the company&apos;s key strengths is its focus on quality. Each product is meticulously crafted to meet the highest standards, ensuring that they are durable, long-lasting, and visually stunning. The company&apos;s team of skilled artisans pays close attention to detail, ensuring that every product is made to perfection.
            </p>
            <p>
              Another factor that sets Classic Concepts apart is its commitment to customer satisfaction. The company takes a collaborative approach, working closely with clients to understand their specific needs and preferences. The team then creates custom solutions that meet these requirements, providing clients with products that are tailored to their unique needs.
            </p>
            <p>
              Whether you&apos;re looking for a one-of-a-kind display or a large-scale project, Classic Concepts is the ideal partner for your acrylic manufacturing needs. With its commitment to quality, customer satisfaction, and cutting-edge technology, the company is well-positioned to help your business succeed.
            </p>
          </div>

        </div>
      </section>

      {/* Reused Clients Section */}
      <Clients />
    </main>
  );
}
