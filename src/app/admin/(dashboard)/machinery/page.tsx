export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Cog, Plus, ArrowUp, ArrowDown, Save } from "lucide-react";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { DeleteForm } from "@/components/admin/DeleteForm";

function revalidateInfraPaths() {
  revalidatePath("/about/infrastructure");
  revalidatePath("/admin/machinery");
}

export default async function AdminMachineryPage() {
  const machineryList = await prisma.machinery.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  async function createMachinery(formData: FormData) {
    "use server";
    const name = (formData.get("name") as string)?.trim();
    const description = (formData.get("description") as string)?.trim() || null;
    const imageUrl = (formData.get("imageUrl") as string)?.trim();
    const rawSortOrder = formData.get("sortOrder") as string;
    const count = await prisma.machinery.count();
    const sortOrder =
      rawSortOrder !== "" && !isNaN(parseInt(rawSortOrder))
        ? parseInt(rawSortOrder)
        : count + 1;

    if (!name || !imageUrl) return;

    await prisma.machinery.create({
      data: {
        name,
        description,
        imageUrl,
        sortOrder,
      },
    });

    revalidateInfraPaths();
  }

  async function updateMachinery(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    const name = (formData.get("name") as string)?.trim();
    const description = (formData.get("description") as string)?.trim() || null;
    const sortOrder = parseInt(formData.get("sortOrder") as string) || 0;
    if (!id || !name) return;

    await prisma.machinery.update({
      where: { id },
      data: { name, description, sortOrder },
    });

    revalidateInfraPaths();
  }

  async function moveMachinery(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    const direction = formData.get("direction") as "up" | "down";

    const list = await prisma.machinery.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    const currentIndex = list.findIndex((m) => m.id === id);
    if (currentIndex === -1) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const reordered = [...list];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    await prisma.$transaction(
      reordered.map((item, idx) =>
        prisma.machinery.update({
          where: { id: item.id },
          data: { sortOrder: idx + 1 },
        })
      )
    );

    revalidateInfraPaths();
  }

  async function deleteMachinery(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    await prisma.machinery.delete({ where: { id } });
    revalidateInfraPaths();
  }

  return (
    <div className="space-y-8 w-full">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-soft border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Cog className="text-[#0056b3]" />
            Our Machinery (Infrastructure Page)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Upload and manage machinery photos and descriptions displayed on the Infrastructure page.
          </p>
        </div>
      </div>

      {/* Add Machinery Form */}
      <form
        action={createMachinery}
        className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6 space-y-6"
      >
        <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3">
          Add New Machinery
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Machinery Name *
              </label>
              <input
                type="text"
                name="name"
                required
                placeholder="e.g. CNC Laser Cutting Machine, Diamond Edge Polisher"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Description (Optional)
              </label>
              <textarea
                name="description"
                rows={3}
                placeholder="Describe capabilities, precision, or specifications..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3]"
              />
            </div>
            <div className="w-36">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Sort Order
              </label>
              <input
                type="number"
                name="sortOrder"
                defaultValue={machineryList.length + 1}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0056b3]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Machinery Photo * (4:3 Standard Recommended)
            </label>
            <ImageUploader
              name="imageUrl"
              required
              aspectRatio={4 / 3}
              aspectLabel="4:3 Machinery Photo"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 bg-[#0056b3] text-white font-bold rounded-xl hover:bg-blue-800 transition-colors text-sm shadow-sm"
          >
            <Plus size={18} />
            Upload & Add Machinery
          </button>
        </div>
      </form>

      {/* Machinery List */}
      <div className="bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Uploaded Machinery ({machineryList.length})
          </span>
        </div>

        {machineryList.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            No machinery uploaded yet. Use the form above to add your machinery photos!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="p-4 w-28">Order</th>
                  <th className="p-4 w-32">Photo</th>
                  <th className="p-4">Name & Description</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {machineryList.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        <form action={moveMachinery}>
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
                        <form action={moveMachinery}>
                          <input type="hidden" name="id" value={item.id} />
                          <input type="hidden" name="direction" value="down" />
                          <button
                            type="submit"
                            disabled={index === machineryList.length - 1}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-[#0056b3] disabled:opacity-30"
                            title="Move Down"
                          >
                            <ArrowDown size={15} />
                          </button>
                        </form>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="w-24 h-18 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </td>

                    <td className="p-4">
                      <form action={updateMachinery} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="id" value={item.id} />
                        <input
                          type="number"
                          name="sortOrder"
                          defaultValue={item.sortOrder}
                          className="w-16 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center"
                          title="Sort Order"
                        />
                        <input
                          type="text"
                          name="name"
                          defaultValue={item.name}
                          required
                          className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-800"
                        />
                        <input
                          type="text"
                          name="description"
                          defaultValue={item.description || ""}
                          placeholder="Description..."
                          className="flex-1 min-w-[200px] px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600"
                        />
                        <button
                          type="submit"
                          className="px-3 py-1.5 bg-blue-50 text-[#0056b3] hover:bg-[#0056b3] hover:text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                        >
                          <Save size={13} />
                          Save
                        </button>
                      </form>
                    </td>

                    <td className="p-4 text-right">
                      <DeleteForm
                        id={item.id}
                        action={deleteMachinery}
                        confirmMessage="Delete this machinery item?"
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
