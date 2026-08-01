"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, LayoutDashboard, LogOut, Package, Image as ImageIcon, Users, FolderTree, Menu, X, MapPin, Link2, Mail, ShoppingCart, BarChart } from "lucide-react";
import { signOut } from "next-auth/react";
import { useState } from "react";

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Analytics", href: "/admin/analytics", icon: BarChart },
    { name: "Orders", href: "/admin/orders", icon: ShoppingCart },
    { name: "Enquiries", href: "/admin/enquiries", icon: Mail },
    { name: "Products", href: "/admin/products", icon: Package },
    { name: "Podiums", href: "/admin/podiums", icon: Package },
    { name: "Categories", href: "/admin/categories", icon: FolderTree },
    { name: "Problem Statements", href: "/admin/problem-statements", icon: FolderTree },
    { name: "Industries", href: "/admin/industries", icon: FolderTree },
    { name: "Clients & Platforms", href: "/admin/clients", icon: Users },
    { name: "Useful Links", href: "/admin/useful-links", icon: Link2 },
    { name: "Resources", href: "/admin/resources", icon: FolderTree },
    { name: "Certificates", href: "/admin/certificates", icon: ImageIcon },
    { name: "Gallery", href: "/admin/gallery", icon: ImageIcon },
    { name: "Locations", href: "/admin/locations", icon: MapPin },
    { name: "Site Settings", href: "/admin/settings", icon: Settings },
    { name: "About Pages", href: "/admin/about-settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      
      {/* Mobile Top Bar */}
      <div className="md:hidden bg-white border-b border-slate-200 p-4 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#0056b3] rounded-lg flex items-center justify-center text-white font-bold">C</div>
          <span className="font-extrabold tracking-tight text-slate-800">Admin</span>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 bg-slate-100 rounded-lg text-slate-600">
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-800/50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 flex flex-col shadow-soft transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 md:h-screen md:sticky md:top-0 md:flex-shrink-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="p-6 border-b border-slate-100 flex items-center gap-3 hidden md:flex">
          <div className="w-8 h-8 bg-[#0056b3] rounded-lg flex items-center justify-center text-white font-bold">C</div>
          <span className="font-extrabold tracking-tight text-slate-800">Classic Concepts</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-semibold ${
                  isActive 
                  ? "bg-[#0056b3] text-white shadow-md shadow-blue-500/20" 
                  : "text-slate-600 hover:bg-slate-50 hover:text-[#0056b3]"
                }`}
              >
                <item.icon size={18} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={() => signOut({ callbackUrl: '/admin/login' })}
            className="flex items-center gap-3 px-4 py-3 w-full text-left rounded-xl transition-all duration-200 text-sm font-semibold text-slate-600 hover:bg-red-50 hover:text-[#e31837]"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <main className="flex-1 min-w-0 flex flex-col min-h-screen">
        <div className="bg-white border-b border-slate-200 p-4 md:p-6 flex justify-between items-center shadow-sm sticky top-0 z-10 hidden md:flex">
          <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Admin Portal</h2>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">Admin Session Active</span>
          </div>
        </div>
        <div className="p-4 md:p-8 flex-1 overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}
