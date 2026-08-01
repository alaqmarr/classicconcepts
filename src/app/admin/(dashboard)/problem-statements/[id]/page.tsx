export const dynamic = 'force-dynamic';
import { SubmitForm } from "@/components/admin/SubmitForm";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect, notFound } from "next/navigation";
import { FolderTree, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { RichTextEditor } from "@/components/admin/RichTextEditor";

interface Props {
  params: { id: string };
}

export default async function EditProblemStatementPage({ params }: Props) {
  const { id } = await params;
  const problemStatement = await prisma.problemStatement.findUnique({
    where: { id }
  });

  if (!problemStatement) {
    notFound();
  }

  async function updateProblemStatement(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;
    const imageUrl = formData.get("imageUrl") as string;
    const description = formData.get("description") as string;
    
    await prisma.problemStatement.update({
      where: { id },
      data: { 
        name, 
        slug, 
        imageUrl: imageUrl || null, 
        description: description || null,
              }
    });

    revalidatePath("/admin/problem-statements");
    redirect("/admin/problem-statements");
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/admin/problem-statements" className="p-2 bg-white rounded-lg border border-slate-200 text-slate-500 hover:text-[#0056b3] transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FolderTree className="text-[#0056b3]" />
            Edit ProblemStatement
          </h1>
          <p className="text-sm text-slate-500 mt-1">Update {problemStatement.name}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6">
        <SubmitForm action={updateProblemStatement} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">ProblemStatement Name</label>
              <input type="text" name="name" defaultValue={problemStatement.name} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white transition-all text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Slug</label>
              <input type="text" name="slug" defaultValue={problemStatement.slug} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white transition-all text-sm" />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Image (Optional)</label>
            <div className="mb-2">
               {problemStatement.imageUrl && <p className="text-xs text-slate-500">Current image uploaded.</p>}
            </div>
            {/* ImageUploader now supports defaultValue! */}
            <ImageUploader name="imageUrl" defaultValue={problemStatement.imageUrl || ""} />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Description (Optional)</label>
            <RichTextEditor name="description" defaultValue={problemStatement.description || ""} placeholder="Write a description for this problemStatement..." />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Background Color Class (Optional)</label>
            <input type="text" name="description" defaultValue={problemStatement.description || ""} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white transition-all text-sm" />
          </div>

          <div className="pt-4 border-t border-slate-100 flex gap-4">
            <button type="submit" className="px-8 py-3 bg-[#0056b3] text-white font-bold rounded-xl hover:bg-blue-800 transition-colors">
              Save Changes
            </button>
            <Link href="/admin/problem-statements" className="px-8 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">
              Cancel
            </Link>
          </div>
        </SubmitForm>
      </div>
    </div>
  );
}
