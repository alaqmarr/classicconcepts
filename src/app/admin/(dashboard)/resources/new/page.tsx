export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { FileUploader } from "@/components/admin/FileUploader";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { revalidatePath } from "next/cache";

async function createResource(formData: FormData) {
  "use server";
  
  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const fileUrl = (formData.get("fileUrl") as string)?.trim();
  const type = (formData.get("type") as string) || "PDF";
  const thumbnailUrl = (formData.get("thumbnailUrl") as string)?.trim() || null;
  const sortOrder = parseInt(formData.get("sortOrder") as string) || 0;

  if (!title || !fileUrl) {
    throw new Error("Title and Resource File/URL are required.");
  }

  await prisma.resource.create({
    data: {
      title,
      description,
      fileUrl,
      type,
      thumbnailUrl,
      sortOrder
    }
  });

  revalidatePath("/admin/resources");
  revalidatePath("/resources");
  redirect("/admin/resources");
}

export default function NewResourcePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/resources" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft size={20} className="text-slate-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Add Resource</h1>
          <p className="text-sm text-slate-500">Upload a PDF catalog, brochure, image, document, or link</p>
        </div>
      </div>

      <form action={createResource} className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6 space-y-6 max-w-2xl">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input type="text" name="title" required placeholder="e.g. Classic Concepts Product Catalog 2026" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3]" />
        </div>
        
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Description (Optional)</label>
          <textarea name="description" rows={3} placeholder="Short summary of this resource..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3]" />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Resource Type</label>
          <select name="type" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3]">
            <option value="PDF">PDF Document / Catalog</option>
            <option value="Image">Image / Brochure</option>
            <option value="Document">Document (Word / Excel / ZIP)</option>
            <option value="Video">Video</option>
            <option value="Link">External Link</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Resource File / Link <span className="text-red-500">*</span>
          </label>
          <FileUploader name="fileUrl" required />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Cover Thumbnail Image (Optional)</label>
          <ImageUploader name="thumbnailUrl" />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Sort Order</label>
          <input type="number" name="sortOrder" defaultValue="0" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3]" />
        </div>

        <button type="submit" className="w-full py-4 bg-[#0c1a40] text-white rounded-xl font-bold hover:bg-[#1a295c] transition-colors shadow-md">
          Save Resource
        </button>
      </form>
    </div>
  );
}
