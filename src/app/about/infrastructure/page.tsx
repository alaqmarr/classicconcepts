import { prisma } from "@/lib/db";
import Image from "next/image";
import { PageHeader } from "@/components/layout/PageHeader";
import { getYouTubeEmbedUrl } from "@/lib/youtube";

export const metadata = {
  title: "Our Infrastructure - Classic Concepts",
  description: "Take a tour of our state-of-the-art manufacturing facilities and showrooms across India.",
};

export default async function OurInfrastructurePage() {
  const settings = await prisma.siteSetting.findUnique({ where: { id: "default" } });
  
  const locations = await prisma.infrastructureLocation.findMany({
    orderBy: { sortOrder: 'asc' }
  });

  return (
    <main className="min-h-screen bg-white">
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "About Us", href: "/about" },
          { label: "Infrastructure" }
        ]}
        title={
          <>
            Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Infrastructure</span>
          </>
        }
      />

      <div className="container mx-auto px-6 py-12 space-y-16">
        
        {/* Business Model and Initial Approach */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-800">Business Model</h2>
            <p className="text-slate-600 text-[15px] leading-relaxed">
              Based on the fundamental principle of creating value to the end customer by using innovative methodologies for designing Acrylic solutions and conceptualizing client requirements to provide customized products & items, thus sustaining ourselves by generating profits.
            </p>
          </div>
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-800">Our Initial Approach</h2>
            <div className="text-slate-600 text-[15px] leading-relaxed space-y-2">
              <p>Our initial discovery phase was focused as a conservative approach.</p>
              <p>The soft launch at Deccan States Expo - HICC Novotel, Hyderabad was a carefully calibrated & calculated approach designed to help us gain a dip-stick view of our target audience.</p>
            </div>
          </div>
        </div>

        {/* Go-to-market Strategy */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-800">Redefined Go-2-Market Strategy</h2>
          <div className="text-slate-600 text-[15px] leading-relaxed space-y-4">
            <p>
              During our initial concept design & project planning phase in 2008 our strategy was formulated to align our products and solutions to the lifestyle sector only. Acrylic Furniture items constituted a major part of our display products at the soft launch at Novotel Lifestyle Exhibition, Hyderabad. The exhibition forum gave us a dip stick analysis of varied customers buying patterns, also gave us an opportunity to check the pulse of our potential market/ target audience, and a ready chance to influence their perceptions/ perspectives of Acrylic products and solutions.
            </p>
            <p>
              Based on these learning's from our Soft launch - we decided to redefine our Go-2-Market Strategy according to changing industry trends and market conditions. This was our defining moment that lead us to the firm conviction that Classic Concepts would offer a full suite of end-2-end Acrylic solutions encompassing,
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 pt-4 pl-4 md:pl-8 list-disc">
              <ul className="list-disc space-y-3">
                <li>Furniture items</li>
                <li>News Studio (Design, Erection & Fabrication)</li>
                <li>Mementos, Gifts</li>
                <li>Packaging Items</li>
                <li>Rewards & Awards products</li>
              </ul>
              <ul className="list-disc space-y-3">
                <li>Jewelry boxes</li>
                <li>Interior decoration items</li>
                <li>Advertising and Display boards</li>
                <li>Podiums and a range of other customized products.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* YouTube Video Embed */}
        <div className="w-full max-w-4xl mx-auto flex justify-center py-8">
          <div className="rounded-3xl overflow-hidden shadow-2xl border border-slate-200 bg-slate-900 aspect-video relative group">
             <iframe 
               width="100%" 
               height="100%" 
               src={getYouTubeEmbedUrl(settings?.infraVideoUrl || "https://www.youtube.com/embed/dQw4w9WgXcQ") || ''} 
               title="Infrastructure Video" 
               frameBorder="0" 
               allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
               allowFullScreen
               className="relative z-10"
             ></iframe>
          </div>
        </div>

        {/* Dynamic Locations Grid */}
        <div className="py-12 border-t border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {locations.length > 0 ? (
              locations.map((loc) => {
                const Card = (
                  <div className="group bg-white border-2 border-[#0056b3] flex flex-col h-full hover:shadow-lg transition-shadow duration-300">
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
                      <Image 
                        src={loc.imageUrl} 
                        alt={loc.name} 
                        fill 
                        className="object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                    </div>
                    <div className="p-4 text-center bg-white flex-1 flex items-center justify-center">
                      <h3 className="font-bold text-[#0056b3]">{loc.name}</h3>
                    </div>
                  </div>
                );

                if (loc.mapUrl) {
                  return (
                    <a key={loc.id} href={loc.mapUrl} target="_blank" rel="noreferrer" className="block h-full">
                      {Card}
                    </a>
                  );
                }
                
                return <div key={loc.id} className="h-full">{Card}</div>;
              })
            ) : (
              <p className="text-slate-500 col-span-full text-center">No locations added yet.</p>
            )}
          </div>
        </div>

      </div>
    </main>
  );
}
