import { DeleteForm } from "@/components/admin/DeleteForm";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { Mail, Trash2, Eye } from "lucide-react";

export default async function AdminEnquiriesPage() {
  const enquiries = await prisma.enquiry.findMany({
    orderBy: { createdAt: 'desc' }
  });

  async function deleteEnquiry(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    await prisma.enquiry.delete({ where: { id } });
    revalidatePath("/admin/enquiries");
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <Mail className="text-[#0056b3]" /> Contact Enquiries
          </h1>
          <p className="text-slate-500 mt-1 text-sm">View and reply to messages from the contact form.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {enquiries.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Mail size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">No enquiries yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 font-bold text-slate-600 text-sm">Date</th>
                  <th className="p-4 font-bold text-slate-600 text-sm">Name</th>
                  <th className="p-4 font-bold text-slate-600 text-sm">Email</th>
                  <th className="p-4 font-bold text-slate-600 text-sm">Source</th>
                  <th className="p-4 font-bold text-slate-600 text-sm">Status</th>
                  <th className="p-4 font-bold text-slate-600 text-sm text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {enquiries.map((enquiry) => (
                  <tr key={enquiry.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-slate-600 text-sm">{new Date(enquiry.createdAt).toLocaleDateString()}</td>
                    <td className="p-4 font-bold text-slate-800">{enquiry.name}</td>
                    <td className="p-4 text-slate-600 text-sm">
                      <a href={`mailto:${enquiry.email}`} className="hover:text-[#0056b3] transition-colors">{enquiry.email}</a>
                    </td>
                    <td className="p-4 text-slate-600 text-sm">{enquiry.source}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                        enquiry.status === 'New' ? 'bg-blue-100 text-blue-700' :
                        enquiry.status === 'Replied' ? 'bg-green-100 text-green-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {enquiry.status}
                      </span>
                    </td>
                    <td className="p-4 flex gap-3 justify-end">
                      <Link href={`/admin/enquiries/${enquiry.id}`} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View & Reply">
                        <Eye size={18} />
                      </Link>
                      <DeleteForm action={deleteEnquiry}>
                        <input type="hidden" name="id" value={enquiry.id} />
                        <button type="submit" className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                          <Trash2 size={18} />
                        </button>
                      </DeleteForm>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
