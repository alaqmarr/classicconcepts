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

export default async function EditResourcePage({ params }: Props) {
  const { id } = await params;
  const resource = await prisma.resource.findUnique({ where: { id } });

  if (!resource) notFound();

  async function updateResource(formData: FormData) {
    "use server";
    
    const title = formData.get("title") as string;
    const description = formData.get("description") as string || null;
    const fileUrl = formData.get("fileUrl") as string;
    const type = formData.get("type") as string;
    const thumbnailUrl = formData.get("thumbnailUrl") as string || null;
    const sortOrder = parseInt(formData.get("sortOrder") as string) || 0;

    await prisma.resource.update({
      where: { id },
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/resources" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft size={20} className="text-slate-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Edit Resource</h1>
          <p className="text-sm text-slate-500">Update resource details</p>
        </div>
      </div>

      <form action={updateResource} className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6 space-y-6 max-w-2xl">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Title</label>
          <input type="text" name="title" defaultValue={resource.title} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3]" />
        </div>
        
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Description (Optional)</label>
          <textarea name="description" defaultValue={resource.description || ""} rows={3} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3]" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Resource Type</label>
            <select name="type" defaultValue={resource.type} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3]">
              <option value="PDF">PDF Document</option>
              <option value="Link">External Link</option>
              <option value="Video">Video Link</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">File URL / Link</label>
            <input type="url" name="fileUrl" defaultValue={resource.fileUrl} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3]" placeholder="https://..." />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Thumbnail Image (Optional)</label>
          <ImageUploader name="thumbnailUrl" defaultValue={resource.thumbnailUrl || ""} />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Sort Order</label>
          <input type="number" name="sortOrder" defaultValue={resource.sortOrder} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3]" />
        </div>

        <button type="submit" className="w-full py-4 bg-[#0c1a40] text-white rounded-xl font-bold hover:bg-[#1a295c] transition-colors">
          Update Resource
        </button>
      </form>
    </div>
  );
}
