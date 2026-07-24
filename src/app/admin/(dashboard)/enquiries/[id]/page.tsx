export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { Mail, ArrowLeft, Send } from "lucide-react";
import Link from "next/link";
import { ReplyForm } from "./ReplyForm";

export default async function AdminEnquiryDetailPage({ params }: { params: { id: string } }) {
  const enquiry = await prisma.enquiry.findUnique({
    where: { id: params.id }
  });

  if (!enquiry) {
    return notFound();
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href="/admin/enquiries" className="inline-flex items-center gap-2 text-slate-500 hover:text-[#0056b3] transition-colors font-medium">
        <ArrowLeft size={18} /> Back to Enquiries
      </Link>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2 mb-2">
              <Mail className="text-[#0056b3]" /> Enquiry Details
            </h1>
            <p className="text-slate-500">Received on {new Date(enquiry.createdAt).toLocaleString()}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-bold ${
            enquiry.status === 'New' ? 'bg-blue-100 text-blue-700' :
            enquiry.status === 'Replied' ? 'bg-green-100 text-green-700' :
            'bg-slate-100 text-slate-600'
          }`}>
            {enquiry.status}
          </span>
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
            <p className="text-lg font-medium text-slate-800">
              <a href={`tel:${enquiry.phone}`} className="hover:text-[#0056b3]">{enquiry.phone}</a>
            </p>
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
            <Send className="text-[#0056b3]" size={20} /> Reply to Customer
          </h3>
          <ReplyForm enquiryId={enquiry.id} name={enquiry.name} email={enquiry.email} />
        </div>

      </div>
    </div>
  );
}
