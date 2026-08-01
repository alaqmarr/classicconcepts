import { prisma } from "@/lib/db";
import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";
import { FileText, Link as LinkIcon, Video, Download } from "lucide-react";

export const metadata: Metadata = {
  title: "Resources | Classic Concepts",
  description: "Downloadable resources, catalogs, and useful links.",
};

export default async function ResourcesPage() {
  const resources = await prisma.resource.findMany({
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
              Resources
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed">
              Explore our collection of catalogs, guides, and videos to help you find the perfect solutions for your needs.
            </p>
          </div>
        </div>

        {/* Resources Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {resources.map((res) => (
            <a 
              key={res.id} 
              href={res.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start p-6 bg-white rounded-2xl shadow-soft hover:shadow-lg transition-all duration-300 border border-slate-100 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-transparent to-slate-50/80 z-0"></div>
              
              <div className="relative z-10 flex gap-5 w-full">
                {/* Icon or Thumbnail */}
                <div className="flex-shrink-0">
                  {res.thumbnailUrl ? (
                    <div className="w-16 h-16 relative rounded-xl overflow-hidden bg-slate-100 shadow-sm">
                      <Image src={res.thumbnailUrl} alt={res.title} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center shadow-sm ${
                      res.type === 'PDF' ? 'bg-red-50 text-red-500' :
                      res.type === 'Video' ? 'bg-purple-50 text-purple-500' :
                      'bg-blue-50 text-blue-500'
                    }`}>
                      {res.type === 'PDF' ? <FileText size={28} /> : res.type === 'Video' ? <Video size={28} /> : <LinkIcon size={28} />}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col justify-center">
                  <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-[#0056b3] transition-colors">{res.title}</h3>
                  {res.description && (
                    <p className="text-sm text-slate-500 line-clamp-2 mb-3">{res.description}</p>
                  )}
                  <div className="flex items-center text-xs font-semibold uppercase tracking-wider text-[#0056b3] mt-auto">
                    {res.type === 'PDF' ? (
                      <span className="flex items-center gap-1"><Download size={14} /> Download PDF</span>
                    ) : res.type === 'Video' ? (
                      <span className="flex items-center gap-1">Watch Video</span>
                    ) : (
                      <span className="flex items-center gap-1">Visit Link</span>
                    )}
                  </div>
                </div>
              </div>
            </a>
          ))}
          
          {resources.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-500 bg-white rounded-2xl border border-slate-100">
              No resources available at the moment.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
