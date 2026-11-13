export const dynamic = "force-dynamic";
import { Metadata } from "next";
import Link from "next/link";
import { getPublicSiteSettings } from "@/lib/public-data";
import { QRCodeSVG } from "qrcode.react";
import { getSiteContentMap, getContentValue } from "@/lib/site-content";
import { EditableText } from "@/components/inline-edit/EditableText";

export const metadata: Metadata = {
  title: "Online Payment Options | Classic Concepts",
  description:
    "Available payment methods for Classic Concepts including Pay Online, UPI, Bank Transfer, and Cheque/DD.",
};

const DEFAULT_BANK_DETAILS_HTML = `<p>You can transfer the money via NEFT, IMPS, or RTGS to the below bank account. Also, <strong>get a preapproval through Whatsapp number at +91-733 7222 876.</strong></p>
<p>While transferring funds, enter the Invoice Number or Proforma Invoice Number in the remarks.</p>
<p class="italic font-medium">Note: When depositing cash in our bank account, kindly add Rs. 300 as a service charge.</p>
<div class="pt-4 space-y-2">
  <p><strong class="font-semibold text-slate-900">Account Name:</strong> CLASSIC CONCEPTS ACRYLIC PRIVATE LIMITED</p>
  <p><strong class="font-semibold text-slate-900">Account Type:</strong> Current</p>
  <p><strong class="font-semibold text-slate-900">Account Number:</strong> 50 2000 9465 4185</p>
  <p><strong class="font-semibold text-slate-900">IFSC Code:</strong> HDFC0001378</p>
  <p><strong class="font-semibold text-slate-900">Bank Name:</strong> HDFC Bank</p>
  <p><strong class="font-semibold text-slate-900">Bank Branch:</strong> Bowenpally</p>
  <p><strong class="font-semibold text-slate-900">Bank Address:</strong> No.140/abc And 141/abc R.m.towers, Hasmatpet Road, Bowenpally Secunderabad Andhra Pradesh 500009</p>
</div>`;

const DEFAULT_CHEQUE_HTML = `<p>We accept post-dated cheques and demand draft payments towards the orders. All payments should be made in the name of <strong class="font-bold border-b border-slate-900 pb-[1px]">Classic Concepts</strong> only.</p>
<p class="text-red-600 font-medium">We do not entertain any other payment names.</p>
<p>Also, <strong>get a preapproval through Whatsapp number at +91-733 7222 876.</strong></p>`;

export default async function OnlinePaymentsPage() {
  const [settings, contentMap] = await Promise.all([
    getPublicSiteSettings(),
    getSiteContentMap(),
  ]);

  // UPI Deep Link Format: upi://pay?pa=UPI_ID&pn=PAYEE_NAME&cu=INR
  const upiLink = settings?.upiId
    ? `upi://pay?pa=${settings.upiId}&pn=${encodeURIComponent(
        settings.upiName || "Classic Concepts"
      )}&cu=INR`
    : null;

  return (
    <div className="bg-gradient-to-br from-[#f0f4ff] via-[#fffbf0] to-[#fff0f0] min-h-screen py-16 relative overflow-hidden">
      {/* Decorative background shape */}
      <div className="absolute top-[10%] right-[10%] w-[300px] h-[300px] bg-blue-100/50 rounded-full blur-[100px] pointer-events-none z-0"></div>
      <div className="container mx-auto px-4 w-full relative z-10">
        <EditableText
          as="h1"
          contentKey="payments.page.heading"
          value={getContentValue(contentMap, "payments.page.heading", "Available Payment Methods")}
          label="Payments Page Heading"
          className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-10 text-center md:text-left"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
          {/* Card 1: Pay Online */}
          <div className="bg-white border-2 border-[#0056b3] p-8 relative rounded-sm shadow-sm group hover:shadow-md transition-shadow">
            <span className="absolute top-4 right-6 text-6xl font-black text-slate-100 select-none z-0">
              1
            </span>
            <div className="relative z-10">
              <EditableText
                as="h2"
                contentKey="payments.card1.title"
                value={getContentValue(contentMap, "payments.card1.title", "Pay Online")}
                label="Card 1 Title"
                className="text-2xl font-bold text-slate-800 mb-6"
              />

              <div className="text-center mb-6">
                <Link
                  href="/contact"
                  className="inline-block bg-[#0056b3] text-white font-bold py-3 px-8 rounded-full hover:bg-blue-800 transition-colors shadow-md"
                >
                  Request Payment Link
                </Link>
                <p className="text-sm font-medium text-slate-600 mt-3">
                  [Net Banking, Debit/Credit Cards, and Online Wallets]
                </p>
              </div>

              <EditableText
                as="div"
                mode="multiline"
                contentKey="payments.card1.instructions"
                value={getContentValue(
                  contentMap,
                  "payments.card1.instructions",
                  "Click the above button to request a payment link.\n1. Enter the Amount in INR.\n2. Fill in your name, email ID, and phone number.\n3. Enter the payment purpose and proforma invoice number.\nComplete the payment using UPI, Net Banking, Debit/Credit Cards, or Online Wallets."
                )}
                label="Online Payment Instructions"
                className="text-sm text-slate-700 space-y-2 leading-relaxed whitespace-pre-line"
              />
            </div>
          </div>

          {/* Card 2: Pay via UPI */}
          <div className="bg-white border-2 border-[#0056b3] p-8 relative rounded-sm shadow-sm group hover:shadow-md transition-shadow">
            <span className="absolute top-4 right-6 text-6xl font-black text-slate-100 select-none z-0">
              2
            </span>
            <div className="relative z-10">
              <EditableText
                as="h2"
                contentKey="payments.card2.title"
                value={getContentValue(contentMap, "payments.card2.title", "Pay via UPI")}
                label="Card 2 Title"
                className="text-2xl font-bold text-slate-800 mb-6"
              />

              <div className="text-center mb-8">
                {upiLink ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-soft border border-slate-100 inline-block">
                      <QRCodeSVG value={upiLink} size={150} fgColor="#0056b3" />
                    </div>
                    <EditableText
                      settingField="upiId"
                      value={settings?.upiId || ""}
                      label="UPI ID"
                      className="text-sm font-bold text-slate-600 bg-slate-50 px-4 py-2 rounded-lg border border-slate-100"
                    />
                    <a
                      href={upiLink}
                      className="inline-block bg-[#0056b3] text-white font-bold py-3 px-8 rounded-full hover:bg-blue-800 transition-colors shadow-md mt-2 md:hidden"
                    >
                      Pay Now
                    </a>
                  </div>
                ) : (
                  <Link
                    href="/contact"
                    className="inline-block bg-[#0056b3] text-white font-bold py-3 px-8 rounded-full hover:bg-blue-800 transition-colors shadow-md"
                  >
                    Contact for UPI Details
                  </Link>
                )}
              </div>

              <EditableText
                as="p"
                mode="multiline"
                contentKey="payments.card2.instructions"
                value={getContentValue(
                  contentMap,
                  "payments.card2.instructions",
                  "Scan the QR code above or click the button to make the payment via UPI (GPay, PayTM, Amazon Pay, BHIM, PhonePe, or Bharat Pay). We accept all modes of UPI payments."
                )}
                label="UPI Instructions"
                className="text-sm text-slate-700 leading-relaxed"
              />
            </div>
          </div>

          {/* Card 3: Bank Transfer */}
          <div className="bg-white border-2 border-[#0056b3] p-8 relative rounded-sm shadow-sm group hover:shadow-md transition-shadow">
            <span className="absolute top-4 right-6 text-6xl font-black text-slate-100 select-none z-0">
              3
            </span>
            <div className="relative z-10">
              <EditableText
                as="h2"
                contentKey="payments.card3.title"
                value={getContentValue(contentMap, "payments.card3.title", "Bank Transfer")}
                label="Card 3 Title"
                className="text-2xl font-bold text-slate-800 mb-6"
              />

              <EditableText
                as="div"
                mode="html"
                contentKey="payments.card3.bankHtml"
                value={getContentValue(contentMap, "payments.card3.bankHtml", DEFAULT_BANK_DETAILS_HTML)}
                label="Bank Transfer & Account Details"
                className="text-sm text-slate-700 space-y-4 leading-relaxed"
              />
            </div>
          </div>

          {/* Card 4: Cheque / DD */}
          <div className="bg-white border-2 border-[#0056b3] p-8 relative rounded-sm shadow-sm group hover:shadow-md transition-shadow">
            <span className="absolute top-4 right-6 text-6xl font-black text-slate-100 select-none z-0">
              4
            </span>
            <div className="relative z-10">
              <EditableText
                as="h2"
                contentKey="payments.card4.title"
                value={getContentValue(contentMap, "payments.card4.title", "Cheque / DD")}
                label="Card 4 Title"
                className="text-2xl font-bold text-slate-800 mb-6"
              />

              <EditableText
                as="div"
                mode="html"
                contentKey="payments.card4.chequeHtml"
                value={getContentValue(contentMap, "payments.card4.chequeHtml", DEFAULT_CHEQUE_HTML)}
                label="Cheque / DD Instructions"
                className="text-sm text-slate-700 space-y-5 leading-relaxed"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
