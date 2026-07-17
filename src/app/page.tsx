import { Hero } from "@/components/home/Hero";
import { AboutSnippet } from "@/components/home/AboutSnippet";
import { ProductCategories } from "@/components/home/ProductCategories";
import { WhyChooseUs } from "@/components/home/WhyChooseUs";
import { Clients } from "@/components/home/Clients";

export const metadata = {
  title: "Classic Concepts - Premium Acrylic Design & Manufacturing",
  description: "Elevate your brand presence with our bespoke acrylic solutions. From high-end retail displays to industrial-grade enclosures.",
};

export default function Home() {
  return (
    <div className="min-h-screen">
      <Hero />
      <AboutSnippet />
      {/* We need Suspense or something if ProductCategories is slow, but Prisma SQLite is fast enough for now */}
      <ProductCategories />
      <WhyChooseUs />
      <Clients />

      {/* Quick About / Call to Action */}
      <section className="py-24 relative overflow-hidden bg-white border-t border-slate-100">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gradient-to-r from-blue-100/50 to-red-100/50 blur-[100px] rounded-full pointer-events-none z-0"></div>

        <div className="container mx-auto px-6 relative z-10 flex flex-col items-center text-center">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-8 text-slate-800 tracking-tight">Ready to Elevate Your Brand?</h2>
          <p className="text-lg max-w-2xl text-slate-600 mb-12 font-medium leading-relaxed">
            Partner with Classic Concepts for unparalleled quality and innovative design in acrylic manufacturing. Let's bring your vision to life.
          </p>
          <a
            href="/contact"
            className="px-10 py-4 rounded-xl bg-[#0056b3] text-white font-bold text-lg hover:bg-blue-800 hover:shadow-hover transition-all duration-300 transform hover:-translate-y-1"
          >
            Get a Quote Today
          </a>
        </div>
      </section>
    </div>
  );
}
