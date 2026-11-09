export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { Package, Plus } from "lucide-react";
import Link from "next/link";
import { ProductListTable } from "@/components/admin/ProductListTable";
import { requireAdminSession } from "@/lib/auth";
import { revalidateCatalogPaths } from "@/lib/product-mutations";

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    where: { isPodium: false },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      sku: true,
      basePrice: true,
      discountPrice: true,
      stockStatus: true,
      isPodium: true,
      category: { select: { name: true } },
      podiumSubCategory: { select: { id: true, name: true } },
    },
  });

  async function deleteProduct(formData: FormData) {
    "use server";
    try {
      await requireAdminSession();
      const id = (formData.get("id") as string)?.trim();
      if (!id) return { error: "Missing product ID." };

      const existing = await prisma.product.findUnique({
        where: { id },
        select: { slug: true },
      });
      await prisma.product.delete({ where: { id } });
      revalidateCatalogPaths(existing?.slug);
      return { success: true };
    } catch (err: any) {
      console.error("Delete product error:", err);
      return { error: err?.message || "Failed to delete product." };
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="text-[#0056b3]" />
            Products
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your standard inventory (Sorted A–Z)
          </p>
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
