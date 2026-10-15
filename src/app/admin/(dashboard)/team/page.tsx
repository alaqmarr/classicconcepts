export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Users, Plus, Edit, Phone, MessageCircle } from "lucide-react";
import Link from "next/link";
import { DeleteForm } from "@/components/admin/DeleteForm";

export default async function AdminTeamPage() {
  const members = await prisma.teamMember.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });

  async function deleteMember(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    await prisma.teamMember.delete({ where: { id } });
    revalidatePath("/admin/team");
    revalidatePath("/about/team");
    revalidatePath("/contact");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="text-[#0056b3]" />
            Team Members
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage team members displayed on the Our Team &amp; Contact Us pages
          </p>
        </div>
        <Link
          href="/admin/team/new"
          className="flex items-center gap-2 px-4 py-2 bg-[#0056b3] text-white font-bold rounded-xl hover:bg-blue-800 transition-colors"
        >
          <Plus size={18} />
          Add Team Member
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4">Photo</th>
                <th className="p-4">Name &amp; Position</th>
                <th className="p-4">Calling Number</th>
                <th className="p-4">WhatsApp Number</th>
                <th className="p-4">Sort Order</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                      {member.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={member.photoUrl}
                          alt={member.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Users className="text-slate-400" size={20} />
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="font-bold text-slate-800">{member.name}</div>
                    <div className="text-xs font-semibold text-[#0056b3]">{member.position}</div>
                  </td>
                  <td className="p-4 text-slate-600">
                    {member.phone ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-slate-100 px-2.5 py-1 rounded-md">
                        <Phone size={12} className="text-[#0056b3]" />
                        {member.phone}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-4 text-slate-600">
                    {member.whatsapp ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-green-50 text-green-700 px-2.5 py-1 rounded-md">
                        <MessageCircle size={12} />
                        {member.whatsapp}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-4 text-slate-600">{member.sortOrder}</td>
                  <td className="p-4 flex items-center justify-end gap-2">
                    <Link
                      href={`/admin/team/${member.id}`}
                      className="p-2 text-slate-400 hover:text-[#0056b3] rounded-lg hover:bg-blue-50 transition-colors"
                      title="Edit"
                    >
                      <Edit size={18} />
                    </Link>
                    <DeleteForm
                      id={member.id}
                      action={deleteMember}
                      confirmMessage="Are you sure you want to remove this team member?"
                    />
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No team members added yet. Click &ldquo;Add Team Member&rdquo; to get started.
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
