export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Newspaper, Plus, ArrowUp, ArrowDown, Save, ExternalLink } from "lucide-react";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { DeleteForm } from "@/components/admin/DeleteForm";

function revalidatePressPaths() {
  revalidatePath("/about/press");
  revalidatePath("/admin/press");
}

export default async function AdminPressPage() {
  const articles = await prisma.pressArticle.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  async function createPressArticle(formData: FormData) {
    "use server";
    const title = (formData.get("title") as string)?.trim();
    if (!title) return;

    const category = (formData.get("category") as string) || "Newspaper";
    const publication = (formData.get("publication") as string)?.trim() || null;
    const date = (formData.get("date") as string)?.trim() || null;
    const summary = (formData.get("summary") as string)?.trim() || null;
    const imageUrl = (formData.get("imageUrl") as string)?.trim() || null;
    const externalUrl = (formData.get("externalUrl") as string)?.trim() || null;
    const rawSortOrder = formData.get("sortOrder") as string;
    const count = await prisma.pressArticle.count();
    const sortOrder =
      rawSortOrder !== "" && !isNaN(parseInt(rawSortOrder))
        ? parseInt(rawSortOrder)
        : count + 1;

    await prisma.pressArticle.create({
      data: {
        title,
        category,
        publication,
        date,
        summary,
        imageUrl,
        externalUrl,
        sortOrder,
      },
    });

    revalidatePressPaths();
  }

  async function updatePressArticle(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    const title = (formData.get("title") as string)?.trim();
    const category = (formData.get("category") as string) || "Newspaper";
    const publication = (formData.get("publication") as string)?.trim() || null;
    const date = (formData.get("date") as string)?.trim() || null;
    const summary = (formData.get("summary") as string)?.trim() || null;
    const externalUrl = (formData.get("externalUrl") as string)?.trim() || null;
    const sortOrder = parseInt(formData.get("sortOrder") as string) || 0;

    if (!id || !title) return;

    await prisma.pressArticle.update({
      where: { id },
      data: {
        title,
        category,
        publication,
        date,
        summary,
        externalUrl,
        sortOrder,
      },
    });

    revalidatePressPaths();
  }

  async function movePressArticle(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    const direction = formData.get("direction") as "up" | "down";

    const list = await prisma.pressArticle.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    const currentIndex = list.findIndex((item) => item.id === id);
    if (currentIndex === -1) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const reordered = [...list];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    await prisma.$transaction(
      reordered.map((item, idx) =>
        prisma.pressArticle.update({
          where: { id: item.id },
          data: { sortOrder: idx + 1 },
        })
      )
    );

    revalidatePressPaths();
  }

  async function deletePressArticle(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    await prisma.pressArticle.delete({ where: { id } });
    revalidatePressPaths();
  }

  return (
    <div className="space-y-8 w-full">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-soft border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Newspaper className="text-[#0056b3]" />
            Newspapers &amp; Newsroom Articles
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Add newspaper clippings, media features, and newsroom articles for the In the Press page.
          </p>
        </div>
      </div>

      {/* Add Form */}
      <form
        action={createPressArticle}
        className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6 space-y-6"
      >
        <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3">
          Add Newspaper Clipping or Newsroom Article
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Type *
                </label>
                <select
                  name="category"
                  defaultValue="Newspaper"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0056b3]"
                >
                  <option value="Newspaper">Newspaper Clipping</option>
                  <option value="Newsroom">Newsroom Article</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Publication / Source
                </label>
                <input
                  type="text"
                  name="publication"
                  placeholder="e.g. The Hindu, Deccan Chronicle, Newsroom"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Headline / Title *
              </label>
              <input
                type="text"
                name="title"
                required
                placeholder="e.g. Classic Concepts Expands 16,000 Sq. Ft. Manufacturing Facility"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Date (Optional)
                </label>
                <input
                  type="text"
                  name="date"
                  placeholder="e.g. Oct 2026"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  External Link (Optional)
                </label>
                <input
                  type="url"
                  name="externalUrl"
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Sort Order
                </label>
                <input
                  type="number"
                  name="sortOrder"
                  defaultValue={articles.length + 1}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Article Content / Summary (Optional)
              </label>
              <textarea
                name="summary"
                rows={4}
                placeholder="Write a summary or full article excerpt..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Newspaper Clipping / Cover Image (4:3 Recommended)
            </label>
            <ImageUploader
              name="imageUrl"
              aspectRatio={4 / 3}
              aspectLabel="4:3 Press Clipping / Article Cover"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 bg-[#0056b3] text-white font-bold rounded-xl hover:bg-blue-800 transition-colors text-sm shadow-sm"
          >
            <Plus size={18} />
            Add Press Item
          </button>
        </div>
      </form>

      {/* Articles Table */}
      <div className="bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Published Newspaper Clippings &amp; Newsroom Articles ({articles.length})
          </span>
        </div>

        {articles.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            No newspaper clippings or newsroom articles added yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="p-4 w-28">Order</th>
                  <th className="p-4 w-28">Image</th>
                  <th className="p-4">Article Details</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {articles.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        <form action={movePressArticle}>
                          <input type="hidden" name="id" value={item.id} />
                          <input type="hidden" name="direction" value="up" />
                          <button
                            type="submit"
                            disabled={index === 0}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-[#0056b3] disabled:opacity-30"
                            title="Move Up"
                          >
                            <ArrowUp size={15} />
                          </button>
                        </form>
                        <form action={movePressArticle}>
                          <input type="hidden" name="id" value={item.id} />
                          <input type="hidden" name="direction" value="down" />
                          <button
                            type="submit"
                            disabled={index === articles.length - 1}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-[#0056b3] disabled:opacity-30"
                            title="Move Down"
                          >
                            <ArrowDown size={15} />
                          </button>
                        </form>
                      </div>
                    </td>

                    <td className="p-4">
                      {item.imageUrl ? (
                        <a
                          href={item.imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-24 h-18 rounded-xl overflow-hidden border border-slate-200 bg-slate-100"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        </a>
                      ) : (
                        <div className="w-24 h-18 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
                          No Image
                        </div>
                      )}
                    </td>

                    <td className="p-4">
                      <form action={updatePressArticle} className="space-y-2">
                        <input type="hidden" name="id" value={item.id} />
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="number"
                            name="sortOrder"
                            defaultValue={item.sortOrder}
                            className="w-16 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center"
                            title="Sort Order"
                          />
                          <select
                            name="category"
                            defaultValue={item.category}
                            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
                          >
                            <option value="Newspaper">Newspaper</option>
                            <option value="Newsroom">Newsroom</option>
                          </select>
                          <input
                            type="text"
                            name="publication"
                            defaultValue={item.publication || ""}
                            placeholder="Publication..."
                            className="w-40 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                          />
                          <input
                            type="text"
                            name="date"
                            defaultValue={item.date || ""}
                            placeholder="Date..."
                            className="w-28 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                          />
                          <input
                            type="text"
                            name="title"
                            defaultValue={item.title}
                            required
                            className="flex-1 min-w-[200px] px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-800"
                          />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="text"
                            name="summary"
                            defaultValue={item.summary || ""}
                            placeholder="Article summary..."
                            className="flex-1 min-w-[200px] px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600"
                          />
                          <input
                            type="text"
                            name="externalUrl"
                            defaultValue={item.externalUrl || ""}
                            placeholder="External URL..."
                            className="w-48 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                          />
                          {item.externalUrl && (
                            <a
                              href={item.externalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Open External Link"
                            >
                              <ExternalLink size={14} />
                            </a>
                          )}
                          <button
                            type="submit"
                            className="px-3 py-1.5 bg-blue-50 text-[#0056b3] hover:bg-[#0056b3] hover:text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                          >
                            <Save size={13} />
                            Save
                          </button>
                        </div>
                      </form>
                    </td>

                    <td className="p-4 text-right">
                      <DeleteForm
                        id={item.id}
                        action={deletePressArticle}
                        confirmMessage="Delete this press article?"
                      />
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
