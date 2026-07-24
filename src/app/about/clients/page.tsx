import { prisma } from "@/lib/db";
import Image from "next/image";
import Link from "next/link";
import { Award } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata = {
  title: "Our Clients - Classic Concepts",
  description: "Explore the esteemed clients who trust Classic Concepts for their premium acrylic product needs.",
};

export default async function AboutClientsPage() {
  const clients = await prisma.client.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return (
    <main className="min-h-screen bg-[#fafbfc] flex flex-col">
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "About Us", href: "/about" },
          { label: "Our Clients" }
        ]}
        title={
          <>
            Trusted By <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Industry Leaders</span>
          </>
        }
        description="We take pride in our long-standing relationships with some of the most prestigious brands and organizations across India and globally."
      />

      {/* Main Content - Clients Grid */}
      <section className="py-20 relative z-20">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-center gap-3 mb-16">
            <Award className="text-[#0056b3]" size={32} />
            <h2 className="text-3xl font-bold text-slate-800">Our Esteemed Clients</h2>
          </div>

          {clients.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {clients.map((client) => (
                <div 
                  key={client.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 p-6 flex flex-col items-center justify-center gap-4 group"
                >
                  <div className="w-full aspect-[3/2] relative flex items-center justify-center p-2">
                    {client.logoUrl ? (
                      <div className="relative w-full h-full filter grayscale group-hover:grayscale-0 transition-all duration-300">
                        <Image 
                          src={client.logoUrl} 
                          alt={client.name} 
                          fill 
                          className="object-contain" 
                        />
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-50 rounded-xl">
                        <span className="text-xl font-bold text-slate-400 text-center uppercase tracking-wide group-hover:text-[#0056b3] transition-colors">{client.name}</span>
                      </div>
                    )}
                  </div>
                  {client.logoUrl && (
                    <span className="text-sm font-semibold text-slate-600 group-hover:text-[#0056b3] transition-colors text-center">
                      {client.name}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
              <p className="text-slate-500 text-lg">We are currently updating our client portfolio. Check back soon!</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
