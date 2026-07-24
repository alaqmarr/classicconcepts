export const dynamic = 'force-dynamic';
import { SubmitForm } from "@/components/admin/SubmitForm";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { MapPin, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ImageUploader } from "@/components/admin/ImageUploader";
import slugify from "slugify";

export default function NewLocationPage() {
  async function createLocation(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    const imageUrl = formData.get("imageUrl") as string;
    const mapUrl = formData.get("mapUrl") as string;
    const generatedId = slugify(name, { lower: true, strict: true });

    await prisma.infrastructureLocation.create({
      data: { 
        id: generatedId,
        name, 
        imageUrl, 
        mapUrl: mapUrl || null 
      }
    });

    revalidatePath("/admin/locations");
    redirect("/admin/locations");
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/admin/locations" className="p-2 bg-white rounded-lg border border-slate-200 text-slate-500 hover:text-[#0056b3] transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <MapPin className="text-[#0056b3]" />
            Add New Location
          </h1>
          <p className="text-sm text-slate-500 mt-1">Add a new infrastructure location (showroom, factory, etc.)</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6">
        <SubmitForm action={createLocation} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Location Name</label>
            <input type="text" name="name" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white transition-all text-sm" placeholder="e.g. Our Showroom at Telangana" />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Map URL</label>
            <input type="url" name="mapUrl" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white transition-all text-sm" placeholder="e.g. https://goo.gl/maps/..." />
            <p className="text-xs text-slate-500 mt-1">Optional. A link to Google Maps.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Location Image</label>
            <ImageUploader name="imageUrl" />
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button type="submit" className="bg-[#0056b3] text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-sm">
              Create Location
            </button>
          </div>
        </SubmitForm>
      </div>
    </div>
  );
}

