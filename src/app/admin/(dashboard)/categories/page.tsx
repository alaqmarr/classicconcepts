export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { FolderTree, Plus } from "lucide-react";
import Link from "next/link";
import { requireAdminSession } from "@/lib/auth";
import { revalidateCatalogPaths } from "@/lib/product-mutations";
import { invalidateCacheTags } from "@/lib/redis-cache";
import {
  CategorySmartManager,
  type CategoryRow,
} from "./CategorySmartManager";

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      imageUrl: true,
      bgClass: true,
      description: true,
      descriptionHtml: true,
      _count: { select: { products: true } },
      subCategories: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          descriptionHtml: true,
          imageUrl: true,
          sortOrder: true,
          _count: { select: { products: true } },
        },
      },
    },
  });

  const rows: CategoryRow[] = categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    imageUrl: cat.imageUrl,
    bgClass: cat.bgClass,
    description: cat.description,
    descriptionHtml: cat.descriptionHtml,
    productCount: cat._count.products,
    subCategories: cat.subCategories.map((sub) => ({
      id: sub.id,
      name: sub.name,
      slug: sub.slug,
      description: sub.description,
      descriptionHtml: sub.descriptionHtml,
      imageUrl: sub.imageUrl,
      sortOrder: sub.sortOrder,
      productCount: sub._count.products,
    })),
  }));

  async function deleteCategoryById(id: string) {
    "use server";
    try {
      await requireAdminSession();
      const trimmed = id?.trim();
      if (!trimmed) return { error: "Missing category ID." };

      const count = await prisma.product.count({
        where: { categoryId: trimmed },
      });
      if (count > 0) {
        return {
          error: `Cannot delete category while ${count} product(s) are assigned to it. Convert it to a subcategory or merge its products first.`,
        };
      }

      await prisma.category.delete({ where: { id: trimmed } });
      await invalidateCacheTags(["catalog", "taxonomy", "ai-snapshot", "ai-responses"]);
      revalidatePath("/admin/categories");
      revalidateCatalogPaths();
      return { success: true };
    } catch (err: any) {
      console.error("Delete category error:", err);
      return { error: err?.message || "Failed to delete category." };
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FolderTree className="text-[#0056b3]" />
            Categories &amp; Subcategories
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Organize main categories, convert granular categories into subcategories, merge duplicates, and write plain-English descriptions with ACRIO.
          </p>
        </div>
        <Link
          href="/admin/categories/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-[#0056b3] text-white font-bold rounded-xl hover:bg-blue-800 transition-colors text-sm shadow-xs"
        >
          <Plus size={18} />
          Add Main Category
        </Link>
      </div>

      <CategorySmartManager
        categories={rows}
        deleteAction={deleteCategoryById}
      />
    </div>
  );
}
