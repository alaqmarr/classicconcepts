export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect, notFound } from "next/navigation";
import { Users, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ImageUploader } from "@/components/admin/ImageUploader";

interface Props {
  params: Promise<{ id: string }>;
}

async function updateMember(id: string, formData: FormData) {
  "use server";
  const name = (formData.get("name") as string)?.trim();
  const position = (formData.get("position") as string)?.trim();
  const photoUrl = (formData.get("photoUrl") as string)?.trim() || null;
  const phone = (formData.get("phone") as string)?.trim() || null;
  const whatsapp = (formData.get("whatsapp") as string)?.trim() || null;
  const email = (formData.get("email") as string)?.trim() || null;
  const bio = (formData.get("bio") as string)?.trim() || null;
  const sortOrder = parseInt(formData.get("sortOrder") as string) || 0;

  await prisma.teamMember.update({
    where: { id },
    data: {
      name,
      position,
      photoUrl,
      phone,
      whatsapp,
      email,
      bio,
      sortOrder,
    },
  });

  revalidatePath("/admin/team");
  revalidatePath(`/admin/team/${id}`);
  revalidatePath("/about/team");
  revalidatePath("/contact");
  redirect("/admin/team");
}

export default async function EditTeamMemberPage({ params }: Props) {
  const { id } = await params;
  const member = await prisma.teamMember.findUnique({ where: { id } });

  if (!member) {
    notFound();
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
            Edit Team Member
          </h1>
          <p className="text-sm text-slate-500 mt-1">Updating {member.name}</p>
        </div>
      </div>

      <form
        action={updateMember.bind(null, id)}
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
              defaultValue={member.name}
              required
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
              defaultValue={member.position}
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Team Member Photo (Cloudflare R2 Upload)
          </label>
          <ImageUploader name="photoUrl" defaultValue={member.photoUrl || ""} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Calling Phone Number
            </label>
            <input
              type="tel"
              name="phone"
              defaultValue={member.phone || ""}
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
              defaultValue={member.whatsapp || ""}
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
              defaultValue={member.email || ""}
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
              defaultValue={member.sortOrder}
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
            defaultValue={member.bio || ""}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white text-sm"
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-[#0056b3] text-white font-bold rounded-xl hover:bg-blue-800 transition-colors"
        >
          Update Team Member
        </button>
      </form>
    </div>
  );
}
