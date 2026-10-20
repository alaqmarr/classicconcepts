export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { Mail, ArrowLeft, Send, MessageCircle } from "lucide-react";
import Link from "next/link";
import { ReplyForm } from "./ReplyForm";

function formatWhatsAppUrl(phone: string, name: string) {
  const digits = (phone || "").replace(/\D/g, "");
  const normalized = digits.length === 10 ? `91${digits}` : digits;
  const text = `Hello ${name}, Greetings from Classic Concepts regarding your enquiry.`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
}

export default async function AdminEnquiryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const enquiry = await prisma.enquiry.findUnique({
    where: { id }
  });

  if (!enquiry) {
    return notFound();
  }

  return (
    <div className="space-y-6 w-full">
      <Link href="/admin/enquiries" className="inline-flex items-center gap-2 text-slate-500 hover:text-[#0056b3] transition-colors font-medium">
        <ArrowLeft size={18} /> Back to Enquiries
      </Link>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2 mb-2">
              <Mail className="text-[#0056b3]" /> Enquiry Details
            </h1>
            <p className="text-slate-500">Received on {new Date(enquiry.createdAt).toLocaleString()}</p>
          </div>
          <div className="flex items-center gap-3">
            {enquiry.phone && (
              <a
                href={formatWhatsAppUrl(enquiry.phone, enquiry.name)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm font-bold hover:bg-emerald-100 transition-colors"
              >
                <MessageCircle size={16} />
                WhatsApp Client
              </a>
            )}
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${
              enquiry.status === 'New' ? 'bg-blue-100 text-blue-700' :
              enquiry.status === 'Replied' ? 'bg-green-100 text-green-700' :
              'bg-slate-100 text-slate-600'
            }`}>
              {enquiry.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 bg-slate-50 p-6 rounded-xl border border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Name</h3>
            <p className="text-lg font-medium text-slate-800">{enquiry.name}</p>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Email Address</h3>
            <p className="text-lg font-medium text-slate-800">
              <a href={`mailto:${enquiry.email}`} className="hover:text-[#0056b3]">{enquiry.email}</a>
            </p>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Phone Number</h3>
            <div className="flex items-center gap-3">
              <p className="text-lg font-medium text-slate-800">
                <a href={`tel:${enquiry.phone}`} className="hover:text-[#0056b3]">{enquiry.phone}</a>
              </p>
              {enquiry.phone && (
                <a
                  href={formatWhatsAppUrl(enquiry.phone, enquiry.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-[#25D366] hover:underline flex items-center gap-1"
                >
                  <MessageCircle size={14} /> Chat on WhatsApp
                </a>
              )}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Source</h3>
            <p className="text-lg font-medium text-slate-800">{enquiry.source}</p>
          </div>
        </div>

        <div className="mb-10">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Message</h3>
          <div className="bg-white border border-slate-200 p-6 rounded-xl text-slate-700 leading-relaxed whitespace-pre-wrap">
            {enquiry.message}
          </div>
        </div>

        <hr className="border-slate-100 my-8" />

        <div className="mt-8">
          <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Send className="text-[#0056b3]" size={20} /> Reply to Customer (Email or WhatsApp)
          </h3>
          <ReplyForm
            enquiryId={enquiry.id}
            name={enquiry.name}
            email={enquiry.email}
            phone={enquiry.phone}
            originalMessage={enquiry.message}
          />
        </div>

      </div>
    </div>
  );
}
