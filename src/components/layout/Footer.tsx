import Link from "next/link";
import Image from "next/image";
import { FaYoutube, FaLinkedinIn, FaInstagram, FaFacebookF, FaXTwitter } from "react-icons/fa6";
import { QRCodeSVG } from "qrcode.react";

export function Footer({ settings }: { settings: any }) {
  // UPI Deep Link Format: upi://pay?pa=UPI_ID&pn=PAYEE_NAME&cu=INR
  const upiLink = settings?.upiId ? `upi://pay?pa=${settings.upiId}&pn=${encodeURIComponent(settings.upiName || 'Classic Concepts')}&cu=INR` : null;

  return (
    <footer className="bg-slate-50 pt-20 pb-8 border-t border-slate-100 text-[13px] text-slate-600 relative overflow-hidden">
      {/* Decorative subtle gradient */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent"></div>
      
      <div className="container mx-auto px-4 md:px-8 relative z-10">
        <div className="flex flex-wrap justify-between gap-12 mb-16">
          
          {/* Logo & Socials */}
          <div className="w-full md:w-[15%]">
             <div className="mb-8">
               <Image src="/logo.png" alt="Classic Concepts" width={200} height={60} className="object-contain" style={{ height: "auto" }} />
             </div>
             <div className="flex gap-3">
               <a href="#" className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center hover:bg-[#0056b3] hover:text-white transition-all shadow-sm hover:shadow-md transform hover:-translate-y-1"><FaYoutube size={16} /></a>
               <a href="#" className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center hover:bg-[#0056b3] hover:text-white transition-all shadow-sm hover:shadow-md transform hover:-translate-y-1"><FaLinkedinIn size={16} /></a>
               <a href="#" className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center hover:bg-[#0056b3] hover:text-white transition-all shadow-sm hover:shadow-md transform hover:-translate-y-1"><FaInstagram size={16} /></a>
               <a href="#" className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center hover:bg-[#0056b3] hover:text-white transition-all shadow-sm hover:shadow-md transform hover:-translate-y-1"><FaXTwitter size={16} /></a>
               <a href="#" className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center hover:bg-[#0056b3] hover:text-white transition-all shadow-sm hover:shadow-md transform hover:-translate-y-1"><FaFacebookF size={16} /></a>
             </div>
          </div>

          {/* Shop For & Quick Links */}
          <div className="w-full md:w-[15%] flex flex-col gap-8">
            <div>
              <h4 className="font-extrabold text-slate-800 mb-5 uppercase tracking-wider text-xs">Shop For</h4>
              <ul className="space-y-3">
                <li><Link href="/podiums" className="hover:text-[#0056b3] transition-colors">Acrylic Podiums</Link></li>
                <li><Link href="/furniture" className="hover:text-[#0056b3] transition-colors">Acrylic Furniture</Link></li>
                <li><Link href="/interiors" className="hover:text-[#0056b3] transition-colors">Acrylic Interiors</Link></li>
                <li><Link href="/displays" className="hover:text-[#0056b3] transition-colors">Acrylic Display Units</Link></li>
                <li><Link href="/studio" className="hover:text-[#0056b3] transition-colors">TV Studio Interiors</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-extrabold text-slate-800 mb-5 uppercase tracking-wider text-xs">Quick Links</h4>
              <ul className="space-y-3">
                <li><Link href="/" className="hover:text-[#0056b3] transition-colors">Home</Link></li>
                <li><Link href="/shipping" className="hover:text-[#0056b3] transition-colors">Shipping & Delivery</Link></li>
                <li><Link href="/returns" className="hover:text-[#0056b3] transition-colors">Returns & Refunds</Link></li>
                <li><Link href="/payment-policy" className="hover:text-[#0056b3] transition-colors">Payment Policy</Link></li>
                <li><Link href="/contact" className="hover:text-[#0056b3] transition-colors">Contact us</Link></li>
              </ul>
            </div>
          </div>

          {/* Other Products */}
          <div className="w-full md:w-[15%]">
            <h4 className="font-extrabold text-slate-800 mb-5 uppercase tracking-wider text-xs">Other Products</h4>
            <ul className="space-y-3">
              <li><Link href="/lighting" className="hover:text-[#0056b3] transition-colors">Acrylic Lighting</Link></li>
              <li><Link href="/mementos" className="hover:text-[#0056b3] transition-colors">Acrylic Mementos</Link></li>
              <li><Link href="/boxes" className="hover:text-[#0056b3] transition-colors">Acrylic Boxes</Link></li>
              <li><Link href="/fb" className="hover:text-[#0056b3] transition-colors">Acrylic F&B Products</Link></li>
              <li><Link href="/utility" className="hover:text-[#0056b3] transition-colors">Acrylic Utility Items</Link></li>
              <li><Link href="/industrial" className="hover:text-[#0056b3] transition-colors">Industrial Products</Link></li>
              <li><Link href="/signage" className="hover:text-[#0056b3] transition-colors">Acrylic Signage</Link></li>
              <li><Link href="/brochure" className="hover:text-[#0056b3] transition-colors">Brochure Holder</Link></li>
            </ul>
          </div>

          {/* Address & Contact */}
          <div className="w-full md:w-[20%]">
            <h4 className="font-extrabold text-slate-800 mb-5 uppercase tracking-wider text-xs">Address</h4>
            <p className="mb-6 leading-loose whitespace-pre-line">
              {(settings?.address || 'M/s. Classic Concepts Acrylic Private Limited,\n1-6-44/2, Muthiyam Reddy Estate,\nSecunderabad - 500 015, India.').replace(/\\n/g, '\n')}
            </p>
            <h4 className="font-extrabold text-slate-800 mb-3 uppercase tracking-wider text-xs">Contact</h4>
            <p className="mb-6 space-y-1">
              <span className="block hover:text-[#0056b3] cursor-pointer">{settings?.phone1 || '+91 7901 650 662'}</span>
              {settings?.phone2 && <span className="block hover:text-[#0056b3] cursor-pointer">{settings.phone2}</span>}
            </p>
            <h4 className="font-extrabold text-slate-800 mb-3 uppercase tracking-wider text-xs">Email</h4>
            <p>
              <a href={`mailto:${settings?.email || 'info@classicconcepts.in'}`} className="hover:text-[#0056b3] transition-colors font-semibold">{settings?.email || 'info@classicconcepts.in'}</a>
            </p>
          </div>

          {/* Payment Info */}
          <div className="w-full md:w-[20%]">
            <h4 className="font-extrabold text-slate-800 mb-5 uppercase tracking-wider text-xs">Payment Info</h4>
            <div className="flex flex-col gap-4">
              
              {upiLink && (
                <div className="bg-white p-4 rounded-xl shadow-soft border border-slate-100 flex flex-col items-center gap-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Scan & Pay via UPI</span>
                  <div className="bg-white p-2 rounded-lg border border-slate-50">
                    <QRCodeSVG value={upiLink} size={100} fgColor="#0056b3" />
                  </div>
                  <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded">{settings.upiId}</span>
                </div>
              )}

              <div className="bg-white p-4 rounded-xl shadow-soft border border-slate-100">
                <span className="text-slate-800 font-bold block mb-3 text-center text-xs tracking-wide">We Accept</span>
                <div className="flex flex-wrap justify-center gap-2">
                  {/* Generic Payment Badges */}
                  <span className="bg-slate-50 text-slate-600 text-[10px] px-2.5 py-1.5 rounded font-semibold border border-slate-100">UPI</span>
                  <span className="bg-slate-50 text-slate-600 text-[10px] px-2.5 py-1.5 rounded font-semibold border border-slate-100">PayPal</span>
                  <span className="bg-slate-50 text-slate-600 text-[10px] px-2.5 py-1.5 rounded font-semibold border border-slate-100">VISA</span>
                  <span className="bg-slate-50 text-slate-600 text-[10px] px-2.5 py-1.5 rounded font-semibold border border-slate-100">MasterCard</span>
                </div>
                <div className="text-center text-[10px] mt-3 text-slate-400 font-medium">50+ Banks Supported</div>
              </div>
            </div>
          </div>
          
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-200 pt-6 flex flex-col md:flex-row justify-between items-center text-xs text-slate-500">
          <p className="font-medium">
            Website Managed by <a href="https://alaqmar.dev" target="_blank" rel="noopener noreferrer" className="text-[#0056b3] hover:underline font-bold">The Web Sensei</a>
          </p>
          <p className="font-semibold text-center md:text-left text-slate-700">
            Copyright &copy; {new Date().getFullYear()} - All Rights Reserved - Classic Concepts
          </p>
          <div className="flex gap-6 mt-4 md:mt-0 font-medium">
            <Link href="/privacy" className="hover:text-[#0056b3] transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-[#0056b3] transition-colors">Terms of Services</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
