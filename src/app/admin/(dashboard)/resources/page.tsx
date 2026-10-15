export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Plus, Trash2, Edit, FileText, Link as LinkIcon, Video, ExternalLink } from "lucide-react";
import Link from "next/link";
import { isImageUrl } from "@/lib/media-utils";
import { DeleteForm } from "@/components/admin/DeleteForm";

async function deleteResource(formData: FormData) {
  "use server";
  try {
    const id = formData.get("id") as string;
    if (id) {
      await prisma.resource.delete({ where: { id } });
      revalidatePath("/admin/resources");
      revalidatePath("/resources");
    }
  } catch (error) {
    console.error("Failed to delete resource:", error);
  }
}

export default async function ResourcesPage() {
  const resources = await prisma.resource.findMany({
    orderBy: { sortOrder: 'asc' }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Resources &amp; Downloads</h1>
          <p className="text-sm text-slate-500">Manage downloadable PDF catalogs, product brochures, videos, and links</p>
        </div>
        <Link 
          href="/admin/resources/new" 
          className="flex items-center gap-2 px-4 py-2 bg-[#0c1a40] text-white rounded-lg font-medium hover:bg-[#1a295c] transition-colors"
        >
          <Plus size={18} />
          Add Resource
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Preview</th>
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Title &amp; Description</th>
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Order</th>
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {resources.map((res) => {
              const previewImage =
                res.thumbnailUrl && isImageUrl(res.thumbnailUrl)
                  ? res.thumbnailUrl
                  : isImageUrl(res.fileUrl)
                  ? res.fileUrl
                  : null;

              return (
                <tr key={res.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6">
                    {previewImage ? (
                      <div className="w-14 h-14 relative rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-xs">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={previewImage} 
                          alt={res.title} 
                          className="w-full h-full object-cover" 
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className={`w-14 h-14 rounded-xl border flex items-center justify-center shadow-xs ${
                        res.type === 'PDF' ? 'bg-red-50 text-red-500 border-red-200/60' :
                        res.type === 'Video' ? 'bg-purple-50 text-purple-600 border-purple-200/60' :
                        'bg-blue-50 text-blue-600 border-blue-200/60'
                      }`}>
                        {res.type === 'PDF' ? <FileText size={22} /> : res.type === 'Video' ? <Video size={22} /> : <LinkIcon size={22} />}
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-6 font-medium text-slate-800">
                    <div className="font-semibold text-slate-800">{res.title}</div>
                    {res.description && (
                      <div className="text-xs text-slate-500 mt-0.5 line-clamp-1 max-w-md">{res.description}</div>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      res.type === 'PDF' ? 'bg-red-100 text-red-700' :
                      res.type === 'Video' ? 'bg-purple-100 text-purple-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {res.type === 'PDF' ? <FileText size={12} /> : res.type === 'Video' ? <Video size={12} /> : <LinkIcon size={12} />}
                      {res.type}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-slate-400 text-sm font-mono">{res.sortOrder}</td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-end gap-2">
                      {res.fileUrl && (
                        <a 
                          href={res.fileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                          title="Open resource file / URL"
                        >
                          <ExternalLink size={18} />
                        </a>
                      )}
                      <Link 
                        href={`/admin/resources/${res.id}`}
                        className="p-2 text-slate-400 hover:text-[#0056b3] transition-colors"
                        title="Edit details"
                      >
                        <Edit size={18} />
                      </Link>
                      <DeleteForm action={deleteResource} successMessage="Resource deleted!">
                        <input type="hidden" name="id" value={res.id} />
                        <button 
                          type="submit" 
                          className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                          title="Delete resource"
                        >
                          <Trash2 size={18} />
                        </button>
                      </DeleteForm>
                    </div>
                  </td>
                </tr>
              );
            })}
            {resources.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-500">
                  <p className="text-base font-semibold text-slate-700 mb-1">No resources added yet</p>
                  <p className="text-sm text-slate-400">Click &ldquo;Add Resource&rdquo; to upload catalogs, brochures, or reference links.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
