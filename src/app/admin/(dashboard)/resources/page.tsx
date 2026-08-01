export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Plus, Trash2, Edit, FileText, Link as LinkIcon, Video } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default async function ResourcesPage() {
  const resources = await prisma.resource.findMany({
    orderBy: { sortOrder: 'asc' }
  });

  async function deleteResource(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    await prisma.resource.delete({ where: { id } });
    revalidatePath("/admin/resources");
    revalidatePath("/resources");
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Resources</h1>
          <p className="text-sm text-slate-500">Manage downloadable files, links, and videos</p>
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
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Thumbnail</th>
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Title</th>
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {resources.map((res) => (
              <tr key={res.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="py-4 px-6">
                  {res.thumbnailUrl ? (
                    <div className="w-16 h-16 relative rounded-md overflow-hidden bg-slate-100 border border-slate-200">
                      <Image src={res.thumbnailUrl} alt={res.title} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                      {res.type === 'PDF' ? <FileText /> : res.type === 'Video' ? <Video /> : <LinkIcon />}
                    </div>
                  )}
                </td>
                <td className="py-4 px-6 font-medium text-slate-800">
                  <div>{res.title}</div>
                  {res.description && <div className="text-xs text-slate-500 mt-1 line-clamp-1">{res.description}</div>}
                </td>
                <td className="py-4 px-6">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    res.type === 'PDF' ? 'bg-red-100 text-red-700' :
                    res.type === 'Video' ? 'bg-purple-100 text-purple-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {res.type === 'PDF' ? <FileText size={12} /> : res.type === 'Video' ? <Video size={12} /> : <LinkIcon size={12} />}
                    {res.type}
                  </span>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center justify-end gap-3">
                    <Link 
                      href={`/admin/resources/${res.id}`}
                      className="p-2 text-slate-400 hover:text-[#0056b3] transition-colors"
                    >
                      <Edit size={18} />
                    </Link>
                    <form action={deleteResource}>
                      <input type="hidden" name="id" value={res.id} />
                      <button 
                        type="submit" 
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                        onClick={(e) => {
                          if(!confirm('Delete this resource?')) e.preventDefault();
                        }}
                      >
                        <Trash2 size={18} />
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {resources.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-500">
                  No resources added yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
