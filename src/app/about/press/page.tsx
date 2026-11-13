export const dynamic = "force-dynamic";
import { getCachedBrandAssets, getPublicSiteSettings } from "@/lib/public-data";
import { Clients } from "@/components/home/Clients";
import { PageHeader } from "@/components/layout/PageHeader";
import { resolveProductVideos } from "@/lib/youtube";
import { UniversalVideoPlayer } from "@/components/shop/UniversalVideoPlayer";
import { Newspaper, ExternalLink, Calendar, BookOpen } from "lucide-react";
import { getSiteContentMap, getContentValue } from "@/lib/site-content";
import { EditableText } from "@/components/inline-edit/EditableText";
import { EditableImage } from "@/components/inline-edit/EditableImage";

export const metadata = {
  title: "In the Press & Newsroom - Classic Concepts",
  description:
    "Read about Classic Concepts in the press, newspaper clippings, newsroom articles, and watch our media features.",
};

const DEFAULT_PRESS_EDITORIAL_HTML = `<p>Classic Concepts is a leading acrylic manufacturer that specializes in creating high-quality, custom-made acrylic products for a wide range of industries. With years of experience in the industry, the company has established itself as a reliable partner for businesses looking for top-notch acrylic solutions.</p>
<p>The company's manufacturing facility is equipped with state-of-the-art equipment and technology, allowing it to produce acrylic products of varying shapes, sizes, and colors. Whether you need acrylic displays, signage, point-of-sale displays, or any other custom-made acrylic product, Classic Concepts has the expertise and resources to meet your needs.</p>
<p>One of the company's key strengths is its focus on quality. Each product is meticulously crafted to meet the highest standards, ensuring that they are durable, long-lasting, and visually stunning. The company's team of skilled artisans pays close attention to detail, ensuring that every product is made to perfection.</p>
<p>Another factor that sets Classic Concepts apart is its commitment to customer satisfaction. The company takes a collaborative approach, working closely with clients to understand their specific needs and preferences. The team then creates custom solutions that meet these requirements, providing clients with products that are tailored to their unique needs.</p>
<p>Whether you're looking for a one-of-a-kind display or a large-scale project, Classic Concepts is the ideal partner for your acrylic manufacturing needs. With its commitment to quality, customer satisfaction, and cutting-edge technology, the company is well-positioned to help your business succeed.</p>`;

export default async function AboutPressPage() {
  const [settings, brandAssets, contentMap] = await Promise.all([
    getPublicSiteSettings(),
    getCachedBrandAssets(),
    getSiteContentMap(),
  ]);
  const pressArticles = brandAssets.pressArticles;

  const newspaperItems = pressArticles.filter((a) => a.category === "Newspaper");
  const newsroomItems = pressArticles.filter((a) => a.category === "Newsroom");
  const pressVideos = resolveProductVideos(settings?.pressVideoUrl);

  return (
    <main className="min-h-screen bg-[#fafbfc] flex flex-col">
      <PageHeader
        contentKeyPrefix="press.banner"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "About Us", href: "/about" },
          { label: "Press & Newsroom" },
        ]}
        title={
          <>
            In the{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
              Press &amp; Newsroom
            </span>
          </>
        }
        description="Explore media coverage, newspaper clippings, corporate announcements, and video features showcasing Classic Concepts."
      />

      {/* Main Press Content */}
      <section className="py-20 relative z-20">
        <div className="container mx-auto px-6 w-full space-y-20">
          {/* Universal Video Section (YouTube, Shorts, Reels, Vimeo, Drive, etc.) */}
          {pressVideos.length > 0 && (
            <div className="space-y-8 text-center">
              <EditableText
                as="h2"
                contentKey="press.video.heading"
                value={getContentValue(contentMap, "press.video.heading", "Classic Concepts in Action")}
                label="Press Video Heading"
                className="text-3xl font-bold text-slate-800 block"
              />
              <UniversalVideoPlayer
                rawVideoUrl={settings?.pressVideoUrl}
                productName="Classic Concepts Press Feature"
                headerAction={
                  <EditableText
                    settingField="pressVideoUrl"
                    value={settings?.pressVideoUrl || ""}
                    allowSwitchToHtml={false}
                    label="Press Video URL(s) (YouTube, Shorts, Instagram Reels, Vimeo, Drive)"
                    className="text-xs font-semibold text-slate-500"
                  >
                    <span>Change Video URL</span>
                  </EditableText>
                }
              />
              <EditableText
                as="p"
                mode="multiline"
                contentKey="press.video.caption"
                value={getContentValue(
                  contentMap,
                  "press.video.caption",
                  "Watch our latest features and learn more about our commitment to quality acrylic manufacturing and innovative design solutions."
                )}
                label="Press Video Caption"
                className="text-slate-600 text-lg max-w-2xl mx-auto block"
              />
            </div>
          )}

          {/* Newspaper Clippings Section */}
          <div className={`space-y-12 ${pressVideos.length > 0 ? "pt-12 border-t border-slate-200" : ""}`}>
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 text-[#0056b3] text-xs font-bold uppercase tracking-wider">
                <Newspaper size={15} />
                <EditableText
                  contentKey="press.clippings.eyebrow"
                  value={getContentValue(contentMap, "press.clippings.eyebrow", "Print & Media Coverage")}
                  label="Clippings Eyebrow"
                />
              </div>
              <EditableText
                as="h2"
                contentKey="press.clippings.heading"
                value={getContentValue(
                  contentMap,
                  "press.clippings.heading",
                  "Newspaper Clippings & Media Coverage"
                )}
                label="Clippings Section Heading"
                className="text-3xl font-bold text-slate-800"
              />
              <EditableText
                as="p"
                mode="multiline"
                contentKey="press.clippings.subheading"
                value={getContentValue(
                  contentMap,
                  "press.clippings.subheading",
                  "We are proud to be recognized by leading publications for our excellence in the acrylic industry."
                )}
                label="Clippings Section Subheading"
                className="text-slate-600 text-lg"
              />
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
                      <EditableImage
                        entity={{ model: "pressArticle", id: item.id, field: "imageUrl" }}
                        src={item.imageUrl}
                        alt={item.title}
                        label={`Clipping Image: ${item.title}`}
                        aspectRatio={4 / 3}
                        wrapperClassName="relative w-full h-full"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </a>
                  )}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {item.publication && (
                          <EditableText
                            entity={{ model: "pressArticle", id: item.id, field: "publication" }}
                            value={item.publication}
                            label="Publication Name"
                            className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0056b3] text-xs font-bold"
                          />
                        )}
                        {item.date && (
                          <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                            <Calendar size={12} />
                            <EditableText
                              entity={{ model: "pressArticle", id: item.id, field: "date" }}
                              value={item.date}
                              label="Publication Date"
                            />
                          </span>
                        )}
                      </div>
                      <EditableText
                        as="h3"
                        entity={{ model: "pressArticle", id: item.id, field: "title" }}
                        value={item.title}
                        label="Press Article Title"
                        className="text-lg font-bold text-slate-800 group-hover:text-[#0056b3] transition-colors"
                      />
                      {item.summary && (
                        <EditableText
                          as="p"
                          mode="multiline"
                          entity={{ model: "pressArticle", id: item.id, field: "summary" }}
                          value={item.summary}
                          label="Press Summary"
                          className="text-sm text-slate-600 mt-2 leading-relaxed"
                        />
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
                    <EditableImage
                      settingField="pressClipping1"
                      src={settings?.pressClipping1 || "/press-clipping-1.png"}
                      alt="Press Feature 1"
                      label="Press Clipping 1"
                      aspectRatio={4 / 3}
                      wrapperClassName="relative w-full h-full"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                </div>
              )}

              {(settings?.pressClipping2 || newspaperItems.length === 0) && (
                <div className="group relative bg-white p-4 rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-slate-100">
                    <EditableImage
                      settingField="pressClipping2"
                      src={settings?.pressClipping2 || "/press-clipping-2.png"}
                      alt="Press Feature 2"
                      label="Press Clipping 2"
                      aspectRatio={4 / 3}
                      wrapperClassName="relative w-full h-full"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
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
                  <EditableText
                    contentKey="press.newsroom.eyebrow"
                    value={getContentValue(contentMap, "press.newsroom.eyebrow", "Newsroom & Announcements")}
                    label="Newsroom Eyebrow"
                  />
                </div>
                <EditableText
                  as="h2"
                  contentKey="press.newsroom.heading"
                  value={getContentValue(contentMap, "press.newsroom.heading", "Newsroom Articles")}
                  label="Newsroom Heading"
                  className="text-3xl font-bold text-slate-800"
                />
                <EditableText
                  as="p"
                  mode="multiline"
                  contentKey="press.newsroom.subheading"
                  value={getContentValue(
                    contentMap,
                    "press.newsroom.subheading",
                    "Latest press releases, company milestones, and industry insights from Classic Concepts."
                  )}
                  label="Newsroom Subheading"
                  className="text-slate-600 text-lg"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {newsroomItems.map((article) => (
                  <article
                    key={article.id}
                    className="group bg-white rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col"
                  >
                    {article.imageUrl && (
                      <div className="relative aspect-[16/10] w-full bg-slate-100 overflow-hidden border-b border-slate-100">
                        <EditableImage
                          entity={{ model: "pressArticle", id: article.id, field: "imageUrl" }}
                          src={article.imageUrl}
                          alt={article.title}
                          label={`Newsroom Image: ${article.title}`}
                          aspectRatio={16 / 10}
                          wrapperClassName="relative w-full h-full"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    )}
                    <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2.5">
                          <EditableText
                            entity={{ model: "pressArticle", id: article.id, field: "publication" }}
                            value={article.publication || "Newsroom"}
                            label="Newsroom Publication"
                            className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold"
                          />
                          {article.date && (
                            <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                              <Calendar size={12} />
                              <EditableText
                                entity={{ model: "pressArticle", id: article.id, field: "date" }}
                                value={article.date}
                                label="Newsroom Date"
                              />
                            </span>
                          )}
                        </div>
                        <EditableText
                          as="h3"
                          entity={{ model: "pressArticle", id: article.id, field: "title" }}
                          value={article.title}
                          label="Newsroom Article Title"
                          className="text-xl font-bold text-slate-800 group-hover:text-[#0056b3] transition-colors leading-snug"
                        />
                        {article.summary && (
                          <EditableText
                            as="p"
                            mode="multiline"
                            entity={{ model: "pressArticle", id: article.id, field: "summary" }}
                            value={article.summary}
                            label="Newsroom Article Summary"
                            className="text-sm text-slate-600 mt-3 leading-relaxed whitespace-pre-line"
                          />
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
          <EditableText
            as="div"
            mode="html"
            contentKey="press.editorial.html"
            value={getContentValue(contentMap, "press.editorial.html", DEFAULT_PRESS_EDITORIAL_HTML)}
            label="Press Editorial Bio"
            contextHint="Press kit company bio and manufacturing highlights"
            className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-100 text-slate-700 text-lg leading-relaxed font-light space-y-6"
          />
        </div>
      </section>

      {/* Reused Clients Section */}
      <Clients content={contentMap} />
    </main>
  );
}
