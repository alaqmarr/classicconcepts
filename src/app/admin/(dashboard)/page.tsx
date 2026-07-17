import { prisma } from "@/lib/db";
import { Package, Users, Image as ImageIcon } from "lucide-react";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const [productCount, categoryCount, clientCount] = await Promise.all([
    prisma.product.count(),
    prisma.category.count(),
    prisma.client.count(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Overview</h1>
        <p className="text-slate-500 font-medium mt-2">Welcome to your Classic Concepts administrative dashboard.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100 flex flex-col group hover:shadow-hover hover:-translate-y-1 transition-all duration-300">
          <div className="flex justify-between items-start mb-6">
            <div className="w-12 h-12 bg-blue-50 text-[#0056b3] rounded-xl flex items-center justify-center group-hover:bg-[#0056b3] group-hover:text-white transition-colors duration-300">
              <Package size={24} />
            </div>
          </div>
          <div>
            <h3 className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-1">Total Products</h3>
            <span className="text-4xl font-extrabold text-slate-800">{productCount}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100 flex flex-col group hover:shadow-hover hover:-translate-y-1 transition-all duration-300">
          <div className="flex justify-between items-start mb-6">
            <div className="w-12 h-12 bg-blue-50 text-[#0056b3] rounded-xl flex items-center justify-center group-hover:bg-[#0056b3] group-hover:text-white transition-colors duration-300">
              <Package size={24} />
            </div>
          </div>
          <div>
            <h3 className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-1">Categories</h3>
            <span className="text-4xl font-extrabold text-slate-800">{categoryCount}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100 flex flex-col group hover:shadow-hover hover:-translate-y-1 transition-all duration-300">
          <div className="flex justify-between items-start mb-6">
            <div className="w-12 h-12 bg-blue-50 text-[#0056b3] rounded-xl flex items-center justify-center group-hover:bg-[#0056b3] group-hover:text-white transition-colors duration-300">
              <Users size={24} />
            </div>
          </div>
          <div>
            <h3 className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-1">Clients Configured</h3>
            <span className="text-4xl font-extrabold text-slate-800">{clientCount}</span>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
        <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-8">
           <h3 className="text-lg font-extrabold text-slate-800 mb-4">Quick Actions</h3>
           <div className="space-y-3">
             <Link href="/admin/settings" className="block p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-all font-semibold text-slate-700">Update Site Settings & UPI</Link>
             <Link href="/admin/products" className="block p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-all font-semibold text-slate-700">Manage Products Inventory</Link>
             <Link href="/admin/gallery" className="block p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-all font-semibold text-slate-700">Update Homepage Gallery</Link>
           </div>
        </div>
      </div>
    </div>
  );
}
