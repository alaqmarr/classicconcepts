import { DeleteForm } from "@/components/admin/DeleteForm";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { ShoppingCart, Trash2, Eye } from "lucide-react";

export default async function AdminOrdersPage() {
  const orders = await prisma.cartOrder.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      items: true
    }
  });

  async function deleteOrder(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    await prisma.cartOrder.delete({ where: { id } });
    revalidatePath("/admin/orders");
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <ShoppingCart className="text-[#0056b3]" /> Cart Orders / Requests
          </h1>
          <p className="text-slate-500 mt-1 text-sm">View checkout requests from customers.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {orders.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <ShoppingCart size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">No orders yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 font-bold text-slate-600 text-sm">Date</th>
                  <th className="p-4 font-bold text-slate-600 text-sm">Name</th>
                  <th className="p-4 font-bold text-slate-600 text-sm">Email</th>
                  <th className="p-4 font-bold text-slate-600 text-sm text-center">Items</th>
                  <th className="p-4 font-bold text-slate-600 text-sm text-right">Total</th>
                  <th className="p-4 font-bold text-slate-600 text-sm">Status</th>
                  <th className="p-4 font-bold text-slate-600 text-sm text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-slate-600 text-sm">{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td className="p-4 font-bold text-slate-800">{order.name}</td>
                    <td className="p-4 text-slate-600 text-sm">
                      <a href={`mailto:${order.email}`} className="hover:text-[#0056b3] transition-colors">{order.email}</a>
                    </td>
                    <td className="p-4 text-center">
                      <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-xs font-bold">
                        {order.items.reduce((sum, item) => sum + item.quantity, 0)} Items
                      </span>
                    </td>
                    <td className="p-4 text-right font-bold text-slate-800">
                      ₹{(order.total || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                        order.status === 'New' ? 'bg-blue-100 text-blue-700' :
                        order.status === 'Processing' ? 'bg-yellow-100 text-yellow-700' :
                        order.status === 'Completed' ? 'bg-green-100 text-green-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="p-4 flex gap-3 justify-end">
                      <Link href={`/admin/orders/${order.id}`} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View Details">
                        <Eye size={18} />
                      </Link>
                      <DeleteForm action={deleteOrder}>
                        <input type="hidden" name="id" value={order.id} />
                        <button type="submit" className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                          <Trash2 size={18} />
                        </button>
                      </DeleteForm>
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
