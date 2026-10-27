import Image from "next/image";
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
import { prisma } from "@/lib/db";

export const metadata = {
  title: "About Us | Transforming Ideas into Acrylic Excellence - Classic Concepts",
  description:
    "Over two decades of innovation, precision & manufacturing expertise. Backed by a 16,000 sq. ft. facility, Classic Concepts crafts world-class acrylic products for India and global markets.",
};

const trustPillars = [
  {
    icon: Award,
    title: "Two Decades of Proven Expertise",
    description:
      "With more than 20 years of hands-on experience, we understand the art and science of acrylic manufacturing, delivering solutions that meet diverse industrial and commercial requirements.",
  },
  {
    icon: Cpu,
    title: "Advanced Technology. Exceptional Precision.",
    description:
      "Our manufacturing infrastructure is equipped with modern CNC routers, CO₂ laser cutting machines, diamond polishing equipment, acrylic bending machines, UV printing technology, and specialized fabrication machinery.",
  },
  {
    icon: Sparkles,
    title: "Premium Materials. Superior Finishing.",
    description:
      "We work with carefully selected imported acrylic sheets to achieve outstanding clarity, excellent surface finishes, precise detailing, and long-lasting product quality.",
  },
  {
    icon: Factory,
    title: "16,000 Sq. Ft. of Manufacturing Excellence",
    description:
      "Our extensive production facility enables us to handle everything from individual customized products to large-scale commercial manufacturing requirements.",
  },
  {
    icon: Compass,
    title: "Customized Beyond Imagination",
    description:
      "Have a unique idea? Our team specializes in transforming customer concepts, drawings, and specific requirements into expertly fabricated acrylic products.",
  },
  {
    icon: Globe2,
    title: "Made in India. Trusted Worldwide.",
    description:
      "Serving clients across India and international markets, we bring Indian manufacturing expertise to businesses around the world.",
  },
  {
    icon: ShieldCheck,
    title: "Quality That Speaks for Itself",
    description:
      "We focus on precision fabrication, consistent finishing, careful quality checks, and reliable customer support to ensure that every product reflects our commitment to excellence.",
  },
];

export default async function AboutPage() {
  const settings = await prisma.siteSetting.findUnique({ where: { id: "default" } });

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
        description="Over Two Decades of Innovation, Precision & Manufacturing Expertise"
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
                <Image
                  src={settings?.aboutIntroImage || "/butterfly-table.png"}
                  alt="Classic Concepts Acrylic Manufacturing"
                  fill
                  className="object-cover transform scale-100 group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent pointer-events-none"></div>
              </div>

              {/* Floating Badge */}
              <div className="absolute -bottom-6 -left-4 md:-left-6 bg-white p-5 md:p-6 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-[#0056b3]">
                  <Award size={24} />
                </div>
                <div>
                  <p className="font-bold text-slate-800 leading-tight">ISO 9001:2015</p>
                  <p className="text-xs text-slate-500 font-medium">16,000 Sq. Ft. Facility</p>
                </div>
              </div>
            </div>

            {/* Text Side */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-[#0056b3] text-xs font-bold uppercase tracking-wider">
                <Target size={15} />
                <span>Over Two Decades of Innovation, Precision &amp; Manufacturing Expertise</span>
              </div>

              <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 leading-tight tracking-tight">
                Two Decades of Excellence.{" "}
                <span className="text-[#0056b3]">Endless Possibilities in Acrylic.</span>
              </h2>

              <div className="space-y-4 text-slate-600 text-base md:text-lg leading-relaxed">
                <p>
                  At <strong className="font-bold text-slate-800">Classic Concepts Acrylic Pvt. Ltd.</strong>, we don&apos;t just manufacture acrylic products — we transform ideas into extraordinary creations.
                </p>
                <p>
                  With over 20 years of industry experience, we have established ourselves as a leading name in the acrylic fabrication and signage industry, delivering innovative, high-quality, and customized solutions for businesses, institutions, retailers, and individuals.
                </p>
                <p>
                  Backed by a <strong className="font-semibold text-slate-800">16,000 sq. ft. manufacturing facility</strong>, state-of-the-art machinery, advanced fabrication technologies, and a team of skilled professionals, we bring exceptional craftsmanship and precision to every project.
                </p>
                <p>
                  We use premium imported acrylic sheets and advanced manufacturing processes to create products that combine elegance, durability, functionality, and superior finishing.
                </p>
                <p>
                  From elegant acrylic podiums, luxury display stands, signage, trophies, and customized enclosures to complex acrylic structures, our expertise enables us to turn even the most challenging concepts into reality.
                </p>
                <p>
                  Our manufacturing excellence extends beyond India. We proudly serve customers nationwide and export to international markets, including the <strong className="font-semibold text-slate-800">USA, Canada, Mexico, Australia, South Africa, the UAE</strong>, and other countries.
                </p>
                <p>
                  From concept to creation, every product reflects our passion for quality, innovation, and customer satisfaction.
                </p>
              </div>

              <div className="pt-2">
                <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-[#0056b3] to-blue-700 text-white font-extrabold text-base md:text-lg shadow-md">
                  <CheckCircle2 size={22} className="text-cyan-300 shrink-0" />
                  <span>Your Vision. Our Expertise. Endless Possibilities in Acrylic.</span>
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
              <span className="text-[#e31837] font-bold uppercase tracking-widest text-xs">
                The Classic Concepts Advantage
              </span>
              <span className="w-10 h-[2px] bg-[#e31837]"></span>
            </div>

            <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
              Why Businesses Trust <span className="text-[#0056b3]">Classic Concepts</span>
            </h2>
            <p className="text-slate-600 text-base md:text-lg">
              Combining 20+ years of engineering mastery with cutting-edge fabrication technology.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
            {trustPillars.map((pillar, index) => {
              const Icon = pillar.icon;
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
                    <h3 className="text-xl font-extrabold text-slate-800 leading-snug">
                      {pillar.title}
                    </h3>
                    <p className="text-slate-600 text-sm md:text-base leading-relaxed">
                      {pillar.description}
                    </p>
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
          <p className="text-center text-slate-400 font-medium text-sm tracking-widest uppercase mb-10">
            Our Accreditations &amp; Certifications
          </p>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24">
            <Image
              src={settings?.aboutCertIso || "/iso-certificate.png"}
              alt="ISO 9001:2015"
              width={100}
              height={100}
              className="object-contain"
            />
            <Image
              src={settings?.aboutCertHym || "/hym-certificate.png"}
              alt="HYM"
              width={140}
              height={70}
              className="object-contain"
            />
            <Image
              src={settings?.aboutCertGa || "/ga-certificate.png"}
              alt="GA Global Accreditation"
              width={100}
              height={100}
              className="object-contain"
            />
            <Image
              src={settings?.aboutCertAscb || "/ascb-certificate.png"}
              alt="ASCB Certificate"
              width={80}
              height={110}
              className="object-contain"
            />
          </div>
        </div>
      </section>

      {/* Reuse Clients and Platforms from Homepage */}
      <Clients />
    </main>
  );
}
