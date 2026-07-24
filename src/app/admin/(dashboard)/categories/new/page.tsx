export const dynamic = 'force-dynamic';
import { SubmitForm } from "@/components/admin/SubmitForm";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { FolderTree, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import slugify from "slugify";

export default function NewCategoryPage() {
  async function createCategory(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    const generatedSlug = slugify(name, { lower: true, strict: true });
    
    const imageUrl = formData.get("imageUrl") as string;
    const bgClass = formData.get("bgClass") as string;
    const descriptionHtml = formData.get("descriptionHtml") as string;

    await prisma.category.create({
      data: {
        id: generatedSlug,
        name, 
        slug: generatedSlug, 
        imageUrl: imageUrl || null, 
        bgClass: bgClass || null,
        descriptionHtml: descriptionHtml || null
      }
    });

    revalidatePath("/admin/categories");
    redirect("/admin/categories");
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/admin/categories" className="p-2 bg-white rounded-lg border border-slate-200 text-slate-500 hover:text-[#0056b3] transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FolderTree className="text-[#0056b3]" />
            Add New Category
          </h1>
          <p className="text-sm text-slate-500 mt-1">Create a new product category</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6">
        <SubmitForm action={createCategory} className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Category Name</label>
              <input type="text" name="name" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white transition-all text-sm" placeholder="e.g. Acrylic Podiums" />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Image (Optional)</label>
            <ImageUploader name="imageUrl" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Description (Optional)</label>
            <RichTextEditor name="descriptionHtml" placeholder="Write a description for this category..." />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Background Color Class (Optional)</label>
            <input type="text" name="bgClass" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white transition-all text-sm" placeholder="e.g. bg-blue-500" />
          </div>

          <div className="pt-4 border-t border-slate-100">
            <button type="submit" className="px-8 py-3 bg-[#0056b3] text-white font-bold rounded-xl hover:bg-blue-800 transition-colors">
              Save Category
            </button>
          </div>
        </SubmitForm>
      </div>
    </div>
  );
}

