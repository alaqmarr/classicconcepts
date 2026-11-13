export const dynamic = "force-dynamic";

import { SubmitForm } from "@/components/admin/SubmitForm";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { MapPin, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { requireAdminSession } from "@/lib/auth";
import { invalidateCacheTags } from "@/lib/redis-cache";

export default function NewLocationPage() {
  async function createLocation(formData: FormData) {
    "use server";
    await requireAdminSession();

    const name = ((formData.get("name") as string) || "").trim();
    const imageUrl = ((formData.get("imageUrl") as string) || "").trim();
    const mapUrl = ((formData.get("mapUrl") as string) || "").trim() || null;

    if (!name) {
      return { error: "Location name is required." };
    }
    if (!imageUrl) {
      return { error: "Please upload a location image before saving." };
    }

    await prisma.infrastructureLocation.create({
      data: {
        name,
        imageUrl,
        mapUrl,
      },
    });

    await invalidateCacheTags(["brand", "settings", "ai-snapshot"]);
    revalidatePath("/admin/locations");
    revalidatePath("/about/infrastructure");
    revalidatePath("/contact");
    redirect("/admin/locations");
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/locations"
          className="p-2 bg-white rounded-lg border border-slate-200 text-slate-500 hover:text-[#0056b3] transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <MapPin className="text-[#0056b3]" />
            Add New Location
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Add a new infrastructure location (showroom, factory, branch, etc.)
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6">
        <SubmitForm action={createLocation} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Location Name
            </label>
            <input
              type="text"
              name="name"
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white transition-all text-sm"
              placeholder="e.g. Our Showroom at Telangana"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Map URL (Optional)
            </label>
            <input
              type="url"
              name="mapUrl"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white transition-all text-sm"
              placeholder="e.g. https://maps.app.goo.gl/..."
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Location Image *
            </label>
            <ImageUploader name="imageUrl" required aspectRatio={4 / 3} aspectLabel="4:3 Location Photo" />
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="bg-[#0056b3] text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-sm"
            >
              Create Location
            </button>
          </div>
        </SubmitForm>
      </div>
    </div>
  );
}
