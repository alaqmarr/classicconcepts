export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Users, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ImageUploader } from "@/components/admin/ImageUploader";

export default function NewTeamMemberPage() {
  async function createMember(formData: FormData) {
    "use server";
    const name = (formData.get("name") as string)?.trim();
    const position = (formData.get("position") as string)?.trim();
    const photoUrl = (formData.get("photoUrl") as string)?.trim() || null;
    const phone = (formData.get("phone") as string)?.trim() || null;
    const whatsapp = (formData.get("whatsapp") as string)?.trim() || null;
    const email = (formData.get("email") as string)?.trim() || null;
    const bio = (formData.get("bio") as string)?.trim() || null;
    const sortOrder = parseInt(formData.get("sortOrder") as string) || 0;

    await prisma.teamMember.create({
      data: {
        name,
        position,
        photoUrl,
        phone,
        whatsapp,
        email,
        bio,
        sortOrder,
        isActive: true,
      },
    });

    revalidatePath("/admin/team");
    revalidatePath("/about/team");
    revalidatePath("/contact");
    redirect("/admin/team");
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/team"
          className="p-2 bg-white rounded-lg border border-slate-200 text-slate-500 hover:text-[#0056b3] transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="text-[#0056b3]" />
            Add Team Member
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Upload team member photo to Cloudflare R2 and add contact details
          </p>
        </div>
      </div>

      <form
        action={createMember}
        className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6 space-y-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Full Name *
            </label>
            <input
              type="text"
              name="name"
              required
              placeholder="e.g. Rajesh Sharma"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Position / Designation *
            </label>
            <input
              type="text"
              name="position"
              required
              placeholder="e.g. Sales Head / Managing Director"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Team Member Photo (Cloudflare R2 Upload)
          </label>
          <ImageUploader name="photoUrl" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Calling Phone Number
            </label>
            <input
              type="tel"
              name="phone"
              placeholder="e.g. +917337222876"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              WhatsApp Number
            </label>
            <input
              type="tel"
              name="whatsapp"
              placeholder="e.g. +917337222876"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Email (Optional)
            </label>
            <input
              type="email"
              name="email"
              placeholder="e.g. sales@classicconcepts.in"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Display Sort Order
            </label>
            <input
              type="number"
              name="sortOrder"
              defaultValue={0}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Short Bio / Description (Optional)
          </label>
          <textarea
            name="bio"
            rows={3}
            placeholder="Brief note about their role or expertise..."
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white text-sm"
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-[#0056b3] text-white font-bold rounded-xl hover:bg-blue-800 transition-colors"
        >
          Save Team Member
        </button>
      </form>
    </div>
  );
}
