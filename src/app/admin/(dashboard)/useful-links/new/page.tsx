export const dynamic = 'force-dynamic';
import { SubmitForm } from "@/components/admin/SubmitForm";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";

export default function NewUsefulLinkPage() {
  async function createLink(formData: FormData) {
    "use server";
    
    const title = formData.get("title") as string;
    const url = formData.get("url") as string;
    const sortOrder = parseInt(formData.get("sortOrder") as string) || 0;
    const isActive = formData.get("isActive") === "on";

    if (!title || !url) {
      throw new Error("Title and URL are required");
    }

    await prisma.usefulLink.create({
      data: {
        title,
        url,
        sortOrder,
        isActive
      }
    });

    revalidatePath("/admin/useful-links");
    revalidatePath("/");
    redirect("/admin/useful-links");
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/admin/useful-links" className="p-2 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-500 hover:text-[#0056b3] transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Add Useful Link</h1>
          <p className="text-slate-500 text-sm">Create a new link for the navigation dropdown</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
        <SubmitForm action={createLink} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Link Title *</label>
            <input 
              type="text" 
              name="title" 
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0056b3]/20 focus:border-[#0056b3] transition-all"
              placeholder="e.g., Return Policy"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">URL *</label>
            <input 
              type="text" 
              name="url" 
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0056b3]/20 focus:border-[#0056b3] transition-all"
              placeholder="e.g., https://example.com/policy or /about"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Display Order</label>
              <input 
                type="number" 
                name="sortOrder" 
                defaultValue="0"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0056b3]/20 focus:border-[#0056b3] transition-all"
              />
            </div>
            
            <div className="flex flex-col justify-end pb-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input type="checkbox" name="isActive" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0056b3]"></div>
                </div>
                <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">Active (Show in Nav)</span>
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <Link href="/admin/useful-links" className="px-6 py-3 font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Cancel</Link>
            <button type="submit" className="flex items-center gap-2 px-6 py-3 font-bold text-white bg-[#0056b3] rounded-xl hover:bg-blue-800 transition-colors shadow-sm">
              <Save size={18} /> Save Link
            </button>
          </div>
        </SubmitForm>
      </div>
    </div>
  );
}

