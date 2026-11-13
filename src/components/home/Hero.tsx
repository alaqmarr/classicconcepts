import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, Target, Settings, MapPin } from "lucide-react";
import {
  getContentValue,
  hasContentOverride,
  type SiteContentMap,
} from "@/lib/site-content";
import { EditableText } from "@/components/inline-edit/EditableText";
import { EditableImage } from "@/components/inline-edit/EditableImage";

export function Hero({ content }: { content?: SiteContentMap }) {
  const heroBg = getContentValue(content, "home.hero.bgImage", "/hero.png");
  const badgeText = getContentValue(
    content,
    "home.hero.badge",
    "Manufacturing in India Since 2008"
  );
  const headlineText = getContentValue(
    content,
    "home.hero.title",
    "Original Acrylic Podiums & Custom Displays Made Built to Last"
  );
  const subtitleText = getContentValue(
    content,
    "home.hero.subtitle",
    "Trusted Since 2008. Direct from our 16,000 sq. ft. ISO 9001:2015 factory, crafting patented podiums, retail stands, trophies, and custom acrylic products."
  );

  return (
    <section className="relative w-full min-h-screen flex items-center justify-center pt-16 pb-16 overflow-hidden bg-[#02040a]">
      {/* Immersive Deep Background & Hero Showcase Image */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <Image
          src={heroBg}
          alt="Classic Concepts Acrylic Product Showcase"
          fill
          priority
          unoptimized
          className="object-cover object-center"
        />

        <div className="absolute inset-0 bg-gradient-to-b from-[#05060A]/75 via-[#02040a]/55 to-[#05060A]/85"></div>

        <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-[#3b82f6] rounded-full mix-blend-screen filter blur-[150px] opacity-20 animate-pulse"></div>
        <div
          className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] bg-[#e31837] rounded-full mix-blend-screen filter blur-[150px] opacity-20 animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>

      {/* Admin Hero Background Image Changer */}
      <div className="absolute top-6 right-6 z-30">
        <EditableImage
          contentKey="home.hero.bgImage"
          src={heroBg}
          alt="Hero Background"
          label="Hero Banner Background Image"
          aspectRatio={16 / 9}
          className="w-12 h-8 object-cover rounded opacity-0 pointer-events-none"
          wrapperClassName="relative min-w-[120px] min-h-[36px]"
        />
      </div>

      <div className="container mx-auto px-4 md:px-8 relative z-20 flex flex-col items-center text-center">
        {/* Top Tag */}
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-black/40 backdrop-blur-md border border-white/15 text-[#60a5fa] text-[11px] font-bold uppercase tracking-[0.2em] mb-10 shadow-[0_0_20px_rgba(59,130,246,0.2)] hover:bg-black/60 transition-colors cursor-default">
          <span className="w-2 h-2 rounded-full bg-[#3b82f6] animate-pulse shadow-[0_0_8px_#3b82f6]"></span>
          <EditableText
            as="span"
            mode="plain"
            contentKey="home.hero.badge"
            label="Hero Top Badge"
            value={badgeText}
          />
        </div>

        {/* Massive Center Headline */}
        <EditableText
          as="h1"
          mode="plain"
          contentKey="home.hero.title"
          label="Hero Main Headline"
          value={headlineText}
          hasCustomValue={hasContentOverride(content, "home.hero.title")}
          className="text-4xl md:text-6xl lg:text-[5rem] font-extrabold text-white leading-[1.1] mb-8 tracking-tight w-full drop-shadow-[0_4px_24px_rgba(0,0,0,0.8)] block"
        >
          Original Acrylic Podiums &amp; <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#60a5fa] via-[#a78bfa] to-[#f43f5e]">
            Custom Displays
          </span>{" "}
          <br className="hidden md:block" />
          Since 2008
        </EditableText>

        <EditableText
          as="p"
          mode="multiline"
          contentKey="home.hero.subtitle"
          label="Hero Subtitle"
          value={subtitleText}
          className="text-base md:text-xl text-gray-200 mb-14 max-w-3xl leading-relaxed font-medium drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] block"
        />

        {/* Advanced Glassmorphism Badges Row */}
        <div className="flex flex-wrap justify-center gap-4 md:gap-6 mb-16 w-full">
          <div className="flex items-center gap-4 bg-black/45 backdrop-blur-xl border border-white/15 px-6 py-4 rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_32px_rgba(0,0,0,0.4)] hover:bg-black/60 hover:-translate-y-1 transition-all duration-300 group">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#e31837]/25 to-[#e31837]/10 flex items-center justify-center text-[#ff4d6d] border border-[#e31837]/40 group-hover:scale-110 transition-transform">
              <ShieldCheck size={20} />
            </div>
            <div className="flex flex-col text-left">
              <EditableText
                as="span"
                mode="plain"
                contentKey="home.hero.pill1.top"
                label="Hero Badge 1 Top"
                value={getContentValue(content, "home.hero.pill1.top", "Premium")}
                className="text-[12px] font-extrabold text-white leading-tight uppercase tracking-widest"
              />
              <EditableText
                as="span"
                mode="plain"
                contentKey="home.hero.pill1.sub"
                label="Hero Badge 1 Subtitle"
                value={getContentValue(
                  content,
                  "home.hero.pill1.sub",
                  "Materials"
                )}
                className="text-[11px] text-gray-300"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 bg-black/45 backdrop-blur-xl border border-white/15 px-6 py-4 rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_32px_rgba(0,0,0,0.4)] hover:bg-black/60 hover:-translate-y-1 transition-all duration-300 group">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#e31837]/25 to-[#e31837]/10 flex items-center justify-center text-[#ff4d6d] border border-[#e31837]/40 group-hover:scale-110 transition-transform">
              <Target size={20} />
            </div>
            <div className="flex flex-col text-left">
              <EditableText
                as="span"
                mode="plain"
                contentKey="home.hero.pill2.top"
                label="Hero Badge 2 Top"
                value={getContentValue(
                  content,
                  "home.hero.pill2.top",
                  "Precision"
                )}
                className="text-[12px] font-extrabold text-white leading-tight uppercase tracking-widest"
              />
              <EditableText
                as="span"
                mode="plain"
                contentKey="home.hero.pill2.sub"
                label="Hero Badge 2 Subtitle"
                value={getContentValue(
                  content,
                  "home.hero.pill2.sub",
                  "Crafted"
                )}
                className="text-[11px] text-gray-300"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 bg-black/45 backdrop-blur-xl border border-white/15 px-6 py-4 rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_32px_rgba(0,0,0,0.4)] hover:bg-black/60 hover:-translate-y-1 transition-all duration-300 group">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#e31837]/25 to-[#e31837]/10 flex items-center justify-center text-[#ff4d6d] border border-[#e31837]/40 group-hover:scale-110 transition-transform">
              <Settings size={20} />
            </div>
            <div className="flex flex-col text-left">
              <EditableText
                as="span"
                mode="plain"
                contentKey="home.hero.pill3.top"
                label="Hero Badge 3 Top"
                value={getContentValue(content, "home.hero.pill3.top", "Custom")}
                className="text-[12px] font-extrabold text-white leading-tight uppercase tracking-widest"
              />
              <EditableText
                as="span"
                mode="plain"
                contentKey="home.hero.pill3.sub"
                label="Hero Badge 3 Subtitle"
                value={getContentValue(
                  content,
                  "home.hero.pill3.sub",
                  "Solutions"
                )}
                className="text-[11px] text-gray-300"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 bg-black/45 backdrop-blur-xl border border-white/15 px-6 py-4 rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_32px_rgba(0,0,0,0.4)] hover:bg-black/60 hover:-translate-y-1 transition-all duration-300 group">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#e31837]/25 to-[#e31837]/10 flex items-center justify-center text-[#ff4d6d] border border-[#e31837]/40 group-hover:scale-110 transition-transform">
              <MapPin size={20} />
            </div>
            <div className="flex flex-col text-left">
              <EditableText
                as="span"
                mode="plain"
                contentKey="home.hero.pill4.top"
                label="Hero Badge 4 Top"
                value={getContentValue(
                  content,
                  "home.hero.pill4.top",
                  "Made In"
                )}
                className="text-[12px] font-extrabold text-white leading-tight uppercase tracking-widest"
              />
              <EditableText
                as="span"
                mode="plain"
                contentKey="home.hero.pill4.sub"
                label="Hero Badge 4 Subtitle"
                value={getContentValue(content, "home.hero.pill4.sub", "India")}
                className="text-[11px] text-gray-300"
              />
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <Link
            href="/shop"
            className="px-10 py-4 rounded-full bg-gradient-to-r from-[#0047e1] to-[#3b82f6] text-white font-bold text-[14px] uppercase tracking-[0.15em] hover:shadow-[0_0_40px_rgba(59,130,246,0.6)] hover:scale-105 transition-all duration-300"
          >
            <EditableText
              as="span"
              mode="plain"
              allowSwitchToHtml={false}
              contentKey="home.hero.cta1"
              label="Hero Primary Button"
              value={getContentValue(
                content,
                "home.hero.cta1",
                "Explore Collection →"
              )}
            />
          </Link>
          <Link
            href="/podiums"
            className="px-10 py-4 rounded-full bg-black/40 backdrop-blur-md border border-white/25 text-white font-bold text-[14px] uppercase tracking-[0.15em] hover:bg-white hover:text-black hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all duration-300"
          >
            <EditableText
              as="span"
              mode="plain"
              allowSwitchToHtml={false}
              contentKey="home.hero.cta2"
              label="Hero Secondary Button"
              value={getContentValue(content, "home.hero.cta2", "Shop Podiums")}
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
