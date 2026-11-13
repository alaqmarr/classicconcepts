import Image from "next/image";
import { Play } from "lucide-react";
import { getPublicSiteSettings } from "@/lib/public-data";
import { getYouTubeEmbedUrl } from "@/lib/youtube";
import {
  getContentValue,
  hasContentOverride,
  type SiteContentMap,
} from "@/lib/site-content";
import { EditableText } from "@/components/inline-edit/EditableText";

export async function HowWeDoIt({ content }: { content?: SiteContentMap }) {
  const settings = await getPublicSiteSettings();

  return (
    <section className="bg-gradient-to-b from-[#f0f4ff] via-[#fffbf0] to-[#fff0f0] py-20 relative overflow-hidden">
      <div className="container mx-auto px-4 md:px-8 relative z-10">
        <div className="flex flex-col md:flex-row items-center gap-12 lg:gap-20">
          <div className="w-full md:w-1/2">
            <EditableText
              as="span"
              mode="plain"
              contentKey="home.process.eyebrow"
              label="Manufacturing Eyebrow"
              value={getContentValue(
                content,
                "home.process.eyebrow",
                "How We Do It?"
              )}
              className="text-[#3b82f6] text-[10px] font-bold uppercase tracking-widest mb-3 block"
            />
            <EditableText
              as="h2"
              mode="plain"
              contentKey="home.process.title"
              label="Manufacturing Heading"
              value={getContentValue(
                content,
                "home.process.title",
                "Our Manufacturing Process"
              )}
              hasCustomValue={hasContentOverride(content, "home.process.title")}
              className="text-3xl md:text-5xl font-extrabold text-slate-800 tracking-tight leading-tight mb-8 block"
            >
              Our Manufacturing
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-[#e31837]">
                Process
              </span>
            </EditableText>

            <div className="text-slate-600 space-y-6 text-sm md:text-base leading-relaxed font-medium mb-10">
              <EditableText
                as="p"
                mode="multiline"
                contentKey="home.process.body"
                label="Manufacturing Process Description"
                value={getContentValue(
                  content,
                  "home.process.body",
                  "Since 2008, Classic Concepts has built strong, clear acrylic products in our 16,000 sq. ft. factory in Secunderabad. Our team uses precision laser cutting, CNC routing, and clean hand finishing to make podiums, stands, and custom acrylic units that last for years at fair factory-direct prices."
                )}
                className="block"
              />
            </div>

            <div className="flex items-center gap-4 bg-slate-50 border border-slate-100 p-4 rounded-2xl">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-red-500 shadow-sm shrink-0">
                <Play size={20} className="ml-1" />
              </div>
              <EditableText
                as="p"
                mode="multiline"
                contentKey="home.process.highlight"
                label="Manufacturing Callout"
                value={getContentValue(
                  content,
                  "home.process.highlight",
                  "We specialize in manufacturing of Laser cut design components & sheet metal parts for different types of applications."
                )}
                className="text-slate-700 text-sm font-bold leading-snug block"
              />
            </div>
          </div>

          <div className="w-full md:w-1/2 flex flex-col items-end gap-2 relative">
            <EditableText
              as="span"
              mode="plain"
              allowSwitchToHtml={false}
              settingField="homeVideoUrl"
              label="Home Manufacturing YouTube Video URL"
              value={settings?.homeVideoUrl || ""}
              className="text-[11px] text-slate-400"
            >
              <span />
            </EditableText>

            {settings?.homeVideoUrl ? (
              <div className="relative w-full aspect-video rounded-3xl overflow-hidden shadow-2xl">
                <iframe
                  src={getYouTubeEmbedUrl(settings.homeVideoUrl) || ""}
                  title="How We Do It Video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full border-0"
                ></iframe>
              </div>
            ) : (
              <div className="relative w-full aspect-video rounded-3xl overflow-hidden shadow-2xl group cursor-pointer border border-slate-100">
                <Image
                  src="/placeholder-image.jpg"
                  alt="How We Do It Video"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  unoptimized
                />
                <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-slate-900/20 transition-colors"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-[#e31837] shadow-xl group-hover:scale-110 group-hover:bg-[#e31837] group-hover:text-white transition-all duration-300">
                    <Play size={32} className="ml-2" />
                  </div>
                </div>
              </div>
            )}

            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl pointer-events-none z-[-1]"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
