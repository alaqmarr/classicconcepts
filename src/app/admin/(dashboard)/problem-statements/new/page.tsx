export const dynamic = "force-dynamic";

import { SubmitForm } from "@/components/admin/SubmitForm";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { FolderTree, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { requireAdminSession } from "@/lib/auth";
import {
  generateUniqueProblemSlug,
  revalidateCatalogPaths,
  sanitizeRichHtml,
} from "@/lib/product-mutations";
import { invalidateCacheTags } from "@/lib/redis-cache";

export default function NewProblemStatementPage() {
  async function createProblemStatement(formData: FormData) {
    "use server";
    await requireAdminSession();

    const name = ((formData.get("name") as string) || "").trim();
    if (!name) {
      return { error: "Problem statement name is required." };
    }

    const slug = await generateUniqueProblemSlug(name);
    const imageUrl = ((formData.get("imageUrl") as string) || "").trim() || null;
    const description = sanitizeRichHtml(formData.get("description") as string | null);

    await prisma.problemStatement.create({
      data: {
        name,
        slug,
        imageUrl,
        description,
      },
    });

    await invalidateCacheTags(["catalog", "taxonomy", "ai-snapshot", "ai-responses"]);
    revalidatePath("/admin/problem-statements");
    revalidateCatalogPaths();
    redirect("/admin/problem-statements");
  }

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/problem-statements"
          className="p-2 bg-white rounded-lg border border-slate-200 text-slate-500 hover:text-[#0056b3] transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FolderTree className="text-[#0056b3]" />
            Add New Problem Statement
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Create a new customer problem statement
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6">
        <SubmitForm action={createProblemStatement} className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Problem Statement Name
              </label>
              <input
                type="text"
                name="name"
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white transition-all text-sm"
                placeholder="e.g. Retail Counter Display Organization"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Image (Optional)
            </label>
            <ImageUploader name="imageUrl" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Description (Optional)
            </label>
            <RichTextEditor
              name="description"
              placeholder="Write a description for this problem statement..."
            />
          </div>

          <div className="pt-4 border-t border-slate-100">
            <button
              type="submit"
              className="px-8 py-3 bg-[#0056b3] text-white font-bold rounded-xl hover:bg-blue-800 transition-colors"
            >
              Save Problem Statement
            </button>
          </div>
        </SubmitForm>
      </div>
    </div>
  );
}
