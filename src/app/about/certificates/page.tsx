export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/db";
import { Metadata } from "next";
import { FileText, ExternalLink, ArrowUpRight, Award, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { isPdfUrl } from "@/lib/media-utils";

export const metadata: Metadata = {
  title: "Certificates & Awards - Classic Concepts",
  description: "View our ISO certifications, government accreditations, and quality awards.",
};

export default async function CertificatesPage() {
  const certificates = await prisma.certificate.findMany({
    orderBy: { sortOrder: 'asc' }
  });

  return (
    <main className="min-h-screen bg-[#fafbfc] flex flex-col">
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "About Us", href: "/about" },
          { label: "Certificates & Awards" }
        ]}
        title={
          <>
            Our Accreditations &amp; <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Certifications</span>
          </>
        }
        description="We take immense pride in our commitment to quality, engineering excellence, and international compliance."
      />

      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 md:px-8 max-w-7xl">
          
          {/* Trust Banner */}
          <div className="mb-12 bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-soft flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0056b3] flex items-center justify-center shrink-0">
                <ShieldCheck size={32} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Certified Excellence</h2>
                <p className="text-slate-500 text-sm">Every certification reflects our stringent adherence to global manufacturing standards.</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Verified Credentials
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                Official Documentation
              </span>
            </div>
          </div>

          {/* Certificates Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
            {certificates.map((cert) => {
              const isPdf = isPdfUrl(cert.imageUrl);

              return (
                <a 
                  key={cert.id}
                  href={cert.imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col bg-white rounded-2xl shadow-soft hover:shadow-xl transition-all duration-300 border border-slate-200/80 overflow-hidden transform hover:-translate-y-1"
                >
                  {/* Media Container */}
                  <div className="relative aspect-[4/3] bg-slate-50 w-full overflow-hidden border-b border-slate-100 flex items-center justify-center">
                    {isPdf ? (
                      <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-red-50/50 via-slate-50 to-red-50/30">
                        <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-red-100 flex items-center justify-center text-red-500 mb-2 group-hover:scale-110 transition-transform duration-300">
                          <FileText size={36} />
                        </div>
                        <span className="text-xs font-bold text-red-600 bg-red-100/70 px-2.5 py-0.5 rounded-full border border-red-200/60">
                          PDF Document
                        </span>
                      </div>
                    ) : cert.imageUrl ? (
                      <div className="relative w-full h-full p-4 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={cert.imageUrl} 
                          alt={cert.title} 
                          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500" 
                          loading="lazy" 
                        />
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <Award size={48} />
                      </div>
                    )}
                  </div>

                  {/* Card Details */}
                  <div className="p-6 flex flex-col flex-grow justify-between bg-white">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="text-base font-bold text-slate-800 group-hover:text-[#0056b3] transition-colors leading-snug line-clamp-2">
                          {cert.title}
                        </h3>
                        <ArrowUpRight size={18} className="text-slate-400 group-hover:text-[#0056b3] shrink-0 transition-colors transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </div>
                      {cert.issuedBy && (
                        <p className="text-xs text-slate-500 mt-1 font-medium">
                          Issued by: <span className="text-slate-700">{cert.issuedBy}</span>
                        </p>
                      )}
                    </div>

                    <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#0056b3] flex items-center gap-1.5">
                        {isPdf ? (
                          <>
                            <FileText size={14} className="text-red-500" />
                            <span>Open Certificate PDF</span>
                          </>
                        ) : (
                          <>
                            <ExternalLink size={14} />
                            <span>View Full Certificate</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </a>
              );
            })}
            
            {certificates.length === 0 && (
              <div className="col-span-full py-16 text-center text-slate-500 bg-white rounded-3xl border border-slate-200/80 shadow-soft">
                <Award size={48} className="mx-auto text-slate-300 mb-3" />
                <h3 className="text-lg font-bold text-slate-700 mb-1">Certificates being updated</h3>
                <p className="text-sm text-slate-400">Please check back shortly or contact our team for official accreditations.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
