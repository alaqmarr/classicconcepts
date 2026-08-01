export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { revalidatePath } from "next/cache";

interface Props {
  params: { id: string };
}

export default async function EditCertificatePage({ params }: Props) {
  const { id } = await params;
  const certificate = await prisma.certificate.findUnique({ where: { id } });

  if (!certificate) notFound();

  async function updateCertificate(formData: FormData) {
    "use server";
    
    const title = formData.get("title") as string;
    const imageUrl = formData.get("imageUrl") as string;
    const issuedBy = formData.get("issuedBy") as string || null;
    const sortOrder = parseInt(formData.get("sortOrder") as string) || 0;

    await prisma.certificate.update({
      where: { id },
      data: {
        title,
        imageUrl,
        issuedBy,
        sortOrder
      }
    });

    revalidatePath("/admin/certificates");
    revalidatePath("/about/certificates");
    redirect("/admin/certificates");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/certificates" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft size={20} className="text-slate-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Edit Certificate</h1>
          <p className="text-sm text-slate-500">Update certificate details</p>
        </div>
      </div>

      <form action={updateCertificate} className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6 space-y-6 max-w-2xl">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Title</label>
          <input type="text" name="title" defaultValue={certificate.title} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3]" />
        </div>
        
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Issued By (Optional)</label>
          <input type="text" name="issuedBy" defaultValue={certificate.issuedBy || ""} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3]" />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Certificate Image</label>
          <ImageUploader name="imageUrl" defaultValue={certificate.imageUrl} />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Sort Order</label>
          <input type="number" name="sortOrder" defaultValue={certificate.sortOrder} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3]" />
        </div>

        <button type="submit" className="w-full py-4 bg-[#0c1a40] text-white rounded-xl font-bold hover:bg-[#1a295c] transition-colors">
          Update Certificate
        </button>
      </form>
    </div>
  );
}
