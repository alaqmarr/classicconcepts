export const dynamic = "force-dynamic";

import { DeleteForm } from "@/components/admin/DeleteForm";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { FolderTree, Plus, Edit2 } from "lucide-react";
import Link from "next/link";
import { requireAdminSession } from "@/lib/auth";
import { revalidateCatalogPaths } from "@/lib/product-mutations";

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      imageUrl: true,
      bgClass: true,
      _count: { select: { products: true } },
    },
  });

  async function deleteCategory(formData: FormData) {
    "use server";
    try {
      await requireAdminSession();
      const id = (formData.get("id") as string)?.trim();
      if (!id) return { error: "Missing category ID." };

      const count = await prisma.product.count({ where: { categoryId: id } });
      if (count > 0) {
        return {
          error: `Cannot delete category while ${count} product(s) are assigned to it. Reassign or delete those products first.`,
        };
      }

      await prisma.category.delete({ where: { id } });
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FolderTree className="text-[#0056b3]" />
            Categories
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage product categories</p>
        </div>
        <Link
          href="/admin/categories/new"
          className="flex items-center gap-2 px-4 py-2 bg-[#0056b3] text-white font-bold rounded-xl hover:bg-blue-800 transition-colors"
        >
          <Plus size={18} />
          Add Category
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-bold">
                <th className="p-4">Category Name</th>
                <th className="p-4">Slug</th>
                <th className="p-4">Products</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.map((category) => (
                <tr key={category.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {category.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={category.imageUrl}
                          alt={category.name}
                          className="w-10 h-10 rounded-lg object-cover bg-slate-200"
                        />
                      ) : (
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold ${
                            category.bgClass || "bg-[#0056b3]"
                          }`}
                        >
                          {category.name.charAt(0)}
                        </div>
                      )}
                      <span className="font-bold text-slate-700">{category.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-slate-500 text-sm">{category.slug}</td>
                  <td className="p-4 text-slate-500 text-sm font-medium">
                    {category._count.products}
                  </td>
                  <td className="p-4 text-right flex items-center justify-end gap-2">
                    <Link
                      href={`/admin/categories/${category.id}`}
                      className="p-2 text-slate-400 hover:text-[#0056b3] hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={18} />
                    </Link>
                    <DeleteForm action={deleteCategory} id={category.id} />
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">
                    No categories found. Create your first one!
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
