import { SubmitForm } from "@/components/admin/SubmitForm";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { ShieldCheck } from "lucide-react";

export default async function AdminSetupPage() {
  const adminCount = await prisma.admin.count();

  if (adminCount > 0) {
    redirect("/admin/login");
  }

  async function createInitialAdmin(formData: FormData) {
    "use server";

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) return;

    // Check one more time in case of race condition
    const currentCount = await prisma.admin.count();
    if (currentCount > 0) {
      redirect("/admin/login");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.admin.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-soft border border-slate-100 p-8 text-center">
        <div className="w-16 h-16 bg-blue-50 text-[#0056b3] rounded-2xl flex items-center justify-center mx-auto mb-6">
          <ShieldCheck size={32} />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-800 mb-2 tracking-tight">Admin Setup</h1>
        <p className="text-slate-500 text-sm mb-8 font-medium">Welcome! Create the very first administrator account for Classic Concepts.</p>

        <SubmitForm action={createInitialAdmin} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Full Name</label>
            <input 
              type="text" 
              name="name" 
              required 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white transition-all text-sm"
              placeholder="e.g. John Doe"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Email Address</label>
            <input 
              type="email" 
              name="email" 
              required 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white transition-all text-sm"
              placeholder="admin@classicconcepts.in"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Password</label>
            <input 
              type="password" 
              name="password" 
              required 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white transition-all text-sm"
              placeholder="••••••••"
            />
          </div>
          
          <button 
            type="submit"
            className="w-full py-3.5 bg-[#0056b3] text-white font-bold rounded-xl hover:bg-blue-800 hover:shadow-hover transition-all duration-300 mt-4"
          >
            Create Admin Account
          </button>
        </SubmitForm>
      </div>
    </div>
  );
}
