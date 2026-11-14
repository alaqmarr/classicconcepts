export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { Trash2, ShieldCheck, FileText, Mail, Phone } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { getPublicSiteSettings } from "@/lib/public-data";
import { DataDeletionForm } from "./DataDeletionForm";

export const metadata: Metadata = {
  title: "User Data Deletion Instructions & Request",
  description:
    "Instructions and instant form to request deletion of your WhatsApp Business, Meta Login, and website contact data held by Classic Concepts Acrylic Private Limited.",
  alternates: {
    canonical: "https://classicconcepts.in/data-deletion",
  },
  openGraph: {
    title: "User Data Deletion Request | Classic Concepts",
    description:
      "How to delete your WhatsApp, Meta Login, and website data with Classic Concepts Acrylic Private Limited.",
    url: "https://classicconcepts.in/data-deletion",
    siteName: "Classic Concepts",
    type: "website",
  },
};

export default async function DataDeletionPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const [settings, params] = await Promise.all([
    getPublicSiteSettings(),
    searchParams,
  ]);
  const email = settings?.email || "sales@classicconcepts.in";
  const whatsapp = settings?.whatsappNumber || "+91 73372 20568";
  const cleanCode =
    typeof params?.code === "string"
      ? params.code.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40)
      : "";

  return (
    <div className="bg-[#f8fafc] min-h-screen pb-20">
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "User Data Deletion" },
        ]}
        title="User Data Deletion"
        description="Simple instructions and online form to permanently remove your WhatsApp Business, Meta Login, and website contact records from Classic Concepts."
        contentKeyPrefix="legal.datadeletion"
      />

      <div className="container mx-auto px-4 md:px-8 -mt-10 relative z-20">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg border border-slate-200/80 p-6 sm:p-10 md:p-12 space-y-8 text-slate-700 leading-relaxed">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-red-50 text-[#e31837] flex items-center justify-center shrink-0">
                <Trash2 size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Classic Concepts Acrylic Private Limited
                </p>
                <p className="text-xs text-slate-500">
                  Meta App &amp; WhatsApp Business User Data Deletion Portal
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <Link
                href="/privacy-policy"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
              >
                <ShieldCheck size={14} />
                <span>Privacy Policy</span>
              </Link>
              <Link
                href="/terms-of-service"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
              >
                <FileText size={14} />
                <span>Terms of Service</span>
              </Link>
            </div>
          </div>

          <DataDeletionForm initialCode={cleanCode || undefined} />

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">
              How to Request Data Deletion (3 Easy Ways)
            </h2>
            <p>
              You are in full control of the personal data you share with{" "}
              <strong>Classic Concepts Acrylic Private Limited</strong> across{" "}
              <strong>classicconcepts.in</strong>, Meta Login dialogs, and our
              WhatsApp Business number (<strong>{whatsapp}</strong>). Choose any
              one of the options below:
            </p>
            <ol className="list-decimal pl-6 space-y-2.5">
              <li>
                <strong>Online Form Above (Instant Confirmation Code):</strong>{" "}
                Enter your phone number or email in the form above and click{" "}
                <strong>Submit Deletion Request</strong>. You will immediately
                receive a unique tracking code.
              </li>
              <li>
                <strong>Directly on WhatsApp:</strong> Send the message{" "}
                <strong>DELETE MY DATA</strong> from your WhatsApp number to{" "}
                <strong>{whatsapp}</strong>. Our desk will log your request and
                remove your chat and contact profile.
              </li>
              <li>
                <strong>Via Facebook / Meta Settings or Email:</strong> Go to
                your Facebook Account{" "}
                <em>Settings &amp; Privacy &gt; Settings &gt; Apps and Websites</em>
                , remove our app, and click <em>Send Request</em>, or email{" "}
                <a
                  href={`mailto:${email}?subject=Data%20Deletion%20Request`}
                  className="text-[#0056b3] font-semibold underline"
                >
                  {email}
                </a>{" "}
                with the subject line <strong>Data Deletion Request</strong>.
              </li>
            </ol>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">
              What Data Is Deleted and Timeline
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Deleted Within 7 Business Days:</strong> Your WhatsApp
                chat threads, contact directory record, marketing opt-in lists,
                Meta app-scoped user IDs, and website enquiry messages.
              </li>
              <li>
                <strong>Legal Tax Exception:</strong> Where you have purchased
                goods and a GST tax invoice was issued, statutory invoice and
                accounting lines required under Indian GST law are kept offline
                solely for tax audit compliance and are never used for marketing
                or messaging.
              </li>
            </ul>
          </section>

          <section className="pt-4 border-t border-slate-200 flex flex-wrap items-center gap-6 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <Mail size={16} className="text-[#0056b3]" />
              <a
                href={`mailto:${email}`}
                className="font-semibold text-[#0056b3] hover:underline"
              >
                {email}
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Phone size={16} className="text-[#0056b3]" />
              <span>WhatsApp Support: {whatsapp}</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
