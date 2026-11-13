export const dynamic = "force-dynamic";

import { SubmitForm } from "@/components/admin/SubmitForm";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect, notFound } from "next/navigation";
import { FolderTree, ArrowLeft, Layers } from "lucide-react";
import Link from "next/link";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { CategoryDescriptionFields } from "@/components/admin/CategoryDescriptionFields";
import { requireAdminSession } from "@/lib/auth";
import {
  generateUniqueCategorySlug,
  revalidateCatalogPaths,
  sanitizeRichHtml,
} from "@/lib/product-mutations";
import { invalidateCacheTags } from "@/lib/redis-cache";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditCategoryPage({ params }: Props) {
  const { id } = await params;
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      subCategories: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: {
          _count: { select: { products: true } },
        },
      },
      _count: { select: { products: true } },
    },
  });

  if (!category) {
    notFound();
  }

  async function updateCategory(formData: FormData) {
    "use server";
    await requireAdminSession();

    const name = ((formData.get("name") as string) || "").trim();
    const rawSlug = ((formData.get("slug") as string) || "").trim();
    if (!name) {
      return { error: "Category name is required." };
    }

    const slug = await generateUniqueCategorySlug(rawSlug || name, id);
    const imageUrl = ((formData.get("imageUrl") as string) || "").trim() || null;
    const bgClass = ((formData.get("bgClass") as string) || "").trim() || null;
    const description =
      ((formData.get("description") as string) || "").trim() || null;
    const rawSortOrder = parseInt(
      ((formData.get("sortOrder") as string) || "").trim(),
      10
    );
    const sortOrder = Number.isFinite(rawSortOrder) ? rawSortOrder : 0;
    const descriptionHtml = sanitizeRichHtml(
      formData.get("descriptionHtml") as string | null
    );

    await prisma.category.update({
      where: { id },
      data: {
        name,
        slug,
        imageUrl,
        bgClass,
        description,
        sortOrder,
        descriptionHtml,
      },
    });

    await invalidateCacheTags(["catalog", "taxonomy", "ai-snapshot", "ai-responses"]);
    revalidatePath("/admin/categories");
    revalidatePath(`/admin/categories/${id}`);
    revalidateCatalogPaths();
    redirect("/admin/categories");
  }

  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/categories"
            className="p-2 bg-white rounded-lg border border-slate-200 text-slate-500 hover:text-[#0056b3] transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <FolderTree className="text-[#0056b3]" />
              Edit Category
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Update {category.name} ({category._count.products} products
              {category.subCategories.length > 0
                ? `, ${category.subCategories.length} subcategories`
                : ""}
              )
            </p>
          </div>
        </div>
        <Link
          href={`/shop/c/${category.slug}`}
          target="_blank"
          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
        >
          View Public Category Page ↗
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6">
        <SubmitForm action={updateCategory} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Category Name
              </label>
              <input
                type="text"
                name="name"
                defaultValue={category.name}
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Slug
              </label>
              <input
                type="text"
                name="slug"
                defaultValue={category.slug}
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Display Sort Order
              </label>
              <input
                type="number"
                name="sortOrder"
                defaultValue={category.sortOrder ?? 0}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white transition-all text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Image (Optional)
            </label>
            <ImageUploader name="imageUrl" defaultValue={category.imageUrl || ""} />
          </div>

          <CategoryDescriptionFields
            defaultDescription={category.description}
            defaultDescriptionHtml={category.descriptionHtml}
          />

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Background Color Class (Optional)
            </label>
            <input
              type="text"
              name="bgClass"
              defaultValue={category.bgClass || ""}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white transition-all text-sm"
            />
          </div>

          {category.subCategories.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={14} className="text-[#0056b3]" />
                  Subcategories under {category.name} ({category.subCategories.length})
                </span>
                <Link
                  href="/admin/categories"
                  className="text-xs font-bold text-[#0056b3] hover:underline"
                >
                  Manage Subcategories &amp; Descriptions →
                </Link>
              </div>
              <div className="flex flex-wrap gap-2">
                {category.subCategories.map((sub) => (
                  <span
                    key={sub.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-semibold text-slate-700"
                  >
                    <span>{sub.name}</span>
                    <span className="text-[11px] text-slate-400">
                      ({sub._count.products})
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex gap-4">
            <button
              type="submit"
              className="px-8 py-3 bg-[#0056b3] text-white font-bold rounded-xl hover:bg-blue-800 transition-colors"
            >
              Save Changes
            </button>
            <Link
              href="/admin/categories"
              className="px-8 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </SubmitForm>
      </div>
    </div>
  );
}
