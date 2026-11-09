export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Globe, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { SubmitForm } from "@/components/admin/SubmitForm";
import { requireAdminSession } from "@/lib/auth";

export default function NewPlatformPage() {
  async function createPlatform(formData: FormData) {
    "use server";
    await requireAdminSession();

    const name = ((formData.get("name") as string) || "").trim();
    const storeUrl = ((formData.get("storeUrl") as string) || "").trim();
    const storeRegion = ((formData.get("storeRegion") as string) || "").trim();
    const iconName = ((formData.get("iconName") as string) || "").trim();
    const colorClass = ((formData.get("colorClass") as string) || "").trim() || null;

    if (!name || !storeUrl || !storeRegion || !iconName) {
      return { error: "Please fill in all required fields." };
    }

    await prisma.onlinePlatform.create({
      data: { name, storeUrl, storeRegion, iconName, colorClass },
    });

    revalidatePath("/");
    revalidatePath("/admin/clients");
    redirect("/admin/clients");
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/clients"
          className="p-2 bg-white rounded-lg border border-slate-200 text-slate-500 hover:text-[#0056b3] transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Globe className="text-[#0056b3]" />
            Add New Platform
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Add a new e-commerce platform where you sell
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6">
        <SubmitForm
          action={createPlatform}
          className="space-y-6"
          successMessage="Platform created!"
        >
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Platform Name
            </label>
            <input
              type="text"
              name="name"
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white transition-all text-sm"
              placeholder="e.g. Amazon"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Store URL
            </label>
            <input
              type="url"
              name="storeUrl"
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white transition-all text-sm"
              placeholder="e.g. https://amazon.in/store/classicconcepts"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Store Region
            </label>
            <input
              type="text"
              name="storeRegion"
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white transition-all text-sm"
              placeholder="e.g. India"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Icon Name or Letter
              </label>
              <input
                type="text"
                name="iconName"
                required
                maxLength={32}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white transition-all text-sm"
                placeholder="e.g. FaAmazon, SiFlipkart, or A"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Color Class (Tailwind)
              </label>
              <input
                type="text"
                name="colorClass"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white transition-all text-sm"
                placeholder="e.g. bg-amber-500 text-white"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <button
              type="submit"
              className="px-8 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-colors"
            >
              Save Platform
            </button>
          </div>
        </SubmitForm>
      </div>
    </div>
  );
}
