import { Metadata } from "next";
import { prisma } from "@/lib/db";
import { QRCodeSVG } from "qrcode.react";

export const metadata: Metadata = {
  title: "Online Payment Options | Classic Concepts",
  description: "Available payment methods for Classic Concepts including Pay Online, UPI, Bank Transfer, and Cheque/DD.",
};

export default async function OnlinePaymentsPage() {
  const settings = await prisma.siteSetting.findUnique({ where: { id: "default" } });
  
  // UPI Deep Link Format: upi://pay?pa=UPI_ID&pn=PAYEE_NAME&cu=INR
  const upiLink = settings?.upiId ? `upi://pay?pa=${settings.upiId}&pn=${encodeURIComponent(settings.upiName || 'Classic Concepts')}&cu=INR` : null;
  return (
    <div className="bg-gradient-to-br from-[#f0f4ff] via-[#fffbf0] to-[#fff0f0] min-h-screen py-16 relative overflow-hidden">
      {/* Decorative background shape */}
      <div className="absolute top-[10%] right-[10%] w-[300px] h-[300px] bg-blue-100/50 rounded-full blur-[100px] pointer-events-none z-0"></div>
      <div className="container mx-auto px-4 max-w-7xl">
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-10 text-center md:text-left">
          Available Payment Methods
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Card 1: Pay Online */}
          <div className="bg-white border-2 border-[#0056b3] p-8 relative rounded-sm shadow-sm group hover:shadow-md transition-shadow">
            <span className="absolute top-4 right-6 text-6xl font-black text-slate-100 select-none z-0">1</span>
            <div className="relative z-10">
              <h2 className="text-2xl font-bold text-slate-800 mb-6">Pay Online</h2>
              
              <div className="text-center mb-6">
                <a 
                  href="#" 
                  className="inline-block bg-[#0056b3] text-white font-bold py-3 px-8 rounded-full hover:bg-blue-800 transition-colors shadow-md"
                >
                  Click Here Now
                </a>
                <p className="text-sm font-medium text-slate-600 mt-3">[Net Banking, Debit/Credit Cards, and Online Wallets]</p>
              </div>

              <div className="text-sm text-slate-700 space-y-4 leading-relaxed">
                <p>Click the above button to make the payment. Clicking the button will open a new page, and a form will be presented. Here are the steps to follow:</p>
                <ol className="list-decimal pl-5 space-y-2 font-medium text-slate-800">
                  <li>Enter the Amount in INR.</li>
                  <li>Fill in your name, email ID, and phone number.</li>
                  <li>Enter the 'payment purpose'.</li>
                  <li>Enter the 'proforma invoice' number if available.</li>
                </ol>
                <p>Complete the payment using UPI, Net Banking, Debit/Credit Cards, and Online Wallets.</p>
              </div>
            </div>
          </div>

          {/* Card 2: Pay via UPI */}
          <div className="bg-white border-2 border-[#0056b3] p-8 relative rounded-sm shadow-sm group hover:shadow-md transition-shadow">
            <span className="absolute top-4 right-6 text-6xl font-black text-slate-100 select-none z-0">2</span>
            <div className="relative z-10">
              <h2 className="text-2xl font-bold text-slate-800 mb-6">Pay via UPI</h2>
              
              <div className="text-center mb-8">
                {upiLink ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-soft border border-slate-100 inline-block">
                      <QRCodeSVG value={upiLink} size={150} fgColor="#0056b3" />
                    </div>
                    <span className="text-sm font-bold text-slate-600 bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">{settings.upiId}</span>
                    <a 
                      href={upiLink}
                      className="inline-block bg-[#0056b3] text-white font-bold py-3 px-8 rounded-full hover:bg-blue-800 transition-colors shadow-md mt-2 md:hidden"
                    >
                      Pay Now
                    </a>
                  </div>
                ) : (
                  <a 
                    href="#" 
                    className="inline-block bg-[#0056b3] text-white font-bold py-3 px-8 rounded-full hover:bg-blue-800 transition-colors shadow-md"
                  >
                    Click Here Now
                  </a>
                )}
              </div>

              <div className="text-sm text-slate-700 leading-relaxed">
                <p>Scan the QR code above or click the button to make the payment via UPI (GPay, PayTM, Amazon Pay, BHIM, PhonePe, or Bharat Pay). We accept all modes of UPI payments.</p>
              </div>
            </div>
          </div>

          {/* Card 3: Bank Transfer */}
          <div className="bg-white border-2 border-[#0056b3] p-8 relative rounded-sm shadow-sm group hover:shadow-md transition-shadow">
            <span className="absolute top-4 right-6 text-6xl font-black text-slate-100 select-none z-0">3</span>
            <div className="relative z-10">
              <h2 className="text-2xl font-bold text-slate-800 mb-6">Bank Transfer</h2>
              
              <div className="text-sm text-slate-700 space-y-4 leading-relaxed">
                <p>You can transfer the money via NEFT, IMPS, or RTGS to the below bank account. Also, <strong>get a preapproval through Whatsapp number at +91-733 7222 876.</strong></p>
                <p>While transferring funds, enter the Invoice Number or Proforma Invoice Number in the remarks.</p>
                <p className="italic font-medium">Note: When depositing cash in our bank account, kindly add Rs. 300 as a service charge.</p>
                
                <div className="pt-4 space-y-2">
                  <p><span className="font-semibold text-slate-900">Account Name:</span> CLASSIC CONCEPTS ACRYLIC PRIVATE LIMITED</p>
                  <p><span className="font-semibold text-slate-900">Account Type:</span> Current</p>
                  <p><span className="font-semibold text-slate-900">Account Number:</span> 50 2000 9465 4185</p>
                  <p><span className="font-semibold text-slate-900">IFSC Code:</span> HDFC0001378</p>
                  <p><span className="font-semibold text-slate-900">Bank Name:</span> HDFC Bank</p>
                  <p><span className="font-semibold text-slate-900">Bank Branch:</span> Bowenpally</p>
                  <p><span className="font-semibold text-slate-900">Bank Address:</span> No.140/abc And 141/abc R.m.towers, Hasmatpet Road, Bowenpally Secunderabad Andhra Pradesh 500009</p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Cheque / DD */}
          <div className="bg-white border-2 border-[#0056b3] p-8 relative rounded-sm shadow-sm group hover:shadow-md transition-shadow">
            <span className="absolute top-4 right-6 text-6xl font-black text-slate-100 select-none z-0">4</span>
            <div className="relative z-10">
              <h2 className="text-2xl font-bold text-slate-800 mb-6">Cheque / DD</h2>
              
              <div className="text-sm text-slate-700 space-y-5 leading-relaxed">
                <p>We accept post-dated cheques and demand draft payments towards the orders. All payments should be made in the name of <span className="font-bold border-b border-slate-900 pb-[1px]">Classic Concepts</span> only.</p>
                
                <p className="text-red-600 font-medium">We do not entertain any other payment names.</p>
                
                <p>Also, <strong>get a preapproval through Whatsapp number at +91-733 7222 876.</strong></p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
