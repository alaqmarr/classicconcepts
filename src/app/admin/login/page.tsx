"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import Image from "next/image";

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError(res.error);
      setLoading(false);
    } else {
      router.push("/admin");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      
      <div className="mb-8">
         <Image src="/logo.png" alt="Classic Concepts" width={220} height={65} className="object-contain drop-shadow-sm" style={{ height: "auto" }} />
      </div>

      <div className="max-w-md w-full bg-white rounded-2xl shadow-soft border border-slate-100 p-8 text-center relative overflow-hidden">
        {/* Subtle decorative background element */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-2xl opacity-50 -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="relative z-10">
          <div className="w-16 h-16 bg-blue-50 text-[#0056b3] rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800 mb-2 tracking-tight">Admin Login</h1>
          <p className="text-slate-500 text-sm mb-8 font-medium">Please enter your credentials to access the secure dashboard.</p>

          {error && (
            <div className="bg-red-50 text-[#e31837] px-4 py-3 rounded-lg text-sm font-bold mb-6 border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-left">
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
              disabled={loading}
              className="w-full py-3.5 bg-[#0056b3] text-white font-bold rounded-xl hover:bg-blue-800 hover:shadow-hover transition-all duration-300 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? "Authenticating..." : "Login"}
            </button>
          </form>
        </div>
      </div>
      
      <p className="mt-8 text-xs font-medium text-slate-400 text-center">
        &copy; {new Date().getFullYear()} Classic Concepts. All rights reserved.
      </p>
    </div>
  );
}
