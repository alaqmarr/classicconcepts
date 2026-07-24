export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { ShoppingCart, ArrowLeft, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { StatusUpdater } from "./StatusUpdater";

export default async function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  const order = await prisma.cartOrder.findUnique({
    where: { id: params.id },
    include: {
      items: true
    }
  });

  if (!order) {
    return notFound();
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <Link href="/admin/orders" className="inline-flex items-center gap-2 text-slate-500 hover:text-[#0056b3] transition-colors font-medium">
        <ArrowLeft size={18} /> Back to Orders
      </Link>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2 mb-2">
              <ShoppingCart className="text-[#0056b3]" /> Order #{order.id.slice(-6).toUpperCase()}
            </h1>
            <p className="text-slate-500">Received on {new Date(order.createdAt).toLocaleString()}</p>
          </div>
          
          <StatusUpdater orderId={order.id} currentStatus={order.status} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 bg-slate-50 p-6 rounded-xl border border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Customer Name</h3>
            <p className="text-lg font-medium text-slate-800">{order.name}</p>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Email Address</h3>
            <p className="text-lg font-medium text-slate-800">
              <a href={`mailto:${order.email}`} className="hover:text-[#0056b3]">{order.email}</a>
            </p>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Phone Number</h3>
            <p className="text-lg font-medium text-slate-800">
              <a href={`tel:${order.phone}`} className="hover:text-[#0056b3]">{order.phone}</a>
            </p>
          </div>
          <div>
            <div className="flex justify-between items-center text-lg font-bold text-[#0056b3] pt-2 border-t border-slate-100">
              <span>Total Amount</span>
              <span>₹{((order.total || 0)).toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>

        {order.message && (
          <div className="mb-10">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Additional Message</h3>
            <div className="bg-white border border-slate-200 p-6 rounded-xl text-slate-700 leading-relaxed whitespace-pre-wrap">
              {order.message}
            </div>
          </div>
        )}

        <h3 className="text-xl font-bold text-slate-800 mb-4">Requested Items ({order.items.reduce((sum, item) => sum + item.quantity, 0)})</h3>
        
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 font-bold text-slate-600 text-sm w-20">Image</th>
                <th className="p-4 font-bold text-slate-600 text-sm">Product</th>
                <th className="p-4 font-bold text-slate-600 text-sm text-center">Qty</th>
                <th className="p-4 font-bold text-slate-600 text-sm text-right">Price</th>
                <th className="p-4 font-bold text-slate-600 text-sm text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    {item.productImage ? (
                      <img src={item.productImage} alt={item.productName} className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
                    ) : (
                      <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 border border-slate-200">
                        <ImageIcon size={24} />
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <p className="font-bold text-slate-800 mb-1">{item.productName}</p>
                    <p className="text-xs text-slate-500 font-mono">{item.productSlug}</p>
                    <Link href={`/shop/p/${item.productSlug}`} target="_blank" className="text-xs text-blue-600 hover:underline mt-1 inline-block">
                      View Product ↗
                    </Link>
                  </td>
                  <td className="p-4 text-center font-bold text-slate-800">{item.quantity}</td>
                  <td className="p-4 text-right text-slate-600">
                    {(item.price || 0) > 0 ? `₹${(item.price || 0).toLocaleString("en-IN")}` : 'POR'}
                  </td>
                  <td className="p-4 text-right font-bold text-[#0056b3]">
                    {(item.price || 0) > 0 ? `₹${(((item.price || 0) * item.quantity)).toLocaleString("en-IN")}` : 'POR'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
