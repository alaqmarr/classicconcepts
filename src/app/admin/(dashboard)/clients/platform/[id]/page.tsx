export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect, notFound } from "next/navigation";
import { Globe, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { SubmitForm } from "@/components/admin/SubmitForm";
import { requireAdminSession } from "@/lib/auth";
import { invalidateCacheTags } from "@/lib/redis-cache";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditPlatformPage({ params }: Props) {
  const { id } = await params;
  const platform = await prisma.onlinePlatform.findUnique({
    where: { id },
  });

  if (!platform) {
    notFound();
  }

  async function updatePlatform(formData: FormData) {
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

    await prisma.onlinePlatform.update({
      where: { id },
      data: { name, storeUrl, storeRegion, iconName, colorClass },
    });

    await invalidateCacheTags(["brand", "settings", "ai-snapshot"]);
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
            Edit Platform
          </h1>
          <p className="text-sm text-slate-500 mt-1">Updating {platform.name}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6">
        <SubmitForm
          action={updatePlatform}
          className="space-y-6"
          successMessage="Platform updated!"
        >
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Platform Name
            </label>
            <input
              type="text"
              name="name"
              defaultValue={platform.name}
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Store URL
            </label>
            <input
              type="url"
              name="storeUrl"
              defaultValue={platform.storeUrl}
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Store Region
            </label>
            <input
              type="text"
              name="storeRegion"
              defaultValue={platform.storeRegion}
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white transition-all text-sm"
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
                defaultValue={platform.iconName}
                required
                maxLength={32}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Color Class (Tailwind)
              </label>
              <input
                type="text"
                name="colorClass"
                defaultValue={platform.colorClass || ""}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white transition-all text-sm"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex gap-4">
            <button
              type="submit"
              className="px-8 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-colors"
            >
              Save Changes
            </button>
            <Link
              href="/admin/clients"
              className="px-8 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </SubmitForm>
      </div>
    </div>
  );
}
