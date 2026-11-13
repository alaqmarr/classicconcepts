"use client";

import { useState } from "react";
import { Send, Loader2, MessageCircle, Sparkles, Wand2, Check, X } from "lucide-react";
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
  source,
}: {
  enquiryId: string;
  name: string;
  email: string;
  phone: string;
  originalMessage?: string;
  source?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [customTone, setCustomTone] = useState("");
  const [message, setMessage] = useState("");
  const [pendingReplyDraft, setPendingReplyDraft] = useState<string | null>(null);
  const router = useRouter();

  async function handleDraftWithAi(toneInstruction: string) {
    setAiLoading(true);
    try {
      const res = await fetch("/api/admin/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "draft_enquiry_reply",
          customerName: name,
          customerMessage: originalMessage || "Customer requested product & pricing details.",
          source: source || "Website Enquiry",
          tone: toneInstruction,
        }),
      });
      const json = await res.json();
      if (json?.ok && json.reply) {
        // NEVER overwrite reply textarea directly — require Admin confirmation!
        setPendingReplyDraft(json.reply);
      } else {
        const fallback = `Dear ${name},\n\nGreetings from Classic Concepts Acrylic Pvt. Ltd.!\n\nThank you for reaching out${
          originalMessage ? ` regarding "${originalMessage.slice(0, 120)}"` : ""
        }.\n\nWe make this directly at our 16,000 sq. ft. ISO 9001:2015 factory (Since 2008) using 100% imported clear cast acrylic, and we can make custom sizes as well as color-print or laser-engrave your organization's logo.\n\nPlease share your required quantity and delivery city/PIN code so we can send you our best factory-direct price quote right away.\n\nWarm regards,\nTeam Classic Concepts\n+91 73372 22876`;
        setPendingReplyDraft(fallback);
        toast(
          json?.error
            ? `${json.error}. Prepared reply draft below for your review.`
            : "Prepared reply draft below for your review.",
          { icon: "💡" }
        );
      }
    } catch {
      toast.error("Could not reach ACRIO reply assistant.");
    } finally {
      setAiLoading(false);
    }
  }

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
      {/* AI Smart Reply Assistant Bar */}
      <div className="bg-gradient-to-r from-indigo-50 via-blue-50/70 to-indigo-50/50 border border-indigo-200/80 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <Sparkles size={15} />
            </span>
            <div>
              <p className="text-xs font-extrabold text-slate-800">
                ACRIO (Claude Haiku 5.5) Enquiry Reply Drafter
              </p>
              <p className="text-[11px] text-slate-500">
                Prepares a plain-English email or WhatsApp draft for you to review and confirm before sending
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={aiLoading}
              onClick={() =>
                handleDraftWithAi(
                  "Friendly helpful quote reply recommending matching Classic Concepts products, pricing if known, and asking quantity plus delivery city."
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
            >
              {aiLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              Draft Quote &amp; Options
            </button>
            <button
              type="button"
              disabled={aiLoading}
              onClick={() =>
                handleDraftWithAi(
                  "Highlight custom acrylic manufacturing Since 2008, custom sizes, UV color or laser logo printing, and invite them to share their logo or sketch."
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold transition-colors disabled:opacity-50"
            >
              <Wand2 size={13} />
              Custom Branding / Sizing
            </button>
            <button
              type="button"
              disabled={aiLoading}
              onClick={() =>
                handleDraftWithAi(
                  "Short, crisp, friendly WhatsApp message (under 70 words) with next steps."
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold transition-colors disabled:opacity-50"
            >
              Short WhatsApp Note
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={customTone}
            onChange={(e) => setCustomTone(e.target.value)}
            placeholder="Optional custom instruction (e.g. 'Offer 10% bulk discount for 5+ podiums, dispatch in 4 days')..."
            className="flex-1 px-3 py-2 bg-white border border-indigo-200/80 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {customTone.trim() && (
            <button
              type="button"
              disabled={aiLoading}
              onClick={() => handleDraftWithAi(customTone)}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {aiLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              Draft Custom
            </button>
          )}
        </div>
      </div>

      {pendingReplyDraft !== null && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
              <Sparkles size={14} className="text-indigo-600" />
              Review ACRIO Reply Draft (Edit if needed, then Confirm to place in Reply Box)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPendingReplyDraft(null)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-bold text-slate-700"
              >
                <X size={13} />
                Discard
              </button>
              <button
                type="button"
                onClick={() => {
                  setMessage(pendingReplyDraft);
                  setPendingReplyDraft(null);
                  toast.success("Confirmed ACRIO draft placed into your reply box!");
                }}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold"
              >
                <Check size={13} />
                Confirm &amp; Use Draft
              </button>
            </div>
          </div>
          <textarea
            rows={5}
            value={pendingReplyDraft}
            onChange={(e) => setPendingReplyDraft(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-amber-200 rounded-xl text-xs text-slate-800"
          />
        </div>
      )}

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
