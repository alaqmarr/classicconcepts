"use client";

import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

export function ReplyForm({ enquiryId, name, email }: { enquiryId: string, name: string, email: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const message = formData.get("message") as string;

    try {
      const res = await fetch(`/api/admin/enquiry/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enquiryId, message }),
      });

      const result = await res.json();

      if (res.ok) {
        toast.success(`Reply sent to ${name} via email`);
        (e.target as HTMLFormElement).reset();
        router.refresh();
      } else {
        toast.error(result.error || "Failed to send reply");
      }
    } catch (err) {
      toast.error("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-bold text-slate-700 block mb-2">Your Reply Message (will be emailed to {email})</label>
        <textarea 
          name="message" 
          required 
          rows={6}
          placeholder={`Dear ${name},\n\nThank you for reaching out...`}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0056b3]/20 focus:border-[#0056b3] transition-all resize-none"
        />
      </div>

      <button 
        type="submit" 
        disabled={loading}
        className="flex items-center justify-center gap-2 bg-[#0056b3] text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-800 transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={18} />}
        {loading ? "Sending Reply..." : "Send Reply Email"}
      </button>
    </form>
  );
}
