export const dynamic = "force-dynamic";

import { DeleteForm } from "@/components/admin/DeleteForm";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import Image from "next/image";
import { MapPin, Plus } from "lucide-react";
import { requireAdminSession } from "@/lib/auth";
import { invalidateCacheTags } from "@/lib/redis-cache";

export default async function AdminLocationsPage() {
  const locations = await prisma.infrastructureLocation.findMany({
    orderBy: { sortOrder: "asc" },
  });

  async function deleteLocation(formData: FormData) {
    "use server";
    await requireAdminSession();
    const id = formData.get("id") as string;
    if (!id) return { error: "Missing location ID." };
    await prisma.infrastructureLocation.delete({ where: { id } });
    await invalidateCacheTags(["brand", "settings", "ai-snapshot"]);
    revalidatePath("/admin/locations");
    revalidatePath("/about/infrastructure");
    revalidatePath("/contact");
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-soft border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <MapPin className="text-[#0056b3]" />
            Infrastructure Locations
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage locations and maps for the infrastructure and contact pages.
          </p>
        </div>
        <Link
          href="/admin/locations/new"
          className="bg-[#0056b3] text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={18} />
          Add Location
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden">
        {locations.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No locations found. Add one to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-xs uppercase tracking-wider font-bold text-slate-500">
                  <th className="p-4">Image</th>
                  <th className="p-4">Name</th>
                  <th className="p-4">Map URL</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {locations.map((loc) => (
                  <tr key={loc.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <div className="relative w-20 h-14 bg-slate-100 rounded overflow-hidden flex items-center justify-center text-xs text-slate-400">
                        {loc.imageUrl ? (
                          <Image
                            src={loc.imageUrl}
                            alt={loc.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          "No Image"
                        )}
                      </div>
                    </td>
                    <td className="p-4 font-semibold text-slate-800">{loc.name}</td>
                    <td className="p-4 text-slate-500 max-w-[200px] truncate text-sm">
                      {loc.mapUrl ? (
                        <a
                          href={loc.mapUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-500 hover:underline"
                        >
                          {loc.mapUrl}
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <DeleteForm action={deleteLocation} id={loc.id} />
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
