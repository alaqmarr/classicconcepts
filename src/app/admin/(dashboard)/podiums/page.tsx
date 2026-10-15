export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Package, Plus, Layers } from "lucide-react";
import Link from "next/link";
import { ProductListTable } from "@/components/admin/ProductListTable";

export default async function AdminPodiumsPage() {
  const [products, podiumSubCategories] = await Promise.all([
    prisma.product.findMany({
      where: { isPodium: true },
      orderBy: { name: 'asc' },
      include: { category: true, podiumSubCategory: true }
    }),
    prisma.podiumSubCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true }
    })
  ]);

  async function deleteProduct(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    await prisma.product.delete({ where: { id } });
    revalidatePath("/", "layout");
    revalidatePath("/podiums");
    revalidatePath("/shop");
    revalidatePath("/admin/podiums");
    revalidatePath("/admin/products");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="text-[#0056b3]" />
            Podiums
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage your podiums inventory (Sorted A–Z)</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link 
            href="/admin/podiums/subcategories" 
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold rounded-xl hover:bg-indigo-100 transition-colors"
          >
            <Layers size={18} />
            Manage Sub-Categories
          </Link>
          <Link 
            href="/admin/products/bulk-upload" 
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
          >
            Bulk Upload
          </Link>
          <Link 
            href="/admin/podiums/new" 
            className="flex items-center gap-2 px-4 py-2 bg-[#0056b3] text-white font-bold rounded-xl hover:bg-blue-800 transition-colors"
          >
            <Plus size={18} />
            Add Podium
          </Link>
        </div>
      </div>

      <ProductListTable
        products={products}
        deleteAction={deleteProduct}
        currentType="podiums"
        podiumSubCategories={podiumSubCategories}
      />
    </div>
  );
}
