import {
  Target,
  Award,
  ShieldCheck,
  Sparkles,
  Cpu,
  Factory,
  Compass,
  Globe2,
  CheckCircle2,
} from "lucide-react";
import { Clients } from "@/components/home/Clients";
import { PageHeader } from "@/components/layout/PageHeader";
import { getPublicSiteSettings } from "@/lib/public-data";
import { getSiteContentMap, getContentValue, hasContentOverride } from "@/lib/site-content";
import { EditableText } from "@/components/inline-edit/EditableText";
import { EditableImage } from "@/components/inline-edit/EditableImage";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "About Us | Acrylic Manufacturing Since 2008 - Classic Concepts",
  description:
    "Manufacturing Since 2008 at our 16,000 sq. ft. ISO 9001:2015 factory in Secunderabad, Classic Concepts builds clear cast acrylic podiums, displays, and custom products for India and export markets.",
};

const trustPillars = [
  {
    icon: Award,
    title: "Manufacturing Since 2008",
    description:
      "Since 2008, we have specialized in acrylic manufacturing, delivering strong, reliable podiums, displays, and custom structures for hotels, schools, offices, and retail brands.",
  },
  {
    icon: Cpu,
    title: "Modern CNC, Laser & UV Equipment",
    description:
      "Our factory runs modern CNC routers, CO₂ laser cutters, diamond edge polishers, heat bending machines, and UV printers for clean, accurate results.",
  },
  {
    icon: Sparkles,
    title: "Imported Non-Yellowing Cast Acrylic",
    description:
      "We use 100% imported clear cast acrylic sheets that keep their glass-like clarity, smooth surface finish, and strength for years.",
  },
  {
    icon: Factory,
    title: "16,000 Sq. Ft. ISO 9001:2015 Factory",
    description:
      "Our spacious production unit in Secunderabad handles both single custom pieces and large bulk institutional or retail rollouts on time.",
  },
  {
    icon: Compass,
    title: "Custom Sizes & Logo Branding",
    description:
      "Share a sketch, photo, or measurement and our team turns your idea into a finished acrylic product with your logo printed or engraved.",
  },
  {
    icon: Globe2,
    title: "Made in India. Shipped Worldwide.",
    description:
      "We deliver safely across every Indian city in foam-lined wooden crates and export to the USA, Canada, Mexico, Australia, South Africa, and the UAE.",
  },
  {
    icon: ShieldCheck,
    title: "Patented Designs & Strict Quality Checks",
    description:
      "Our original podium models carry registered design and copyright protection, and every piece goes through multi-step inspection before dispatch.",
  },
];

const DEFAULT_ABOUT_STORY_HTML = `<p>At <strong class="font-bold text-slate-800">Classic Concepts Acrylic Pvt. Ltd.</strong>, we turn everyday business and stage needs into clear, long-lasting acrylic products.</p>
<p>Manufacturing <strong class="font-semibold text-slate-800">Since 2008</strong>, we have grown into one of India's most trusted acrylic podium, display, and custom fabrication manufacturers for hotels, universities, corporate offices, retailers, and government institutions.</p>
<p>Backed by our <strong class="font-semibold text-slate-800">16,000 sq. ft. ISO 9001:2015 certified factory</strong>, modern CNC and laser machinery, and experienced fabricators, every piece is finished with clean diamond-polished edges.</p>
<p>We work exclusively with imported cast acrylic sheets (up to 25mm thick) so our podiums, stands, trophies, enclosures, and furniture stay clear and sturdy for years.</p>
<p>Beyond pan-India wooden crated delivery, we export to customers in the <strong class="font-semibold text-slate-800">USA, Canada, Mexico, Australia, South Africa, and the UAE</strong>.</p>`;

export default async function AboutPage() {
  const [settings, contentMap] = await Promise.all([
    getPublicSiteSettings(),
    getSiteContentMap(),
  ]);

  const introHeadingDefault = "Trusted Since 2008. Built for Clarity & Strength in Acrylic.";
  const pillarsHeadingDefault = "Why Businesses Trust Classic Concepts";

  return (
    <main className="min-h-screen bg-[#fafbfc] flex flex-col">
      {/* Premium Hero Header */}
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "About Us" },
        ]}
        title={
          <>
            Transforming Ideas into <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
              Acrylic Excellence
            </span>
          </>
        }
        description="Manufacturing Clear Cast Acrylic Podiums & Custom Products Since 2008"
      />

      {/* Main Intro Section */}
      <section className="py-24 bg-gradient-to-b from-white via-slate-50/50 to-white relative z-20 overflow-hidden">
        {/* Intersecting Diagonal Blocks Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
          <div className="absolute -top-[20%] left-[0%] w-[150%] h-[50%] bg-gradient-to-r from-red-100/30 to-transparent -rotate-12 transform origin-top-left"></div>
          <div className="absolute top-[20%] left-[0%] w-[150%] h-[40%] bg-gradient-to-r from-yellow-100/30 to-transparent -rotate-12 transform origin-top-left"></div>
          <div className="absolute top-[60%] left-[0%] w-[150%] h-[60%] bg-gradient-to-r from-blue-100/30 to-transparent -rotate-12 transform origin-top-left"></div>
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Image Side with Premium Styling */}
            <div className="lg:col-span-5 relative group">
              <div className="absolute -inset-4 bg-gradient-to-tr from-[#0056b3]/20 to-cyan-500/20 rounded-[2.5rem] transform rotate-2 transition-transform duration-700 group-hover:rotate-6 blur-lg opacity-60"></div>
              <div className="relative aspect-[4/3] rounded-[2rem] overflow-hidden shadow-2xl border border-white/50 bg-white">
                <EditableImage
                  settingField="aboutIntroImage"
                  src={settings?.aboutIntroImage || "/butterfly-table.png"}
                  alt="Classic Concepts Acrylic Manufacturing"
                  label="About Us Intro Image"
                  aspectRatio={4 / 3}
                  wrapperClassName="relative w-full h-full"
                  className="w-full h-full object-cover transform scale-100 group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent pointer-events-none"></div>
              </div>

              {/* Floating Badge */}
              <div className="absolute -bottom-6 -left-4 md:-left-6 bg-white p-5 md:p-6 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-[#0056b3]">
                  <Award size={24} />
                </div>
                <div>
                  <EditableText
                    as="p"
                    contentKey="about.badge.title"
                    value={getContentValue(contentMap, "about.badge.title", "ISO 9001:2015")}
                    label="About Floating Badge Title"
                    className="font-bold text-slate-800 leading-tight"
                  />
                  <EditableText
                    as="p"
                    contentKey="about.badge.subtitle"
                    value={getContentValue(contentMap, "about.badge.subtitle", "16,000 Sq. Ft. Facility")}
                    label="About Floating Badge Subtitle"
                    className="text-xs text-slate-500 font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Text Side */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-[#0056b3] text-xs font-bold uppercase tracking-wider">
                <Target size={15} />
                <EditableText
                  contentKey="about.intro.eyebrow"
                  value={getContentValue(
                    contentMap,
                    "about.intro.eyebrow",
                    "Manufacturing in India Since 2008 • ISO 9001:2015 Certified"
                  )}
                  label="About Eyebrow Tagline"
                />
              </div>

              <EditableText
                as="h2"
                contentKey="about.intro.heading"
                value={getContentValue(contentMap, "about.intro.heading", introHeadingDefault)}
                hasCustomValue={hasContentOverride(contentMap, "about.intro.heading")}
                label="About Main Heading"
                className="text-3xl md:text-5xl font-extrabold text-slate-900 leading-tight tracking-tight"
              >
                Trusted Since 2008.{" "}
                <span className="text-[#0056b3]">Built for Clarity &amp; Strength in Acrylic.</span>
              </EditableText>

              <EditableText
                as="div"
                mode="html"
                contentKey="about.intro.storyHtml"
                value={getContentValue(contentMap, "about.intro.storyHtml", DEFAULT_ABOUT_STORY_HTML)}
                label="About Us Company Story"
                contextHint="Classic Concepts company overview and manufacturing story"
                className="space-y-4 text-slate-600 text-base md:text-lg leading-relaxed"
              />

              <div className="pt-2">
                <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-[#0056b3] to-blue-700 text-white font-extrabold text-base md:text-lg shadow-md">
                  <CheckCircle2 size={22} className="text-cyan-300 shrink-0" />
                  <EditableText
                    contentKey="about.intro.callout"
                    value={getContentValue(
                      contentMap,
                      "about.intro.callout",
                      "Your Vision. Our Expertise. Endless Possibilities in Acrylic."
                    )}
                    label="About Callout Motto"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Businesses Trust Classic Concepts Section */}
      <section className="py-24 bg-slate-50/80 relative overflow-hidden border-t border-slate-200/70">
        <div className="container mx-auto px-6 relative z-10 space-y-14">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center justify-center space-x-2">
              <span className="w-10 h-[2px] bg-[#e31837]"></span>
              <EditableText
                contentKey="about.pillars.eyebrow"
                value={getContentValue(contentMap, "about.pillars.eyebrow", "The Classic Concepts Advantage")}
                label="Trust Section Eyebrow"
                className="text-[#e31837] font-bold uppercase tracking-widest text-xs"
              />
              <span className="w-10 h-[2px] bg-[#e31837]"></span>
            </div>

            <EditableText
              as="h2"
              contentKey="about.pillars.heading"
              value={getContentValue(contentMap, "about.pillars.heading", pillarsHeadingDefault)}
              hasCustomValue={hasContentOverride(contentMap, "about.pillars.heading")}
              label="Trust Section Heading"
              className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight"
            >
              Why Businesses Trust <span className="text-[#0056b3]">Classic Concepts</span>
            </EditableText>

            <EditableText
              as="p"
              mode="multiline"
              contentKey="about.pillars.subheading"
              value={getContentValue(
                contentMap,
                "about.pillars.subheading",
                "Combining hands-on manufacturing experience Since 2008 with modern CNC, laser, and UV printing equipment."
              )}
              label="Trust Section Subheading"
              className="text-slate-600 text-base md:text-lg"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
            {trustPillars.map((pillar, index) => {
              const Icon = pillar.icon;
              const titleKey = `about.pillar.${index}.title`;
              const descKey = `about.pillar.${index}.description`;
              return (
                <div
                  key={pillar.title}
                  className={`bg-white rounded-3xl p-8 border border-slate-200/80 shadow-soft hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between ${
                    index === trustPillars.length - 1 ? "md:col-span-2 xl:col-span-2" : ""
                  }`}
                >
                  <div className="space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0056b3] flex items-center justify-center shadow-xs">
                      <Icon size={28} />
                    </div>
                    <EditableText
                      as="h3"
                      contentKey={titleKey}
                      value={getContentValue(contentMap, titleKey, pillar.title)}
                      label={`Trust Pillar ${index + 1} Title`}
                      className="text-xl font-extrabold text-slate-800 leading-snug"
                    />
                    <EditableText
                      as="p"
                      mode="multiline"
                      contentKey={descKey}
                      value={getContentValue(contentMap, descKey, pillar.description)}
                      label={`Trust Pillar ${index + 1} Description`}
                      className="text-slate-600 text-sm md:text-base leading-relaxed"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Certifications Strip */}
      <section className="py-16 bg-slate-900 border-t border-slate-800">
        <div className="container mx-auto px-6">
          <EditableText
            as="p"
            contentKey="about.certs.heading"
            value={getContentValue(contentMap, "about.certs.heading", "Our Accreditations & Certifications")}
            label="Certifications Strip Heading"
            className="text-center text-slate-400 font-medium text-sm tracking-widest uppercase mb-10"
          />
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24">
            <EditableImage
              settingField="aboutCertIso"
              src={settings?.aboutCertIso || "/iso-certificate.png"}
              alt="ISO 9001:2015"
              label="ISO Certificate Logo"
              className="w-[100px] h-[100px] object-contain"
            />
            <EditableImage
              settingField="aboutCertHym"
              src={settings?.aboutCertHym || "/hym-certificate.png"}
              alt="HYM"
              label="HYM Certificate Logo"
              className="w-[140px] h-[70px] object-contain"
            />
            <EditableImage
              settingField="aboutCertGa"
              src={settings?.aboutCertGa || "/ga-certificate.png"}
              alt="GA Global Accreditation"
              label="GA Global Accreditation Logo"
              className="w-[100px] h-[100px] object-contain"
            />
            <EditableImage
              settingField="aboutCertAscb"
              src={settings?.aboutCertAscb || "/ascb-certificate.png"}
              alt="ASCB Certificate"
              label="ASCB Certificate Logo"
              className="w-[80px] h-[110px] object-contain"
            />
          </div>
        </div>
      </section>

      {/* Reuse Clients and Platforms from Homepage */}
      <Clients content={contentMap} />
    </main>
  );
}
