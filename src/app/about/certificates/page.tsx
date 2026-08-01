import { prisma } from "@/lib/db";
import Image from "next/image";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Certificates & Awards | Classic Concepts",
  description: "View our awards, certifications, and achievements.",
};

export default async function CertificatesPage() {
  const certificates = await prisma.certificate.findMany({
    orderBy: { sortOrder: 'asc' }
  });

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-20">
      <div className="container mx-auto px-4 md:px-8">
        
        {/* Header Section with subtle gradient */}
        <div className="relative mb-16 p-8 md:p-16 rounded-3xl overflow-hidden shadow-sm border border-slate-100 bg-white">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0c1a40]/5 via-transparent to-[#e31837]/5 z-0"></div>
          <div className="relative z-10 max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 tracking-tight mb-4">
              Certificates & Awards
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed">
              We take pride in our commitment to quality and excellence. These certifications are a testament to our dedication to delivering the best products and services.
            </p>
          </div>
        </div>

        {/* Gallery */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {certificates.map((cert) => (
            <div key={cert.id} className="group flex flex-col bg-white rounded-2xl shadow-soft hover:shadow-lg transition-all duration-300 border border-slate-100 overflow-hidden">
              <div className="relative aspect-[4/3] bg-slate-100 w-full overflow-hidden">
                <Image 
                  src={cert.imageUrl} 
                  alt={cert.title} 
                  fill 
                  className="object-contain p-4 group-hover:scale-105 transition-transform duration-500" 
                />
              </div>
              <div className="p-6 flex flex-col flex-grow justify-between bg-gradient-to-b from-transparent to-slate-50/50">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-1">{cert.title}</h3>
                  {cert.issuedBy && <p className="text-sm text-slate-500">{cert.issuedBy}</p>}
                </div>
              </div>
            </div>
          ))}
          
          {certificates.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-500 bg-white rounded-2xl border border-slate-100">
              Check back later for our latest certifications.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
