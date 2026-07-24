export const dynamic = 'force-dynamic';
import { DeleteForm } from "@/components/admin/DeleteForm";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Package, Trash2, Plus, Edit2 } from "lucide-react";
import Link from "next/link";

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    where: { isPodium: false },
    orderBy: { createdAt: 'desc' },
    include: { category: true }
  });

  async function deleteProduct(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    await prisma.product.delete({ where: { id } });
    revalidatePath("/admin/products");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="text-[#0056b3]" />
            Products
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage your inventory</p>
        </div>
        <Link 
          href="/admin/products/new" 
          className="flex items-center gap-2 px-4 py-2 bg-[#0056b3] text-white font-bold rounded-xl hover:bg-blue-800 transition-colors"
        >
          <Plus size={18} />
          Add Product
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-bold">
                <th className="p-4">Product Name</th>
                <th className="p-4">Category</th>
                <th className="p-4">SKU / Price</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map(product => (
                <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-700">{product.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-slate-500 text-sm">
                    {product.category.name}
                  </td>
                  <td className="p-4 text-slate-500 text-sm">
                    <div>{product.sku || 'No SKU'}</div>
                    <div className="font-bold text-slate-700">₹{product.basePrice?.toLocaleString('en-IN') || '0'}</div>
                  </td>
                  <td className="p-4 text-right flex items-center justify-end gap-2">
                    <Link 
                      href={`/admin/products/${product.id}`}
                      className="p-2 text-slate-400 hover:text-[#0056b3] hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={18} />
                    </Link>
                    <DeleteForm action={deleteProduct}>
                      <input type="hidden" name="id" value={product.id} />
                      <button type="submit" className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </DeleteForm>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">
                    No products found. Create your first one!
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

