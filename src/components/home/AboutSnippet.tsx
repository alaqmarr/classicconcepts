import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  getContentValue,
  hasContentOverride,
  type SiteContentMap,
} from "@/lib/site-content";
import { EditableText } from "@/components/inline-edit/EditableText";
import { EditableImage } from "@/components/inline-edit/EditableImage";

export function AboutSnippet({ content }: { content?: SiteContentMap }) {
  return (
    <section className="relative z-20 px-4 md:px-8 py-16 bg-gradient-to-br from-[#fff0f0] via-[#fffbf0] to-[#f0f4ff]">
      <div className="container mx-auto w-full bg-white rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-slate-100 p-8 md:p-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-12">
          {/* Left Certifications (ISO) */}
          <div className="flex flex-row md:flex-col gap-6 items-center md:w-[15%] justify-center">
            <div className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center p-3">
              <EditableImage
                contentKey="home.about.cert1"
                src={getContentValue(
                  content,
                  "home.about.cert1",
                  "/iso-certificate.png"
                )}
                alt="ISO 9001:2015"
                label="ISO Certificate Badge"
                className="w-20 h-20 object-contain"
              />
            </div>
            <div className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center p-3">
              <EditableImage
                contentKey="home.about.cert2"
                src={getContentValue(
                  content,
                  "home.about.cert2",
                  "/ascb-certificate.png"
                )}
                alt="ASCB(E)"
                label="ASCB Certificate Badge"
                className="w-20 h-20 object-contain"
              />
            </div>
          </div>

          {/* Center Text */}
          <div className="flex flex-col items-start md:items-center md:text-center w-full md:w-[70%]">
            <EditableText
              as="span"
              mode="plain"
              contentKey="home.about.eyebrow"
              label="About Section Eyebrow"
              value={getContentValue(
                content,
                "home.about.eyebrow",
                "Who We Are"
              )}
              className="text-[#3b82f6] text-[10px] font-bold uppercase tracking-widest mb-3 block"
            />
            <EditableText
              as="h2"
              mode="plain"
              contentKey="home.about.title"
              label="About Section Heading"
              value={getContentValue(
                content,
                "home.about.title",
                "About Classic Concepts"
              )}
              hasCustomValue={hasContentOverride(content, "home.about.title")}
              className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-6 tracking-tight block"
            >
              About <span className="text-[#e31837]">C</span>
              <span className="text-black">lassic</span>{" "}
              <span className="text-[#e31837]">C</span>
              <span className="text-black">oncepts</span>
            </EditableText>
            <EditableText
              as="p"
              mode="multiline"
              contentKey="home.about.body"
              label="About Section Story"
              value={getContentValue(
                content,
                "home.about.body",
                "Manufacturing Since 2008 at our 16,000 sq. ft. ISO 9001:2015 certified factory in Secunderabad, Classic Concepts designs and builds clear cast acrylic podiums, retail display stands, trophies, and custom acrylic products for hotels, colleges, offices, and brands across India and abroad."
              )}
              className="text-slate-600 text-sm md:text-base leading-relaxed mb-8 font-medium block"
            />
            <Link
              href="/about"
              className="group inline-flex items-center gap-2 bg-white border border-[#3b82f6] text-[#3b82f6] px-8 py-3 rounded-full font-bold text-sm hover:bg-[#3b82f6] hover:text-white transition-all duration-300 shadow-sm"
            >
              <EditableText
                as="span"
                mode="plain"
                allowSwitchToHtml={false}
                contentKey="home.about.cta"
                label="About Button Text"
                value={getContentValue(
                  content,
                  "home.about.cta",
                  "Read Full Story"
                )}
              />
              <ArrowRight
                size={16}
                className="transform group-hover:translate-x-1 transition-transform"
              />
            </Link>
          </div>

          {/* Right Certifications (HYM, QA Global) */}
          <div className="flex flex-row md:flex-col gap-6 items-center md:w-[15%] justify-center">
            <div className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center p-3">
              <EditableImage
                contentKey="home.about.cert3"
                src={getContentValue(
                  content,
                  "home.about.cert3",
                  "/hym-certificate.png"
                )}
                alt="HYM"
                label="HYM Certificate Badge"
                className="w-20 h-20 object-contain"
              />
            </div>
            <div className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center p-3">
              <EditableImage
                contentKey="home.about.cert4"
                src={getContentValue(
                  content,
                  "home.about.cert4",
                  "/ga-certificate.png"
                )}
                alt="Global Accreditation"
                label="GA Certificate Badge"
                className="w-20 h-20 object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
