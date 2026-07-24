export const dynamic = 'force-dynamic';
import { SubmitForm } from "@/components/admin/SubmitForm";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect, notFound } from "next/navigation";
import { Building2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ImageUploader } from "@/components/admin/ImageUploader";

interface Props {
  params: { id: string };
}

export default async function EditClientPage({ params }: Props) {
  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id }
  });

  if (!client) {
    notFound();
  }

  async function updateClient(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    const logoUrl = formData.get("logoUrl") as string;

    await prisma.client.update({
      where: { id },
      data: { name, logoUrl: logoUrl || null }
    });

    revalidatePath("/admin/clients");
    redirect("/admin/clients");
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/admin/clients" className="p-2 bg-white rounded-lg border border-slate-200 text-slate-500 hover:text-[#0056b3] transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="text-[#0056b3]" />
            Edit Client
          </h1>
          <p className="text-sm text-slate-500 mt-1">Updating {client.name}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6">
        <SubmitForm action={updateClient} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Client Name</label>
            <input type="text" name="name" defaultValue={client.name} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white transition-all text-sm" />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Client Logo (Optional)</label>
            <ImageUploader name="logoUrl" defaultValue={client.logoUrl || ""} />
          </div>

          <div className="pt-4 border-t border-slate-100 flex gap-4">
            <button type="submit" className="px-8 py-3 bg-[#0056b3] text-white font-bold rounded-xl hover:bg-blue-800 transition-colors">
              Save Changes
            </button>
            <Link href="/admin/clients" className="px-8 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">
              Cancel
            </Link>
          </div>
        </SubmitForm>
      </div>
    </div>
  );
}
