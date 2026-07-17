import { Diamond, Package, PenTool, Play } from "lucide-react";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { getYouTubeEmbedUrl } from "@/lib/youtube";

export async function WhyChooseUs() {
  const settings = await prisma.siteSetting.findUnique({ where: { id: "default" } });
  return (
    <section className="bg-white py-24 relative overflow-hidden">
      {/* Decorative BG element */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-slate-50 rounded-full blur-3xl opacity-50 translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>

      <div className="container mx-auto px-4 md:px-8 relative z-10">
        
        {/* Why Choose Us */}
        <div className="mb-32">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight mb-4">
              Why Choose <span className="text-[#0056b3]">Classic Concepts</span>
            </h2>
            <p className="text-slate-500 font-medium max-w-xl mx-auto">We bring decades of experience, unmatched quality, and true value to every product we manufacture.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center p-8 rounded-2xl bg-white border border-slate-100 shadow-soft hover:shadow-hover hover:-translate-y-2 transition-all duration-300 group">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-[#0056b3] mb-8 group-hover:scale-110 group-hover:bg-[#0056b3] group-hover:text-white transition-all duration-300">
                <Diamond size={28} />
              </div>
              <h3 className="text-xl font-extrabold text-slate-800 mb-4">Competitive Pricing</h3>
              <p className="text-slate-500 text-sm leading-loose">
                Get the most out of your budget with our competitive pricing. Shop now and enjoy quality products affordably.
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center p-8 rounded-2xl bg-white border border-slate-100 shadow-soft hover:shadow-hover hover:-translate-y-2 transition-all duration-300 group">
              <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center text-[#e31837] mb-8 group-hover:scale-110 group-hover:bg-[#e31837] group-hover:text-white transition-all duration-300">
                <Package size={28} />
              </div>
              <h3 className="text-xl font-extrabold text-slate-800 mb-4">Quality Products</h3>
              <p className="text-slate-500 text-sm leading-loose">
                Discover our selection of premium quality products that exceed your expectations. Enjoy the best in class items products.
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center p-8 rounded-2xl bg-white border border-slate-100 shadow-soft hover:shadow-hover hover:-translate-y-2 transition-all duration-300 group">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-[#0056b3] mb-8 group-hover:scale-110 group-hover:bg-[#0056b3] group-hover:text-white transition-all duration-300">
                <PenTool size={28} />
              </div>
              <h3 className="text-xl font-extrabold text-slate-800 mb-4">Value for Money</h3>
              <p className="text-slate-500 text-sm leading-loose">
                Maximize your buying power with our value-packed products at affordable prices. Shop now and save more.
              </p>
            </div>
          </div>
        </div>

        {/* How We Do It */}
        <div className="flex flex-col md:flex-row items-center gap-16 glass-card p-10 md:p-16 rounded-3xl border border-slate-200 shadow-soft relative overflow-hidden">
          {/* subtle mesh background */}
          <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-50 to-blue-50/50 z-0"></div>

          <div className="w-full md:w-1/2 relative z-10">
            <div className="inline-block px-3 py-1 bg-red-100 text-[#e31837] text-xs font-bold uppercase tracking-wider rounded-full mb-4">Behind the Scenes</div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-8 tracking-tight">How We Do It?</h2>
            <div className="text-slate-600 space-y-6 text-[15px] leading-loose font-medium">
              <p>
                At Classic Concepts, we utilize innovative technologies and employ a highly qualified team of engineers to design podiums and other acrylic products.
              </p>
              <p>
                Our Acrylic products are crafted with the utmost attention to detail, ensuring they are durable and easy to handle. We also pride ourselves on our competitive pricing and elegant finish, providing exceptional value to our customers.
              </p>
              <p>
                We are committed to delivering quality products and offer quick after-sales services, ensuring that our clients are always satisfied. Our passion for designing winning solutions and customer satisfaction is what sets us apart from our competitors.
              </p>
            </div>
          </div>
          
          <div className="w-full md:w-1/2 flex justify-center relative z-10">
            {settings?.homeVideoUrl ? (
              <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
                <iframe 
                  src={getYouTubeEmbedUrl(settings.homeVideoUrl) || ''} 
                  title="How We Do It Video" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen
                  className="absolute inset-0 w-full h-full border-0"
                ></iframe>
              </div>
            ) : (
              <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl group cursor-pointer">
                <Image
                  src="https://via.placeholder.com/600x450?text=Manufacturing+Process"
                  alt="How We Do It Video"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  unoptimized
                />
                <div className="absolute inset-0 bg-slate-900/20 group-hover:bg-slate-900/10 transition-colors"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-[#e31837] shadow-xl group-hover:scale-110 group-hover:bg-[#e31837] group-hover:text-white transition-all duration-300">
                      <Play size={32} className="ml-2" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </section>
  );
}
