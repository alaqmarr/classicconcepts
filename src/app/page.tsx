import { Hero } from "@/components/home/Hero";
import { AboutSnippet } from "@/components/home/AboutSnippet";
import { ProblemStatements } from "@/components/home/ProblemStatements";
import { Industries } from "@/components/home/Industries";
import { prisma } from "@/lib/db";
import { WhyChooseUs } from "@/components/home/WhyChooseUs";
import { HowWeDoIt } from "@/components/home/HowWeDoIt";
import { Clients } from "@/components/home/Clients";
import { AvailableOnPlatforms } from "@/components/home/AvailableOnPlatforms";
import { ArrowRight } from "lucide-react";

export const metadata = {
  title: "Classic Concepts - Premium Acrylic Design & Manufacturing",
  description: "Elevate your brand presence with our bespoke acrylic solutions. From high-end retail displays to industrial-grade enclosures.",
};

export default async function Home() {
  const problemStatements = await prisma.problemStatement.findMany({
    include: {
      products: {
        select: {
          name: true
        },
        take: 4
      }
    }
  });
  const industries = await prisma.industry.findMany({
    include: {
      products: {
        select: {
          name: true
        },
        take: 4
      }
    }
  });

  return (
    <div className="min-h-screen">
      <Hero />
      <AboutSnippet />
      <ProblemStatements statements={problemStatements} />
      <Industries industries={industries} />
      <WhyChooseUs />
      <HowWeDoIt />
      <Clients />
      <AvailableOnPlatforms />

      {/* Quick About / Call to Action */}
      <section className="py-24 relative overflow-hidden bg-[#0c1a40]">
        {/* Tri-color Deep Background Mesh */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#9b1539] to-[#0d1f4d] opacity-90"></div>
        <div className="absolute -top-1/2 -right-1/4 w-[150%] h-[150%] bg-gradient-to-br from-[#0c1a40] via-[#8b1538] to-[#142352] rounded-full blur-3xl opacity-80 pointer-events-none z-0"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[80%] h-[80%] bg-[#ffdf00] rounded-full mix-blend-overlay filter blur-[150px] opacity-30 pointer-events-none z-0"></div>

        <div className="container mx-auto px-6 relative z-10 flex flex-col items-center text-center">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-8 text-white tracking-tight leading-tight">
            Ready to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-white">Elevate Your Brand?</span>
          </h2>
          <p className="text-base md:text-lg max-w-2xl text-white/80 mb-12 font-medium leading-relaxed">
            Partner with Classic Concepts for unparalleled quality and innovative design in acrylic manufacturing. Let's bring your vision to life.
          </p>
          <a
            href="/contact"
            className="group flex items-center gap-2 px-10 py-4 rounded-full bg-[#e31837] text-white font-bold text-lg hover:bg-red-700 hover:shadow-hover hover:shadow-red-500/30 transition-all duration-300 transform hover:-translate-y-1"
          >
            Get a Quote Today
            <ArrowRight size={20} className="transform group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
      </section>
    </div>
  );
}
