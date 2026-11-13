export const dynamic = "force-dynamic";
import { Hero } from "@/components/home/Hero";
import { AboutSnippet } from "@/components/home/AboutSnippet";
import { ProblemStatements } from "@/components/home/ProblemStatements";
import { Industries } from "@/components/home/Industries";
import { getFullCatalogIndex } from "@/lib/public-data";
import { WhyChooseUs } from "@/components/home/WhyChooseUs";
import { HowWeDoIt } from "@/components/home/HowWeDoIt";
import { Clients } from "@/components/home/Clients";
import { AvailableOnPlatforms } from "@/components/home/AvailableOnPlatforms";
import { ArrowRight } from "lucide-react";
import {
  getSiteContentMap,
  getContentValue,
  hasContentOverride,
} from "@/lib/site-content";
import { EditableText } from "@/components/inline-edit/EditableText";

export const metadata = {
  title: "Classic Concepts | Acrylic Podiums, Displays & Custom Manufacturing Since 2008",
  description:
    "Original cast acrylic podiums, retail display stands, trophies, enclosures, and custom acrylic fabrication direct from our 16,000 sq. ft. ISO 9001:2015 factory Since 2008.",
};

export default async function Home() {
  const [catalog, content] = await Promise.all([
    getFullCatalogIndex(),
    getSiteContentMap(),
  ]);
  const problemStatements = catalog.problemStatements;
  const industries = catalog.industries;

  return (
    <div className="min-h-screen">
      <Hero content={content} />
      <AboutSnippet content={content} />
      <ProblemStatements statements={problemStatements} content={content} />
      <Industries industries={industries} content={content} />
      <WhyChooseUs content={content} />
      <HowWeDoIt content={content} />
      <Clients content={content} />
      <AvailableOnPlatforms content={content} />

      {/* Quick About / Call to Action */}
      <section className="py-24 relative overflow-hidden bg-[#0c1a40]">
        {/* Tri-color Deep Background Mesh */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#9b1539] to-[#0d1f4d] opacity-90"></div>
        <div className="absolute -top-1/2 -right-1/4 w-[150%] h-[150%] bg-gradient-to-br from-[#0c1a40] via-[#8b1538] to-[#142352] rounded-full blur-3xl opacity-80 pointer-events-none z-0"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[80%] h-[80%] bg-[#ffdf00] rounded-full mix-blend-overlay filter blur-[150px] opacity-30 pointer-events-none z-0"></div>

        <div className="container mx-auto px-6 relative z-10 flex flex-col items-center text-center">
          <EditableText
            as="h2"
            mode="plain"
            contentKey="home.cta.title"
            label="Bottom CTA Heading"
            value={getContentValue(
              content,
              "home.cta.title",
              "Need a Podium, Display Stand, or Custom Size?"
            )}
            hasCustomValue={hasContentOverride(content, "home.cta.title")}
            className="text-4xl md:text-5xl font-extrabold mb-8 text-white tracking-tight leading-tight block"
          >
            Need a Podium, Display, or{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-white">
              Custom Size?
            </span>
          </EditableText>

          <EditableText
            as="p"
            mode="multiline"
            contentKey="home.cta.subtitle"
            label="Bottom CTA Description"
            value={getContentValue(
              content,
              "home.cta.subtitle",
              "Order direct from Classic Concepts Since 2008 for clear non-yellowing acrylic, custom logo printing, and safe wooden crated delivery across India."
            )}
            className="text-base md:text-lg max-w-2xl text-white/80 mb-12 font-medium leading-relaxed block"
          />

          <a
            href="/contact"
            className="group flex items-center gap-2 px-10 py-4 rounded-full bg-[#e31837] text-white font-bold text-lg hover:bg-red-700 hover:shadow-hover hover:shadow-red-500/30 transition-all duration-300 transform hover:-translate-y-1"
          >
            <EditableText
              as="span"
              mode="plain"
              allowSwitchToHtml={false}
              contentKey="home.cta.button"
              label="Bottom CTA Button"
              value={getContentValue(
                content,
                "home.cta.button",
                "Get a Quote Today"
              )}
            />
            <ArrowRight
              size={20}
              className="transform group-hover:translate-x-1 transition-transform"
            />
          </a>
        </div>
      </section>
    </div>
  );
}
