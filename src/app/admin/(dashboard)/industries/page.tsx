export const dynamic = 'force-dynamic';
import { DeleteForm } from "@/components/admin/DeleteForm";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { FolderTree, Trash2, Plus, Edit2 } from "lucide-react";
import Link from "next/link";

export default async function AdminIndustriesPage() {
  const industries = await prisma.industry.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { products: true } } }
  });

  async function deleteIndustry(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    await prisma.industry.delete({ where: { id } });
    revalidatePath("/admin/industries");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FolderTree className="text-[#0056b3]" />
            Industries
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage product industries</p>
        </div>
        <Link 
          href="/admin/industries/new" 
          className="flex items-center gap-2 px-4 py-2 bg-[#0056b3] text-white font-bold rounded-xl hover:bg-blue-800 transition-colors"
        >
          <Plus size={18} />
          Add Industry
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-bold">
                <th className="p-4">Industry Name</th>
                <th className="p-4">Slug</th>
                <th className="p-4">Products</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {industries.map(industry => (
                <tr key={industry.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {industry.imageUrl ? (
                        <img src={industry.imageUrl} alt={industry.name} className="w-10 h-10 rounded-lg object-cover bg-slate-200" />
                      ) : (
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold ${industry.description || 'bg-slate-300'}`}>
                          {industry.name.charAt(0)}
                        </div>
                      )}
                      <span className="font-bold text-slate-700">{industry.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-slate-500 text-sm">{industry.slug}</td>
                  <td className="p-4 text-slate-500 text-sm font-medium">{industry._count.products}</td>
                  <td className="p-4 text-right flex items-center justify-end gap-2">
                    <Link 
                      href={`/admin/industries/${industry.id}`}
                      className="p-2 text-slate-400 hover:text-[#0056b3] hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={18} />
                    </Link>
                    <DeleteForm action={deleteIndustry}>
                      <input type="hidden" name="id" value={industry.id} />
                      <button type="submit" className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </DeleteForm>
                  </td>
                </tr>
              ))}
              {industries.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">
                    No industries found. Create your first one!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

