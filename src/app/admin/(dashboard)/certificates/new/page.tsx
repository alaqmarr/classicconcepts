export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { FileUploader } from "@/components/admin/FileUploader";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { revalidatePath } from "next/cache";

async function createCertificate(formData: FormData) {
  "use server";
  
  const title = (formData.get("title") as string)?.trim();
  const imageUrl = (formData.get("imageUrl") as string)?.trim();
  const issuedBy = (formData.get("issuedBy") as string)?.trim() || null;
  const sortOrder = parseInt(formData.get("sortOrder") as string) || 0;

  if (!title || !imageUrl) {
    throw new Error("Title and Certificate file/image are required.");
  }

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

export default function NewCertificatePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/certificates" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft size={20} className="text-slate-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Add Certificate</h1>
          <p className="text-sm text-slate-500">Upload a certificate document (PDF) or image (PNG, JPG)</p>
        </div>
      </div>

      <form action={createCertificate} className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6 space-y-6 max-w-2xl">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Certificate Title <span className="text-red-500">*</span>
          </label>
          <input 
            type="text" 
            name="title" 
            required 
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3]" 
            placeholder="e.g. ISO 9001:2015 Quality Management" 
          />
        </div>
        
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Issued By (Optional)
          </label>
          <input 
            type="text" 
            name="issuedBy" 
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3]" 
            placeholder="e.g. TUV Rheinland / HYM International" 
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Certificate File / Image (PDF or Image) <span className="text-red-500">*</span>
          </label>
          <FileUploader 
            name="imageUrl" 
            required 
            placeholder="Upload Certificate (PDF, PNG, JPG) to R2 storage or enter URL"
            accept={{
              'application/pdf': ['.pdf'],
              'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.svg'],
            }}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Sort Order (Display priority)
          </label>
          <input 
            type="number" 
            name="sortOrder" 
            defaultValue="0" 
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3]" 
          />
        </div>

        <button type="submit" className="w-full py-4 bg-[#0c1a40] text-white rounded-xl font-bold hover:bg-[#1a295c] transition-colors shadow-md">
          Save Certificate
        </button>
      </form>
    </div>
  );
}
