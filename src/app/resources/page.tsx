export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/db";
import { Metadata } from "next";
import { FileText, Link as LinkIcon, Video, Download, ArrowUpRight, FolderOpen } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { isImageUrl } from "@/lib/media-utils";

export const metadata: Metadata = {
  title: "Resources & Downloads - Classic Concepts",
  description: "Downloadable product catalogs, brochures, guides, and corporate resources.",
};

export default async function ResourcesPage() {
  const resources = await prisma.resource.findMany({
    orderBy: { sortOrder: 'asc' }
  });

  return (
    <main className="min-h-screen bg-[#fafbfc] flex flex-col">
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Resources & Downloads" }
        ]}
        title={
          <>
            Catalogs &amp; <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Downloads</span>
          </>
        }
        description="Access our official product brochures, technical specifications, design guides, and company documentation."
      />

      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 md:px-8 max-w-7xl">
          
          {/* Resources Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {resources.map((res) => {
              const hasValidThumbnail = res.thumbnailUrl && isImageUrl(res.thumbnailUrl);

              return (
                <a 
                  key={res.id} 
                  href={res.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col justify-between p-6 bg-white rounded-2xl shadow-soft hover:shadow-xl transition-all duration-300 border border-slate-200/80 relative overflow-hidden transform hover:-translate-y-1"
                >
                  <div className="flex gap-4 items-start w-full">
                    {/* Icon or Thumbnail */}
                    <div className="flex-shrink-0">
                      {hasValidThumbnail ? (
                        <div className="w-16 h-16 relative rounded-2xl overflow-hidden bg-slate-100 shadow-xs border border-slate-200/60">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={res.thumbnailUrl!} 
                            alt={res.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                            loading="lazy" 
                          />
                        </div>
                      ) : (
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-xs border transition-colors ${
                          res.type === 'PDF' ? 'bg-red-50 text-red-500 border-red-100 group-hover:bg-red-100/70' :
                          res.type === 'Video' ? 'bg-purple-50 text-purple-600 border-purple-100 group-hover:bg-purple-100/70' :
                          'bg-blue-50 text-blue-600 border-blue-100 group-hover:bg-blue-100/70'
                        }`}>
                          {res.type === 'PDF' ? <FileText size={28} /> : res.type === 'Video' ? <Video size={28} /> : <LinkIcon size={28} />}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <h3 className="text-base font-bold text-slate-800 group-hover:text-[#0056b3] transition-colors leading-snug line-clamp-2">
                          {res.title}
                        </h3>
                        <ArrowUpRight size={16} className="text-slate-400 group-hover:text-[#0056b3] shrink-0 transition-colors transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </div>
                      {res.description && (
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mt-1">{res.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Footer Link / Badge */}
                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      res.type === 'PDF' ? 'bg-red-50 text-red-700 border border-red-100' :
                      res.type === 'Video' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                      'bg-blue-50 text-blue-700 border border-blue-100'
                    }`}>
                      {res.type === 'PDF' ? <FileText size={12} /> : res.type === 'Video' ? <Video size={12} /> : <LinkIcon size={12} />}
                      {res.type}
                    </span>

                    <span className="text-[#0056b3] flex items-center gap-1 group-hover:underline">
                      {res.type === 'PDF' ? (
                        <>
                          <Download size={13} />
                          <span>Download PDF</span>
                        </>
                      ) : res.type === 'Video' ? (
                        <span>Watch Video</span>
                      ) : (
                        <span>Visit Link</span>
                      )}
                    </span>
                  </div>
                </a>
              );
            })}
            
            {resources.length === 0 && (
              <div className="col-span-full py-16 text-center text-slate-500 bg-white rounded-3xl border border-slate-200/80 shadow-soft">
                <FolderOpen size={48} className="mx-auto text-slate-300 mb-3" />
                <h3 className="text-lg font-bold text-slate-700 mb-1">Resources being updated</h3>
                <p className="text-sm text-slate-400">Our catalogs and downloads will be available shortly. Contact us for direct assistance.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
