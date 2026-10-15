export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Package, Plus } from "lucide-react";
import Link from "next/link";
import { ProductListTable } from "@/components/admin/ProductListTable";

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    where: { isPodium: false },
    orderBy: { name: 'asc' },
    include: { category: true, podiumSubCategory: true }
  });

  async function deleteProduct(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    await prisma.product.delete({ where: { id } });
    revalidatePath("/", "layout");
    revalidatePath("/shop");
    revalidatePath("/podiums");
    revalidatePath("/admin/products");
    revalidatePath("/admin/podiums");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="text-[#0056b3]" />
            Products
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage your standard inventory (Sorted A–Z)</p>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            href="/admin/products/bulk-upload" 
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
          >
            Bulk Upload
          </Link>
          <Link 
            href="/admin/products/new" 
            className="flex items-center gap-2 px-4 py-2 bg-[#0056b3] text-white font-bold rounded-xl hover:bg-blue-800 transition-colors"
          >
            <Plus size={18} />
            Add Product
          </Link>
        </div>
      </div>

      <ProductListTable
        products={products}
        deleteAction={deleteProduct}
        currentType="products"
      />
    </div>
  );
}
