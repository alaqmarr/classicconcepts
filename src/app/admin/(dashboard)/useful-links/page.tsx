import { DeleteForm } from "@/components/admin/DeleteForm";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Plus, Edit, Trash2, Link2, ExternalLink } from "lucide-react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export default async function UsefulLinksPage() {
  const links = await prisma.usefulLink.findMany({
    orderBy: { sortOrder: 'asc' }
  });

  async function deleteLink(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    await prisma.usefulLink.delete({ where: { id } });
    revalidatePath("/admin/useful-links");
    revalidatePath("/");
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <Link2 className="text-[#0056b3]" /> Useful Links
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Manage the links that appear in the navbar dropdown.</p>
        </div>
        <Link 
          href="/admin/useful-links/new" 
          className="flex items-center gap-2 bg-[#0056b3] text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-800 transition-all shadow-sm hover:shadow"
        >
          <Plus size={18} /> Add Link
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {links.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Link2 size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">No links found</p>
            <p className="text-sm mt-1">Click "Add Link" to create one.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 font-bold text-slate-600 text-sm">Title</th>
                <th className="p-4 font-bold text-slate-600 text-sm">URL</th>
                <th className="p-4 font-bold text-slate-600 text-sm">Order</th>
                <th className="p-4 font-bold text-slate-600 text-sm">Status</th>
                <th className="p-4 font-bold text-slate-600 text-sm text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {links.map((link) => (
                <tr key={link.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-bold text-slate-800">{link.title}</td>
                  <td className="p-4 text-slate-600 text-sm flex items-center gap-2">
                    <span className="truncate max-w-[200px]">{link.url}</span>
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700">
                      <ExternalLink size={14} />
                    </a>
                  </td>
                  <td className="p-4 text-slate-600">{link.sortOrder}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-bold ${link.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {link.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-4 flex gap-3 justify-end">
                    <Link href={`/admin/useful-links/${link.id}`} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Edit size={18} />
                    </Link>
                    <DeleteForm action={deleteLink}>
                      <input type="hidden" name="id" value={link.id} />
                      <button type="submit" className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </DeleteForm>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
