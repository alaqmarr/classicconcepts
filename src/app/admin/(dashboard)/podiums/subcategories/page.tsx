export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Layers, Plus, ArrowLeft } from "lucide-react";
import Link from "next/link";
import slugify from "slugify";
import { DeleteForm } from "@/components/admin/DeleteForm";

export default async function AdminPodiumSubCategoriesPage() {
  const subCategories = await prisma.podiumSubCategory.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: {
      _count: {
        select: { products: true }
      }
    }
  });

  async function createSubCategory(formData: FormData) {
    "use server";
    const name = (formData.get("name") as string)?.trim();
    if (!name) return;
    const description = (formData.get("description") as string)?.trim() || null;
    const sortOrder = parseInt(formData.get("sortOrder") as string) || 0;
    const slug = slugify(name, { lower: true, strict: true });

    await prisma.podiumSubCategory.upsert({
      where: { slug },
      update: { name, description, sortOrder },
      create: { name, slug, description, sortOrder }
    });

    revalidatePath("/", "layout");
    revalidatePath("/podiums");
    revalidatePath(`/podiums/${slug}`);
    revalidatePath("/podiums/[slug]", "page");
    revalidatePath("/admin/podiums");
    revalidatePath("/admin/podiums/subcategories");
  }

  async function deleteSubCategory(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    await prisma.product.updateMany({
      where: { podiumSubCategoryId: id },
      data: { podiumSubCategoryId: null }
    });
    await prisma.podiumSubCategory.delete({ where: { id } });

    revalidatePath("/", "layout");
    revalidatePath("/podiums");
    revalidatePath("/podiums/[slug]", "page");
    revalidatePath("/admin/podiums");
    revalidatePath("/admin/podiums/subcategories");
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/podiums"
            className="p-2 bg-white rounded-lg border border-slate-200 text-slate-500 hover:text-[#0056b3] transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Layers className="text-[#0056b3]" />
              Podium Sub-Categories
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Organize podiums into sub-categories for easier browsing and filtering
            </p>
          </div>
        </div>
      </div>

      {/* Add Sub-Category Form */}
      <form
        action={createSubCategory}
        className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6 space-y-4"
      >
        <h2 className="text-lg font-bold text-slate-800">Add / Update Sub-Category</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Sub-Category Name *
            </label>
            <input
              type="text"
              name="name"
              required
              placeholder="e.g. Digital Podiums, Motorized Podiums, Wooden & Acrylic"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Description (Optional)
            </label>
            <input
              type="text"
              name="description"
              placeholder="Short description..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3]"
            />
          </div>
          <div className="flex items-end gap-3">
            <div className="w-28">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Sort Order
              </label>
              <input
                type="number"
                name="sortOrder"
                defaultValue={0}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3]"
              />
            </div>
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0056b3] text-white font-bold rounded-xl hover:bg-blue-800 transition-colors text-sm"
            >
              <Plus size={16} />
              Save Sub-Category
            </button>
          </div>
        </div>
      </form>

      {/* Sub-Categories Table */}
      <div className="bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <th className="p-4">Name</th>
              <th className="p-4">Slug</th>
              <th className="p-4">Description</th>
              <th className="p-4">Podiums Count</th>
              <th className="p-4">Sort Order</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {subCategories.map((sub) => (
              <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-4 font-bold text-slate-800">{sub.name}</td>
                <td className="p-4 font-mono text-xs text-slate-500">{sub.slug}</td>
                <td className="p-4 text-slate-600">{sub.description || "—"}</td>
                <td className="p-4">
                  <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md text-xs font-bold">
                    {sub._count.products} podiums
                  </span>
                </td>
                <td className="p-4 text-slate-600">{sub.sortOrder}</td>
                <td className="p-4 text-right">
                  <DeleteForm
                    id={sub.id}
                    action={deleteSubCategory}
                    confirmMessage="Delete this sub-category? Assigned podiums will be kept and unlinked."
                  />
                </td>
              </tr>
            ))}
            {subCategories.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">
                  No podium sub-categories created yet. Add one above to get started!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
