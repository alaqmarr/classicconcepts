export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Layers, Plus, ArrowLeft, ArrowUp, ArrowDown, Save } from "lucide-react";
import Link from "next/link";
import slugify from "slugify";
import { DeleteForm } from "@/components/admin/DeleteForm";

function revalidateAllPodiumPaths(slug?: string) {
  revalidatePath("/", "layout");
  revalidatePath("/podiums");
  if (slug) revalidatePath(`/podiums/${slug}`);
  revalidatePath("/podiums/[slug]", "page");
  revalidatePath("/admin/podiums");
  revalidatePath("/admin/podiums/subcategories");
}

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
    const rawSortOrder = formData.get("sortOrder") as string;
    const count = await prisma.podiumSubCategory.count();
    const sortOrder = rawSortOrder !== "" && !isNaN(parseInt(rawSortOrder)) ? parseInt(rawSortOrder) : count + 1;
    const slug = slugify(name, { lower: true, strict: true });

    await prisma.podiumSubCategory.upsert({
      where: { slug },
      update: { name, description, sortOrder },
      create: { name, slug, description, sortOrder }
    });

    revalidateAllPodiumPaths(slug);
  }

  async function updateSubCategoryRow(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    const name = (formData.get("name") as string)?.trim();
    const description = (formData.get("description") as string)?.trim() || null;
    const sortOrder = parseInt(formData.get("sortOrder") as string) || 0;
    if (!id || !name) return;

    const updated = await prisma.podiumSubCategory.update({
      where: { id },
      data: { name, description, sortOrder }
    });

    revalidateAllPodiumPaths(updated.slug);
  }

  async function moveSubCategory(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    const direction = formData.get("direction") as "up" | "down";

    const list = await prisma.podiumSubCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
    });

    const currentIndex = list.findIndex((item) => item.id === id);
    if (currentIndex === -1) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    // Swap elements in array and assign sequential sortOrder (1, 2, 3, ...)
    const reordered = [...list];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    await prisma.$transaction(
      reordered.map((item, idx) =>
        prisma.podiumSubCategory.update({
          where: { id: item.id },
          data: { sortOrder: idx + 1 }
        })
      )
    );

    revalidateAllPodiumPaths();
  }

  async function deleteSubCategory(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    await prisma.product.updateMany({
      where: { podiumSubCategoryId: id },
      data: { podiumSubCategoryId: null }
    });
    await prisma.podiumSubCategory.delete({ where: { id } });

    revalidateAllPodiumPaths();
  }

  return (
    <div className="space-y-8 w-full">
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
              Organize and rearrange podium sub-categories to control their display order in the navbar dropdown and podiums pages.
            </p>
          </div>
        </div>
      </div>

      {/* Add Sub-Category Form */}
      <form
        action={createSubCategory}
        className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6 space-y-4"
      >
        <h2 className="text-lg font-bold text-slate-800">Add New Sub-Category</h2>
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
                defaultValue={subCategories.length + 1}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3]"
              />
            </div>
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0056b3] text-white font-bold rounded-xl hover:bg-blue-800 transition-colors text-sm"
            >
              <Plus size={16} />
              Add Sub-Category
            </button>
          </div>
        </div>
      </form>

      {/* Sub-Categories Table with Reordering & Inline Edit */}
      <div className="bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Use ↑ / ↓ arrows or edit Sort Order to rearrange client-side display order
          </span>
          <span className="text-xs font-semibold text-slate-400">
            Total: {subCategories.length} sub-categories
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4 w-28">Rearrange</th>
                <th className="p-4">Name & Description</th>
                <th className="p-4">Slug</th>
                <th className="p-4">Podiums Count</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {subCategories.map((sub, index) => (
                <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                  {/* Up / Down Rearrange Buttons */}
                  <td className="p-4">
                    <div className="flex items-center gap-1.5">
                      <form action={moveSubCategory}>
                        <input type="hidden" name="id" value={sub.id} />
                        <input type="hidden" name="direction" value="up" />
                        <button
                          type="submit"
                          disabled={index === 0}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-[#0056b3] hover:border-[#0056b3] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                          title="Move Up"
                        >
                          <ArrowUp size={15} />
                        </button>
                      </form>
                      <form action={moveSubCategory}>
                        <input type="hidden" name="id" value={sub.id} />
                        <input type="hidden" name="direction" value="down" />
                        <button
                          type="submit"
                          disabled={index === subCategories.length - 1}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-[#0056b3] hover:border-[#0056b3] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                          title="Move Down"
                        >
                          <ArrowDown size={15} />
                        </button>
                      </form>
                    </div>
                  </td>

                  {/* Inline Edit Form for Name, Description, and Sort Order */}
                  <td className="p-4">
                    <form action={updateSubCategoryRow} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="id" value={sub.id} />
                      <input
                        type="number"
                        name="sortOrder"
                        defaultValue={sub.sortOrder}
                        className="w-16 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center focus:outline-none focus:ring-2 focus:ring-[#0056b3]"
                        title="Sort Order"
                      />
                      <input
                        type="text"
                        name="name"
                        defaultValue={sub.name}
                        required
                        className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0056b3]"
                      />
                      <input
                        type="text"
                        name="description"
                        defaultValue={sub.description || ""}
                        placeholder="Description..."
                        className="flex-1 min-w-[160px] px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#0056b3]"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-blue-50 text-[#0056b3] hover:bg-[#0056b3] hover:text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                        title="Save row changes"
                      >
                        <Save size={13} />
                        Save
                      </button>
                    </form>
                  </td>

                  <td className="p-4 font-mono text-xs text-slate-500">
                    <Link href={`/podiums/${sub.slug}`} target="_blank" className="hover:text-[#0056b3] hover:underline">
                      /podiums/{sub.slug}
                    </Link>
                  </td>

                  <td className="p-4">
                    <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md text-xs font-bold">
                      {sub._count.products} podiums
                    </span>
                  </td>

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
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    No podium sub-categories created yet. Add one above to get started!
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
