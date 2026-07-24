export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Globe, ArrowLeft } from "lucide-react";
import Link from "next/link";
import slugify from "slugify";
import { SubmitForm } from "@/components/admin/SubmitForm";

export default function NewPlatformPage() {
  async function createPlatform(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    const storeUrl = formData.get("storeUrl") as string;
    const storeRegion = formData.get("storeRegion") as string;
    const iconName = formData.get("iconName") as string;
    const colorClass = formData.get("colorClass") as string;
    const generatedId = slugify(name, { lower: true, strict: true });

    await prisma.onlinePlatform.create({
      data: { id: generatedId, name, storeUrl, storeRegion, iconName, colorClass: colorClass || null }
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
            <Globe className="text-[#0056b3]" />
            Add New Platform
          </h1>
          <p className="text-sm text-slate-500 mt-1">Add a new e-commerce platform where you sell</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6">
        <SubmitForm action={createPlatform} className="space-y-6" successMessage="Platform created!">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Platform Name</label>
            <input type="text" name="name" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white transition-all text-sm" placeholder="e.g. Amazon" />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Store URL</label>
            <input type="url" name="storeUrl" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white transition-all text-sm" placeholder="e.g. https://amazon.in/store/classicconcepts" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Store Region</label>
            <input type="text" name="storeRegion" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white transition-all text-sm" placeholder="e.g. India" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Icon Letter</label>
              <input type="text" name="iconName" required maxLength={2} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white transition-all text-sm" placeholder="e.g. A" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Color Class (Tailwind)</label>
              <input type="text" name="colorClass" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white transition-all text-sm" placeholder="e.g. bg-blue-500 text-white" />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <button type="submit" className="px-8 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-colors">
               Save Platform
            </button>
          </div>
        </SubmitForm>
      </div>
    </div>
  );
}

