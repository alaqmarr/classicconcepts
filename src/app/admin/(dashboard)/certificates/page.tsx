export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Plus, Trash2, Edit, FileText, ExternalLink, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { isPdfUrl } from "@/lib/media-utils";
import { DeleteForm } from "@/components/admin/DeleteForm";

async function deleteCertificate(formData: FormData) {
  "use server";
  try {
    const id = formData.get("id") as string;
    if (id) {
      await prisma.certificate.delete({ where: { id } });
      revalidatePath("/admin/certificates");
      revalidatePath("/about/certificates");
    }
  } catch (error) {
    console.error("Failed to delete certificate:", error);
  }
}

export default async function CertificatesPage() {
  const certificates = await prisma.certificate.findMany({
    orderBy: { sortOrder: 'asc' }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Certificates &amp; Awards</h1>
          <p className="text-sm text-slate-500">Manage company certifications, ISO awards, and PDF documents</p>
        </div>
        <Link 
          href="/admin/certificates/new" 
          className="flex items-center gap-2 px-4 py-2 bg-[#0c1a40] text-white rounded-lg font-medium hover:bg-[#1a295c] transition-colors"
        >
          <Plus size={18} />
          Add Certificate
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Preview</th>
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Title</th>
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Issued By</th>
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Order</th>
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {certificates.map((cert) => {
              const isPdf = isPdfUrl(cert.imageUrl);

              return (
                <tr key={cert.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6">
                    {isPdf ? (
                      <div className="w-16 h-12 rounded-lg bg-red-50 border border-red-200 flex flex-col items-center justify-center text-red-600 shadow-xs">
                        <FileText size={18} />
                        <span className="text-[9px] font-bold tracking-tight mt-0.5">PDF</span>
                      </div>
                    ) : cert.imageUrl ? (
                      <div className="w-16 h-12 relative rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shadow-xs">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={cert.imageUrl} 
                          alt={cert.title} 
                          className="w-full h-full object-cover" 
                          loading="lazy" 
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                        <ImageIcon size={18} />
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-6 font-semibold text-slate-800">
                    <div>{cert.title}</div>
                    {isPdf && (
                      <span className="inline-block mt-1 text-[11px] font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                        PDF Document
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-slate-500 text-sm">{cert.issuedBy || '-'}</td>
                  <td className="py-4 px-6 text-slate-400 text-sm font-mono">{cert.sortOrder}</td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-end gap-2">
                      {cert.imageUrl && (
                        <a 
                          href={cert.imageUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                          title="View / Download file"
                        >
                          <ExternalLink size={18} />
                        </a>
                      )}
                      <Link 
                        href={`/admin/certificates/${cert.id}`}
                        className="p-2 text-slate-400 hover:text-[#0056b3] transition-colors"
                        title="Edit details"
                      >
                        <Edit size={18} />
                      </Link>
                      <DeleteForm action={deleteCertificate} successMessage="Certificate deleted!">
                        <input type="hidden" name="id" value={cert.id} />
                        <button 
                          type="submit" 
                          className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                          title="Delete certificate"
                        >
                          <Trash2 size={18} />
                        </button>
                      </DeleteForm>
                    </div>
                  </td>
                </tr>
              );
            })}
            {certificates.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-500">
                  <p className="text-base font-semibold text-slate-700 mb-1">No certificates added yet</p>
                  <p className="text-sm text-slate-400">Click &ldquo;Add Certificate&rdquo; above to upload your first certificate image or PDF.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
