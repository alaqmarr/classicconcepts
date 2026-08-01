export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { revalidatePath } from "next/cache";

export default function NewCertificatePage() {
  async function createCertificate(formData: FormData) {
    "use server";
    
    const title = formData.get("title") as string;
    const imageUrl = formData.get("imageUrl") as string;
    const issuedBy = formData.get("issuedBy") as string || null;
    const sortOrder = parseInt(formData.get("sortOrder") as string) || 0;

    await prisma.certificate.create({
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
          <h1 className="text-2xl font-bold text-slate-800">Add Certificate</h1>
          <p className="text-sm text-slate-500">Create a new certificate or award</p>
        </div>
      </div>

      <form action={createCertificate} className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6 space-y-6 max-w-2xl">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Title</label>
          <input type="text" name="title" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3]" placeholder="e.g. ISO 9001:2015" />
        </div>
        
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Issued By (Optional)</label>
          <input type="text" name="issuedBy" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3]" placeholder="e.g. TUV Rheinland" />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Certificate Image</label>
          <ImageUploader name="imageUrl" />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Sort Order</label>
          <input type="number" name="sortOrder" defaultValue="0" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3]" />
        </div>

        <button type="submit" className="w-full py-4 bg-[#0c1a40] text-white rounded-xl font-bold hover:bg-[#1a295c] transition-colors">
          Save Certificate
        </button>
      </form>
    </div>
  );
}
