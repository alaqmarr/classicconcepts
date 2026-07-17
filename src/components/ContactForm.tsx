"use client";

import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export function ContactForm() {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      message: formData.get("message"),
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (res.ok) {
        toast.success("Enquiry sent successfully! We will get back to you soon.");
        (e.target as HTMLFormElement).reset();
      } else {
        toast.error(result.error || "Failed to send enquiry");
      }
    } catch (err) {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-soft border border-slate-100 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">Full Name *</label>
          <input 
            type="text" 
            name="name" 
            required 
            placeholder="John Doe"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0056b3]/20 focus:border-[#0056b3] transition-all"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">Email Address *</label>
          <input 
            type="email" 
            name="email" 
            required 
            placeholder="john@example.com"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0056b3]/20 focus:border-[#0056b3] transition-all"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-bold text-slate-700">Phone Number *</label>
        <input 
          type="tel" 
          name="phone" 
          required 
          placeholder="+91 98765 43210"
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0056b3]/20 focus:border-[#0056b3] transition-all"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold text-slate-700">Your Message *</label>
        <textarea 
          name="message" 
          required 
          rows={5}
          placeholder="How can we help you?"
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0056b3]/20 focus:border-[#0056b3] transition-all resize-none"
        />
      </div>

      <button 
        type="submit" 
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-[#0056b3] text-white px-6 py-4 rounded-xl font-bold text-lg hover:bg-blue-800 transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
        {loading ? "Sending..." : "Send Enquiry"}
      </button>
    </form>
  );
}
