import { DeleteForm } from "@/components/admin/DeleteForm";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Building2, Globe, Trash2, Plus } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default async function AdminClientsPage() {
  const clients = await prisma.client.findMany({ orderBy: { createdAt: 'desc' } });
  const platforms = await prisma.onlinePlatform.findMany({ orderBy: { createdAt: 'asc' } });

  async function deleteClient(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    await prisma.client.delete({ where: { id } });
    revalidatePath("/admin/clients");
  }

  async function deletePlatform(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    await prisma.onlinePlatform.delete({ where: { id } });
    revalidatePath("/admin/clients");
  }

  return (
    <div className="space-y-8">
      {/* Clients Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Building2 className="text-[#0056b3]" />
              Clients
            </h1>
            <p className="text-sm text-slate-500 mt-1">Manage your trusted clients</p>
          </div>
          <Link 
            href="/admin/clients/new-client" 
            className="flex items-center gap-2 px-4 py-2 bg-[#0056b3] text-white font-bold rounded-xl hover:bg-blue-800 transition-colors"
          >
            <Plus size={18} />
            Add Client
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-bold">
                  <th className="p-4">Logo</th>
                  <th className="p-4">Name</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clients.map(client => (
                  <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      {client.logoUrl ? (
                         <Image src={client.logoUrl} alt={client.name} width={40} height={40} className="rounded object-contain" />
                      ) : (
                         <div className="w-10 h-10 bg-slate-200 rounded flex items-center justify-center text-slate-400 text-xs">No img</div>
                      )}
                    </td>
                    <td className="p-4 font-bold text-slate-700">{client.name}</td>
                    <td className="p-4 text-right flex items-center justify-end gap-2">
                      <Link href={`/admin/clients/client/${client.id}`} className="text-[#0056b3] hover:underline text-sm font-bold">Edit</Link>
                      <DeleteForm action={deleteClient}>
                        <input type="hidden" name="id" value={client.id} />
                        <button type="submit" className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </DeleteForm>
                    </td>
                  </tr>
                ))}
                {clients.length === 0 && (
                  <tr><td colSpan={3} className="p-8 text-center text-slate-500">No clients found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Online Platforms Section */}
      <div className="space-y-6 pt-8 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Globe className="text-[#0056b3]" />
              Online Platforms
            </h1>
            <p className="text-sm text-slate-500 mt-1">Manage e-commerce platforms where you sell</p>
          </div>
          <Link 
            href="/admin/clients/new-platform" 
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-colors"
          >
            <Plus size={18} />
            Add Platform
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-bold">
                  <th className="p-4">Logo</th>
                  <th className="p-4">Name & URL</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {platforms.map(platform => (
                  <tr key={platform.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      {/* For platforms we use iconName or colorClass instead of images in our schema, but keeping layout consistent */}
                      <div className={`w-10 h-10 ${platform.colorClass || 'bg-slate-200'} rounded flex items-center justify-center text-white text-xs`}>
                        {platform.iconName || 'P'}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-700">{platform.name}</div>
                      {platform.storeUrl && <a href={platform.storeUrl} target="_blank" className="text-xs text-blue-500 hover:underline">{platform.storeUrl}</a>}
                    </td>
                    <td className="p-4 text-right flex items-center justify-end gap-2">
                      <Link href={`/admin/clients/platform/${platform.id}`} className="text-[#0056b3] hover:underline text-sm font-bold">Edit</Link>
                      <DeleteForm action={deletePlatform}>
                        <input type="hidden" name="id" value={platform.id} />
                        <button type="submit" className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </DeleteForm>
                    </td>
                  </tr>
                ))}
                {platforms.length === 0 && (
                  <tr><td colSpan={3} className="p-8 text-center text-slate-500">No platforms found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
