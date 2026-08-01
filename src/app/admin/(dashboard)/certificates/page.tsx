export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Plus, Trash2, Edit } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default async function CertificatesPage() {
  const certificates = await prisma.certificate.findMany({
    orderBy: { sortOrder: 'asc' }
  });

  async function deleteCertificate(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    await prisma.certificate.delete({ where: { id } });
    revalidatePath("/admin/certificates");
    revalidatePath("/about/certificates");
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Certificates</h1>
          <p className="text-sm text-slate-500">Manage your awards and certifications</p>
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
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Image</th>
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Title</th>
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Issued By</th>
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {certificates.map((cert) => (
              <tr key={cert.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="py-4 px-6">
                  <div className="w-16 h-12 relative rounded-md overflow-hidden bg-slate-100 border border-slate-200">
                    <Image src={cert.imageUrl} alt={cert.title} fill className="object-cover" />
                  </div>
                </td>
                <td className="py-4 px-6 font-medium text-slate-800">{cert.title}</td>
                <td className="py-4 px-6 text-slate-500">{cert.issuedBy || '-'}</td>
                <td className="py-4 px-6">
                  <div className="flex items-center justify-end gap-3">
                    <Link 
                      href={`/admin/certificates/${cert.id}`}
                      className="p-2 text-slate-400 hover:text-[#0056b3] transition-colors"
                    >
                      <Edit size={18} />
                    </Link>
                    <form action={deleteCertificate}>
                      <input type="hidden" name="id" value={cert.id} />
                      <button 
                        type="submit" 
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                        onClick={(e) => {
                          if(!confirm('Delete this certificate?')) e.preventDefault();
                        }}
                      >
                        <Trash2 size={18} />
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {certificates.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-500">
                  No certificates added yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
