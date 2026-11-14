export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { FileText, ShieldCheck, Trash2, Mail, Phone, MapPin } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { getPublicSiteSettings } from "@/lib/public-data";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of Service for Classic Concepts Acrylic Private Limited covering website usage, quotations, custom acrylic orders, shipping, and WhatsApp Business support.",
  alternates: {
    canonical: "https://classicconcepts.in/terms-of-service",
  },
  openGraph: {
    title: "Terms of Service | Classic Concepts",
    description:
      "Terms and conditions for using classicconcepts.in, placing orders, and communicating with Classic Concepts Acrylic Private Limited on WhatsApp.",
    url: "https://classicconcepts.in/terms-of-service",
    siteName: "Classic Concepts",
    type: "website",
  },
};

export default async function TermsOfServicePage() {
  const settings = await getPublicSiteSettings();
  const address = (
    settings?.address || "Secunderabad, Hyderabad, Telangana, India"
  ).replace(/\\n/g, "\n");
  const phone = settings?.phone1 || "+91 73372 22876";
  const email = settings?.email || "sales@classicconcepts.in";

  return (
    <div className="bg-[#f8fafc] min-h-screen pb-20">
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Terms of Service" },
        ]}
        title="Terms of Service"
        description="Plain and clear terms for using classicconcepts.in, requesting quotations, ordering acrylic products, and connecting with us on WhatsApp."
        contentKeyPrefix="legal.terms"
      />

      <div className="container mx-auto px-4 md:px-8 -mt-10 relative z-20">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg border border-slate-200/80 p-6 sm:p-10 md:p-12 space-y-8 text-slate-700 leading-relaxed">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#0056b3] flex items-center justify-center shrink-0">
                <FileText size={24} />
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
                href="/privacy-policy"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
              >
                <ShieldCheck size={14} />
                <span>Privacy Policy</span>
              </Link>
              <Link
                href="/data-deletion"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-[#e31837] transition-colors"
              >
                <Trash2 size={14} />
                <span>Data Deletion</span>
              </Link>
            </div>
          </div>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">
              1. Agreement to Terms
            </h2>
            <p>
              By accessing <strong>https://classicconcepts.in</strong>, placing
              an order or enquiry, using our shipment tracking links at{" "}
              <strong>track.ccapl.cc</strong> or <strong>track.ccapl.in</strong>
              , signing in through a Meta Login dialog, or messaging our
              official WhatsApp Business number, you agree to these Terms of
              Service with{" "}
              <strong>Classic Concepts Acrylic Private Limited</strong>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">
              2. Products, Quotations, and Custom Fabrication
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                We manufacture cast acrylic podiums, lecterns, display stands,
                sign holders, trophies, furniture, and custom acrylic items at
                our ISO 9001:2015 facility in Secunderabad, India.
              </li>
              <li>
                Product photos and dimensions on our website are for clear
                reference. Minor tolerances in sheet thickness or hand-finished
                joints are normal in cast acrylic manufacturing.
              </li>
              <li>
                For custom sizes, UV printing, laser engraving, or logo work,
                production starts once you approve the final drawing or quote
                and complete the agreed advance payment. Custom-made items
                cannot be cancelled or returned once sheet cutting or printing
                has started.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">
              3. Pricing, GST, and Payments
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Unless noted otherwise on a written quotation, prices are listed
                in Indian Rupees (INR), and applicable GST and packing or
                freight charges are shown clearly on your proforma or tax
                invoice.
              </li>
              <li>
                Payments may be made through our authorized UPI ID, NEFT/RTGS
                bank transfer, or approved card/payment links shared by our
                official sales team.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">
              4. Dispatch, Shipping, and Order Tracking
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Dispatch timelines depend on order quantity and customization.
                Once handed over to the courier or transport partner, we share
                your tracking link (such as{" "}
                <strong>track.ccapl.cc/your-order-id</strong>) on WhatsApp or
                email so you can follow live delivery updates on the carrier
                page.
              </li>
              <li>
                Please inspect outer wooden crates or cartons at the time of
                delivery. If any transit damage occurs, share clear unboxing
                photos or video with our support team within 48 hours of
                delivery so we can coordinate quick support or claim assistance.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">
              5. WhatsApp Business Messaging and Acceptable Use
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                When you contact us on WhatsApp or submit your phone number on
                our enquiry or checkout forms, you authorize us to message you
                regarding your enquiry, quote, invoice, dispatch, and support.
              </li>
              <li>
                You can stop promotional WhatsApp messages at any time by
                replying <strong>STOP</strong>.
              </li>
              <li>
                You agree not to misuse our website, Meta integrations, or
                WhatsApp channel for spam, unlawful content, unauthorized
                scraping, or attempts to disrupt our servers.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">
              6. Intellectual Property
            </h2>
            <p>
              All product designs, photographs, drawings, brand logos, text, and
              downloadable catalogs on <strong>classicconcepts.in</strong>{" "}
              belong to Classic Concepts Acrylic Private Limited and may not be
              copied or reused commercially without written permission. Customer
              logos shared with us for custom branding remain the property of
              the respective customer.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">
              7. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by law, Classic Concepts Acrylic
              Private Limited shall not be liable for indirect or consequential
              business losses or courier delays outside our reasonable control.
              Our total liability in relation to any product order shall not
              exceed the invoice amount paid for the specific item concerned.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">
              8. Governing Law and Jurisdiction
            </h2>
            <p>
              These Terms of Service are governed by the laws of India. Any
              disputes arising out of or connected to our website, orders, or
              services shall be subject to the exclusive jurisdiction of the
              competent courts in Secunderabad and Hyderabad, Telangana, India.
            </p>
          </section>

          <section className="space-y-4 pt-4 border-t border-slate-200">
            <h2 className="text-xl font-bold text-slate-900">
              9. Contact Information
            </h2>
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
                <span>{phone}</span>
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
