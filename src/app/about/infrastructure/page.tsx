export const dynamic = "force-dynamic";
import { getCachedBrandAssets, getPublicSiteSettings } from "@/lib/public-data";
import { PageHeader } from "@/components/layout/PageHeader";
import { resolveProductVideos } from "@/lib/youtube";
import { UniversalVideoPlayer } from "@/components/shop/UniversalVideoPlayer";
import { Cog, MapPin } from "lucide-react";
import { getSiteContentMap, getContentValue } from "@/lib/site-content";
import { EditableText } from "@/components/inline-edit/EditableText";
import { EditableImage } from "@/components/inline-edit/EditableImage";

export const metadata = {
  title: "Our Infrastructure & Machinery - Classic Concepts",
  description:
    "Take a tour of our state-of-the-art 16,000 sq. ft. manufacturing facility, advanced machinery, and showrooms across India.",
};

const DEFAULT_GTM_HTML = `<p>During our initial concept design &amp; project planning phase in 2008 our strategy was formulated to align our products and solutions to the lifestyle sector only. Acrylic Furniture items constituted a major part of our display products at the soft launch at Novotel Lifestyle Exhibition, Hyderabad. The exhibition forum gave us a dip stick analysis of varied customers buying patterns, also gave us an opportunity to check the pulse of our potential market/ target audience, and a ready chance to influence their perceptions/ perspectives of Acrylic products and solutions.</p>
<p>Based on these learning's from our Soft launch - we decided to redefine our Go-2-Market Strategy according to changing industry trends and market conditions. This was our defining moment that lead us to the firm conviction that Classic Concepts would offer a full suite of end-2-end Acrylic solutions encompassing:</p>
<ul class="list-disc pl-6 space-y-2 mt-3">
  <li>Furniture items</li>
  <li>News Studio (Design, Erection &amp; Fabrication)</li>
  <li>Mementos &amp; Gifts</li>
  <li>Packaging Items</li>
  <li>Rewards &amp; Awards products</li>
  <li>Jewelry boxes &amp; Interior decoration items</li>
  <li>Advertising and Display boards</li>
  <li>Podiums and a range of other customized products</li>
</ul>`;

export default async function OurInfrastructurePage() {
  const [settings, brandAssets, contentMap] = await Promise.all([
    getPublicSiteSettings(),
    getCachedBrandAssets(),
    getSiteContentMap(),
  ]);
  const locations = brandAssets.locations;
  const machinery = brandAssets.machinery;

  const infraVideos = resolveProductVideos(settings?.infraVideoUrl);

  return (
    <main className="min-h-screen bg-white">
      <PageHeader
        contentKeyPrefix="infra.banner"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "About Us", href: "/about" },
          { label: "Infrastructure" },
        ]}
        title={
          <>
            Our{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
              Infrastructure
            </span>
          </>
        }
        description="Take a tour of our 16,000 sq. ft. manufacturing facility, advanced CNC & laser machinery, and showrooms across India."
      />

      <div className="container mx-auto px-6 py-12 space-y-16">
        {/* Our Manufacturing Process */}
        <div className="bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 rounded-3xl p-8 md:p-10 border border-slate-200/80 shadow-xs space-y-4">
          <EditableText
            as="h2"
            contentKey="infra.process.heading"
            value={getContentValue(contentMap, "infra.process.heading", "Our Manufacturing Process")}
            label="Manufacturing Process Heading"
            className="text-2xl md:text-3xl font-extrabold text-slate-800"
          />
          <EditableText
            as="p"
            mode="multiline"
            contentKey="infra.process.body"
            value={getContentValue(
              contentMap,
              "infra.process.body",
              "With over two decades of experience, Classic Concepts is a market leader in acrylic manufacturing. Our 16,000 sq. ft. factory combines advanced technology with a highly qualified team of engineers to design and craft podiums and other acrylic products. Every product is made with meticulous attention to detail, delivering durability, ease of handling and an elegant finish—all at competitive prices."
            )}
            label="Manufacturing Process Description"
            className="text-slate-600 text-base md:text-lg leading-relaxed"
          />
        </div>

        {/* Dynamic Machinery Used in Our Company */}
        {machinery.length > 0 && (
          <div className="space-y-8 pt-4">
            <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 text-[#0056b3] flex items-center justify-center">
                <Cog size={24} />
              </div>
              <div>
                <EditableText
                  as="h2"
                  contentKey="infra.machinery.heading"
                  value={getContentValue(
                    contentMap,
                    "infra.machinery.heading",
                    "Machinery & Equipment Used in Our Factory"
                  )}
                  label="Machinery Section Heading"
                  className="text-2xl md:text-3xl font-extrabold text-slate-800"
                />
                <EditableText
                  as="p"
                  contentKey="infra.machinery.subheading"
                  value={getContentValue(
                    contentMap,
                    "infra.machinery.subheading",
                    "Precision fabrication equipment powering our 16,000 sq. ft. manufacturing facility"
                  )}
                  label="Machinery Section Subheading"
                  className="text-slate-500 text-sm font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {machinery.map((item) => (
                <div
                  key={item.id}
                  className="group bg-white rounded-2xl border border-slate-200/90 shadow-soft hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 border-b border-slate-100 flex items-center justify-center">
                    <EditableImage
                      entity={{ model: "machinery", id: item.id, field: "imageUrl" }}
                      src={item.imageUrl}
                      alt={item.name}
                      label={`Machinery Image: ${item.name}`}
                      aspectRatio={4 / 3}
                      wrapperClassName="relative w-full h-full flex items-center justify-center"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      emptyPlaceholder={<Cog size={40} className="text-slate-300" />}
                    />
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <EditableText
                        as="h3"
                        entity={{ model: "machinery", id: item.id, field: "name" }}
                        value={item.name}
                        label="Machinery Name"
                        className="text-lg font-bold text-slate-800 group-hover:text-[#0056b3] transition-colors"
                      />
                      <EditableText
                        as="p"
                        mode="multiline"
                        entity={{ model: "machinery", id: item.id, field: "description" }}
                        value={item.description || ""}
                        label={`Machinery Description (${item.name})`}
                        className="text-sm text-slate-600 mt-2 leading-relaxed"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Business Model and Initial Approach */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-4">
            <EditableText
              as="h2"
              contentKey="infra.businessModel.heading"
              value={getContentValue(contentMap, "infra.businessModel.heading", "Business Model")}
              label="Business Model Heading"
              className="text-xl font-bold text-slate-800"
            />
            <EditableText
              as="p"
              mode="multiline"
              contentKey="infra.businessModel.body"
              value={getContentValue(
                contentMap,
                "infra.businessModel.body",
                "Based on the fundamental principle of creating value to the end customer by using innovative methodologies for designing Acrylic solutions and conceptualizing client requirements to provide customized products & items, thus sustaining ourselves by generating profits."
              )}
              label="Business Model Description"
              className="text-slate-600 text-[15px] leading-relaxed"
            />
          </div>
          <div className="space-y-4">
            <EditableText
              as="h2"
              contentKey="infra.initialApproach.heading"
              value={getContentValue(contentMap, "infra.initialApproach.heading", "Our Initial Approach")}
              label="Initial Approach Heading"
              className="text-xl font-bold text-slate-800"
            />
            <EditableText
              as="div"
              mode="multiline"
              contentKey="infra.initialApproach.body"
              value={getContentValue(
                contentMap,
                "infra.initialApproach.body",
                "Our initial discovery phase was focused as a conservative approach.\n\nThe soft launch at Deccan States Expo - HICC Novotel, Hyderabad was a carefully calibrated & calculated approach designed to help us gain a dip-stick view of our target audience."
              )}
              label="Initial Approach Description"
              className="text-slate-600 text-[15px] leading-relaxed whitespace-pre-line"
            />
          </div>
        </div>

        {/* Go-to-market Strategy */}
        <div className="space-y-6">
          <EditableText
            as="h2"
            contentKey="infra.gtm.heading"
            value={getContentValue(contentMap, "infra.gtm.heading", "Redefined Go-2-Market Strategy")}
            label="Go-2-Market Heading"
            className="text-xl font-bold text-slate-800"
          />
          <EditableText
            as="div"
            mode="html"
            contentKey="infra.gtm.html"
            value={getContentValue(contentMap, "infra.gtm.html", DEFAULT_GTM_HTML)}
            label="Go-2-Market Strategy Content"
            className="text-slate-600 text-[15px] leading-relaxed space-y-4"
          />
        </div>

        {/* Universal External Video Embed (YouTube, Shorts, Reels, Vimeo, Drive, etc.) */}
        <div className="w-full mx-auto py-4 space-y-3">
          {infraVideos.length > 0 ? (
            <UniversalVideoPlayer
              rawVideoUrl={settings?.infraVideoUrl}
              productName="Classic Concepts Infrastructure"
              headerAction={
                <EditableText
                  settingField="infraVideoUrl"
                  value={settings?.infraVideoUrl || ""}
                  allowSwitchToHtml={false}
                  label="Infrastructure Video URL(s) (YouTube, Shorts, Instagram Reels, Vimeo, Drive)"
                  className="text-xs font-semibold text-slate-500"
                >
                  <span>Change Video URL</span>
                </EditableText>
              }
            />
          ) : (
            <div className="text-center">
              <EditableText
                settingField="infraVideoUrl"
                value={settings?.infraVideoUrl || ""}
                allowSwitchToHtml={false}
                label="Infrastructure Video URL (YouTube, Shorts, Reels, Vimeo, Drive)"
                className="text-xs text-slate-400"
              >
                <span>Factory Tour Video</span>
              </EditableText>
            </div>
          )}
        </div>

        {/* Dynamic Locations Grid */}
        <div className="py-12 border-t border-slate-100 space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0056b3] flex items-center justify-center">
              <MapPin size={20} />
            </div>
            <EditableText
              as="h2"
              contentKey="infra.locations.heading"
              value={getContentValue(contentMap, "infra.locations.heading", "Our Locations & Showrooms")}
              label="Locations Section Heading"
              className="text-2xl font-bold text-slate-800"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {locations.length > 0 ? (
              locations.map((loc) => {
                const Card = (
                  <div className="group bg-white border-2 border-[#0056b3] rounded-2xl overflow-hidden flex flex-col h-full hover:shadow-lg transition-shadow duration-300">
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 flex items-center justify-center">
                      <EditableImage
                        entity={{ model: "infrastructureLocation", id: loc.id, field: "imageUrl" }}
                        src={loc.imageUrl}
                        alt={loc.name}
                        label={`Location Image: ${loc.name}`}
                        aspectRatio={4 / 3}
                        wrapperClassName="relative w-full h-full flex items-center justify-center"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        emptyPlaceholder={<MapPin size={40} className="text-slate-300" />}
                      />
                    </div>
                    <div className="p-4 text-center bg-white flex-1 flex items-center justify-center">
                      <EditableText
                        as="h3"
                        entity={{ model: "infrastructureLocation", id: loc.id, field: "name" }}
                        value={loc.name}
                        label="Location Name"
                        className="font-bold text-[#0056b3]"
                      />
                    </div>
                  </div>
                );

                if (loc.mapUrl) {
                  return (
                    <a key={loc.id} href={loc.mapUrl} target="_blank" rel="noreferrer" className="block h-full">
                      {Card}
                    </a>
                  );
                }

                return (
                  <div key={loc.id} className="h-full">
                    {Card}
                  </div>
                );
              })
            ) : (
              <p className="text-slate-500 col-span-full text-center">No locations added yet.</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
