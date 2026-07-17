import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Target, Award, ShieldCheck, HeartHandshake } from "lucide-react";
import { Clients } from "@/components/home/Clients";
import { PageHeader } from "@/components/layout/PageHeader";

import { prisma } from "@/lib/db";

export default async function AboutPage() {
  const settings = await prisma.siteSetting.findUnique({ where: { id: "default" } });

  return (
    <main className="min-h-screen bg-[#fafbfc] flex flex-col">
      {/* Premium Hero Header */}
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "About Us" }
        ]}
        title={
          <>
            Crafting Excellence in <br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Acrylic Design</span>
          </>
        }
        description="We transform premium acrylic into functional, durable, and visually stunning solutions for modern businesses and retail spaces."
      />

      {/* Intro Section: Exceptional Services */}
      <section className="py-24 bg-[#fafbfc] relative z-20 -mt-8">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            {/* Image Side with Premium Styling */}
            <div className="relative group">
              <div className="absolute -inset-4 bg-gradient-to-tr from-[#0056b3]/20 to-cyan-500/20 rounded-[2.5rem] transform rotate-2 transition-transform duration-700 group-hover:rotate-6 blur-lg opacity-60"></div>
              <div className="relative aspect-[4/3] rounded-[2rem] overflow-hidden shadow-2xl border border-white/50 bg-white">
                <Image 
                  src={settings?.aboutIntroImage || "/butterfly-table.png"} 
                  alt="Acrylic Butterfly Table" 
                  fill
                  className="object-cover transform scale-100 group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent pointer-events-none"></div>
              </div>
              
              {/* Floating Badge */}
              <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-4 animate-bounce-slow">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-[#0056b3]">
                  <Award size={24} />
                </div>
                <div>
                  <p className="font-bold text-slate-800 leading-tight">ISO 9001:2015</p>
                  <p className="text-xs text-slate-500 font-medium">Certified Company</p>
                </div>
              </div>
            </div>

            {/* Text Side */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-[#0056b3] text-sm font-bold tracking-wide">
                <Target size={16} />
                <span>Our Philosophy</span>
              </div>
              
              <h2 className="text-4xl md:text-5xl font-extrabold text-slate-800 leading-tight tracking-tight">
                Exceptional Services at <span className="text-[#0056b3]">Affordable Cost</span>
              </h2>
              
              <div className="space-y-5 text-slate-600 text-lg leading-relaxed font-light">
                <p>
                  At <strong className="font-semibold text-slate-700">Classic Concepts Acrylic Private Limited</strong>, we have built our reputation on providing high-quality Acrylic Products that meet the exacting needs of our customers. Our team of highly qualified engineers is dedicated to utilizing innovative technologies to design products that exceed expectations.
                </p>
                <p>
                  We are committed to delivering the best value by providing competitively priced, durable products with an elegant finish. Our commitment to quality is evident in every aspect of our business—from rigorous quality control processes to quick, reliable after-sales services.
                </p>
                <p>
                  We take immense pride in our ability to create customized solutions that precisely meet your requirements. Our mission is to provide a superior customer experience and deliver products that are designed to last.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#0056b3]">
                    <ShieldCheck size={20} />
                  </div>
                  <span className="font-semibold text-slate-800 text-sm">Rigorous Quality<br/>Control</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#0056b3]">
                    <HeartHandshake size={20} />
                  </div>
                  <span className="font-semibold text-slate-800 text-sm">Quick After-Sales<br/>Service</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ideas That Bring Value Section */}
      <section className="py-24 bg-white relative overflow-hidden border-t border-slate-100">
        <div className="absolute right-0 top-0 w-1/3 h-full bg-blue-50/50 rounded-l-[100px] pointer-events-none transform translate-x-1/2"></div>
        
        <div className="container mx-auto px-6 max-w-4xl text-center space-y-10 relative z-10">
          <div className="inline-flex items-center justify-center space-x-2">
            <span className="w-12 h-[2px] bg-red-500"></span>
            <span className="text-red-500 font-bold uppercase tracking-widest text-sm">Core Objective</span>
            <span className="w-12 h-[2px] bg-red-500"></span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-800 tracking-tight">
            Ideas That Bring Value
          </h2>
          
          <div className="text-slate-600 space-y-6 text-lg leading-relaxed font-light">
            <p>
              We started with the idea to add value to the requirements of our end customers by utilizing innovative technologies for designing podiums and acrylic solutions. We are well-versed in providing tailored solutions that meet your specific needs.
            </p>
            <p>
              Our aim to deliver quality-engineered products—satisfying our customers in every way possible—makes us the market leader when it comes to design. The products we manufacture are durable, easy to handle, competitively priced, and boast an elegant finish.
            </p>
            <p>
              Classic Concepts boasts an ace team of highly qualified engineers dedicated to helping our benevolent clients regarding their queries and providing them with the exact solutions they have been looking for. With every delivery, our packaging and warehouse team of experts ensure that your product reaches you without defects.
            </p>
          </div>
          
          <div className="bg-[#fafbfc] border border-slate-100 rounded-2xl p-8 mt-8 shadow-sm">
            <p className="font-bold text-slate-800 text-xl md:text-2xl leading-relaxed">
              "Our sole objective is to provide a winning design, exactly the one you visualize. Let us know what you are looking for, and we will be happy to create the solution for your needs!"
            </p>
          </div>
        </div>
      </section>

      {/* Certifications Strip */}
      <section className="py-16 bg-slate-900 border-t border-slate-800">
        <div className="container mx-auto px-6">
          <p className="text-center text-slate-400 font-medium text-sm tracking-widest uppercase mb-10">Our Accreditations & Certifications</p>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-70 hover:opacity-100 transition-opacity duration-500 filter grayscale hover:grayscale-0">
            <Image src={settings?.aboutCertIso || "/iso-certificate.png"} alt="ISO 9001:2015" width={100} height={100} className="object-contain" />
            <Image src={settings?.aboutCertHym || "/hym-certificate.png"} alt="HYM" width={140} height={70} className="object-contain" />
            <Image src={settings?.aboutCertGa || "/ga-certificate.png"} alt="GA Global Accreditation" width={100} height={100} className="object-contain" />
            <Image src={settings?.aboutCertAscb || "/ascb-certificate.png"} alt="ASCB Certificate" width={80} height={110} className="object-contain" />
          </div>
        </div>
      </section>

      {/* Reuse Clients and Platforms from Homepage */}
      <Clients />

    </main>
  );
}
