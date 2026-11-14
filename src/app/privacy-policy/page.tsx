export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Mail, Phone, MapPin, Trash2, FileText } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { getPublicSiteSettings } from "@/lib/public-data";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for Classic Concepts Acrylic Private Limited covering website enquiries, online orders, WhatsApp Business messaging, Meta login, and customer support.",
  alternates: {
    canonical: "https://classicconcepts.in/privacy-policy",
  },
  openGraph: {
    title: "Privacy Policy | Classic Concepts",
    description:
      "How Classic Concepts Acrylic Private Limited collects, uses, protects, and deletes customer data across classicconcepts.in and WhatsApp Business.",
    url: "https://classicconcepts.in/privacy-policy",
    siteName: "Classic Concepts",
    type: "website",
  },
};

export default async function PrivacyPolicyPage() {
  const settings = await getPublicSiteSettings();
  const address = (
    settings?.address || "Secunderabad, Hyderabad, Telangana, India"
  ).replace(/\\n/g, "\n");
  const phone = settings?.phone1 || "+91 73372 22876";
  const whatsapp = settings?.whatsappNumber || "+91 73372 20568";
  const email = settings?.email || "sales@classicconcepts.in";

  return (
    <div className="bg-[#f8fafc] min-h-screen pb-20">
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Privacy Policy" },
        ]}
        title="Privacy Policy"
        description="How Classic Concepts Acrylic Private Limited collects, uses, stores, and protects your information across our website, order tracking portal, and WhatsApp Business support."
        contentKeyPrefix="legal.privacy"
      />

      <div className="container mx-auto px-4 md:px-8 -mt-10 relative z-20">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg border border-slate-200/80 p-6 sm:p-10 md:p-12 space-y-8 text-slate-700 leading-relaxed">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#0056b3] flex items-center justify-center shrink-0">
                <ShieldCheck size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Classic Concepts Acrylic Private Limited
                </p>
                <p className="text-xs text-slate-500">
                  Effective Date: 1 January 2026 | Last Updated: 14 November 2026
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <Link
                href="/terms-of-service"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
              >
                <FileText size={14} />
                <span>Terms of Service</span>
              </Link>
              <Link
                href="/data-deletion"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-[#e31837] transition-colors"
              >
                <Trash2 size={14} />
                <span>Request Data Deletion</span>
              </Link>
            </div>
          </div>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">
              1. Who We Are and Scope of This Policy
            </h2>
            <p>
              This Privacy Policy explains how{" "}
              <strong>Classic Concepts Acrylic Private Limited</strong>{" "}
              (&quot;Classic Concepts&quot;, &quot;we&quot;, &quot;us&quot;, or
              &quot;our&quot;) handles personal and business contact information
              when you visit <strong>https://classicconcepts.in</strong>, place
              an enquiry or cart order, track a shipment through{" "}
              <strong>track.ccapl.cc</strong> or <strong>track.ccapl.in</strong>
              , sign in or connect through Meta Login dialogs, or message our
              official WhatsApp Business account and customer desk at{" "}
              <strong>whatsapp.ccapl.cc</strong>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">
              2. Information We Collect
            </h2>
            <p>
              We only collect information that you choose to share with us or
              that is needed to answer your enquiry and deliver your order:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Contact Details:</strong> Your name, phone number,
                WhatsApp number, email address, company or institution name,
                city, shipping address, and GST number (when you ask for a GST
                tax invoice).
              </li>
              <li>
                <strong>Enquiry and Order Information:</strong> Products you ask
                about, custom sizes or logo files you send for podiums or
                acrylic items, cart items, quotations, payment references,
                courier waybill numbers, and delivery status.
              </li>
              <li>
                <strong>WhatsApp Business and Meta Platform Data:</strong> When
                you message our WhatsApp Business number or use a Meta Login or
                business dialog connected to our app, we receive your WhatsApp
                phone number, display name, message text, attachments you send
                us, and message delivery or read status through the official
                Meta WhatsApp Business Cloud API.
              </li>
              <li>
                <strong>Basic Website Technical Data:</strong> Standard browser
                type, pages viewed, and session cookies needed to keep your
                shopping cart working and protect our site from spam.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">
              3. How We Use Your Information
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                To reply to your product questions, share catalogs, and prepare
                price quotes for acrylic podiums, displays, trophies, furniture,
                and custom jobs.
              </li>
              <li>
                To manufacture, pack, dispatch, and track your orders, and to
                issue valid GST tax invoices and payment receipts.
              </li>
              <li>
                To send helpful order updates on WhatsApp or email, such as
                order confirmation, dispatch details, and clickable courier
                tracking links.
              </li>
              <li>
                To send product updates or announcements on WhatsApp only where
                you have opted in, with a simple way to stop messages at any
                time by replying <strong>STOP</strong>.
              </li>
              <li>
                To maintain safety, prevent fraud, and meet legal and tax record
                rules under Indian law.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">
              4. Meta Login Dialog and WhatsApp Cloud API Disclosures
            </h2>
            <p>
              Our customer support and messaging tools connect to official Meta
              Platforms, Inc. APIs (including WhatsApp Business Cloud API and
              Facebook Login for Business where applicable):
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                We never sell, rent, or trade your WhatsApp number, Meta profile
                details, or chat messages to any third party or data broker.
              </li>
              <li>
                Information received from Meta APIs is used strictly to operate
                our own customer support, order updates, and authorized business
                messaging for Classic Concepts Acrylic Private Limited.
              </li>
              <li>
                If our automated assistant helps answer basic product or catalog
                questions on our website or WhatsApp, it only reads your message
                to give you a helpful answer and hand over to our human sales
                team when needed. We do not use your personal data to train
                public AI models.
              </li>
              <li>
                You can opt out of promotional WhatsApp messages at any time by
                replying <strong>STOP</strong> in WhatsApp.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">
              5. How We Share Information
            </h2>
            <p>
              We share limited information only with trusted partners required
              to complete your request:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Shipping and Transport Partners:</strong> Courier and
                freight companies (such as Delhivery, Blue Dart, Safexpress,
                DTDC, TCI Express, VRL, and local transport) receive your
                delivery name, address, and phone number to deliver your order.
              </li>
              <li>
                <strong>Messaging and Cloud Providers:</strong> Meta Platforms,
                Inc. delivers WhatsApp messages sent to or from our official
                WhatsApp Business number, and secure cloud hosting providers
                store our application data.
              </li>
              <li>
                <strong>Banks and Legal Authorities:</strong> Payment banks
                process UPI or bank transfers, and government or tax authorities
                receive statutory GST filings when required by Indian law.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">
              6. Data Storage, Security, and Retention
            </h2>
            <p>
              We protect your records using HTTPS encryption in transit,
              role-based staff logins, and regular encrypted backups. We keep
              enquiry and support history only as long as needed to serve you
              and honor product warranties. Tax invoices and accounting entries
              are retained for the period required under Indian GST and Companies
              Act rules.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">
              7. Your Rights and How to Delete Your Data
            </h2>
            <p>
              In line with India&apos;s Digital Personal Data Protection Act,
              2023 (DPDP Act) and Meta Platform rules, you have the right to ask
              for a copy of your personal data, correct inaccurate details,
              withdraw marketing consent, or request deletion of your personal
              data.
            </p>
            <p>
              To submit a data deletion request at any time, visit our{" "}
              <Link
                href="/data-deletion"
                className="text-[#0056b3] font-semibold underline hover:text-blue-800"
              >
                User Data Deletion Request page
              </Link>{" "}
              or email us directly at{" "}
              <a
                href={`mailto:${email}`}
                className="text-[#0056b3] font-semibold underline hover:text-blue-800"
              >
                {email}
              </a>
              .
            </p>
          </section>

          <section className="space-y-4 pt-4 border-t border-slate-200">
            <h2 className="text-xl font-bold text-slate-900">
              8. Contact Us and Grievance Officer
            </h2>
            <p>
              If you have any questions about this Privacy Policy or how your
              data is handled, please contact our Privacy and Grievance Desk:
            </p>
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-2.5 text-sm">
              <p className="font-bold text-slate-900">
                Classic Concepts Acrylic Private Limited
              </p>
              <div className="flex items-start gap-2.5">
                <MapPin size={16} className="text-[#0056b3] shrink-0 mt-1" />
                <span className="whitespace-pre-line">{address}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone size={16} className="text-[#0056b3] shrink-0" />
                <span>
                  Phone: {phone} | WhatsApp: {whatsapp}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail size={16} className="text-[#0056b3] shrink-0" />
                <a
                  href={`mailto:${email}`}
                  className="text-[#0056b3] font-semibold hover:underline"
                >
                  {email}
                </a>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
