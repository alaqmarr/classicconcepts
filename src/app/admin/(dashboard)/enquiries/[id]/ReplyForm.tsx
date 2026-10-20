"use client";

import { useState } from "react";
import { Send, Loader2, MessageCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

function normalizeWhatsAppPhone(phone: string): string {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

export function ReplyForm({
  enquiryId,
  name,
  email,
  phone,
  originalMessage,
}: {
  enquiryId: string;
  name: string;
  email: string;
  phone: string;
  originalMessage?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!message.trim()) {
      toast.error("Please enter a reply message.");
      return;
    }
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/enquiry/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enquiryId, message }),
      });

      const result = await res.json();

      if (res.ok) {
        toast.success(`Reply sent to ${name} via email`);
        setMessage("");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to send reply");
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  async function handleWhatsAppReply() {
    const cleanPhone = normalizeWhatsAppPhone(phone);
    if (!cleanPhone) {
      toast.error("Customer phone number is missing or invalid.");
      return;
    }

    const textToSend =
      message.trim() ||
      `Hello ${name},\n\nGreetings from Classic Concepts! We received your enquiry${
        originalMessage ? ` regarding:\n"${originalMessage.slice(0, 140)}"` : ""
      }.\n\nHow can we assist you further?`;

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textToSend)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");

    try {
      await fetch(`/api/admin/enquiry/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enquiryId, channel: "whatsapp", message: textToSend }),
      });
      toast.success("Opened WhatsApp & marked enquiry as Replied");
      router.refresh();
    } catch {
      // Non-blocking status update
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-bold text-slate-700 block mb-2">
          Your Reply Message (can be sent via Email to {email} or via WhatsApp to {phone})
        </label>
        <textarea
          name="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          placeholder={`Dear ${name},\n\nThank you for reaching out to Classic Concepts...`}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0056b3]/20 focus:border-[#0056b3] transition-all resize-none"
        />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-2 bg-[#0056b3] text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-800 transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={18} />}
          {loading ? "Sending Reply..." : "Send Reply Email"}
        </button>

        {phone && (
          <button
            type="button"
            onClick={handleWhatsAppReply}
            className="flex items-center justify-center gap-2 bg-[#25D366] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#1ebe57] transition-all shadow-sm"
          >
            <MessageCircle size={19} />
            Reply on WhatsApp
          </button>
        )}
      </div>
    </form>
  );
}
