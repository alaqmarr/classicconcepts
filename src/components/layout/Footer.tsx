import Link from "next/link";
import Image from "next/image";
import { FaYoutube, FaLinkedinIn, FaInstagram, FaFacebookF, FaXTwitter } from "react-icons/fa6";
import { QRCodeSVG } from "qrcode.react";

export function Footer({ settings }: { settings: any }) {
  // UPI Deep Link Format: upi://pay?pa=UPI_ID&pn=PAYEE_NAME&cu=INR
  const upiLink = settings?.upiId ? `upi://pay?pa=${settings.upiId}&pn=${encodeURIComponent(settings.upiName || 'Classic Concepts')}&cu=INR` : null;

  return (
    <footer className="bg-[#0c1a40] pt-20 pb-8 text-white/70 text-[13px] relative overflow-hidden">
      
      <div className="container mx-auto px-4 md:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 mb-16">
          
          {/* Logo & Socials */}
          <div className="col-span-1 lg:col-span-1">
             <div className="mb-8 bg-white/10 p-4 rounded-xl inline-block">
               <Image src="/logo.png" alt="Classic Concepts" width={180} height={50} className="object-contain" style={{ height: "auto" }} />
             </div>
             <div className="flex flex-wrap gap-2">
               <a href="#" className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-[#e31837] transition-colors"><FaYoutube size={14} /></a>
               <a href="#" className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-[#e31837] transition-colors"><FaLinkedinIn size={14} /></a>
               <a href="#" className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-[#e31837] transition-colors"><FaInstagram size={14} /></a>
               <a href="#" className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-[#e31837] transition-colors"><FaXTwitter size={14} /></a>
               <a href="#" className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-[#e31837] transition-colors"><FaFacebookF size={14} /></a>
             </div>
          </div>

          {/* Shop For */}
          <div className="col-span-1 lg:col-span-1">
            <h4 className="font-extrabold text-white mb-5 uppercase tracking-wider text-xs">Shop For</h4>
            <ul className="space-y-3">
              <li><Link href="/podiums" className="hover:text-blue-300 transition-colors">Acrylic Podiums</Link></li>
              <li><Link href="/furniture" className="hover:text-blue-300 transition-colors">Acrylic Furniture</Link></li>
              <li><Link href="/interiors" className="hover:text-blue-300 transition-colors">Acrylic Interiors</Link></li>
              <li><Link href="/displays" className="hover:text-blue-300 transition-colors">Acrylic Display Units</Link></li>
              <li><Link href="/studio" className="hover:text-blue-300 transition-colors">TV Studio Interiors</Link></li>
            </ul>
          </div>

          {/* Quick Links */}
          <div className="col-span-1 lg:col-span-1">
            <h4 className="font-extrabold text-white mb-5 uppercase tracking-wider text-xs">Quick Links</h4>
            <ul className="space-y-3">
              <li><Link href="/" className="hover:text-blue-300 transition-colors">Home</Link></li>
              <li><Link href="/shipping" className="hover:text-blue-300 transition-colors">Shipping & Delivery</Link></li>
              <li><Link href="/returns" className="hover:text-blue-300 transition-colors">Returns & Refunds</Link></li>
              <li><Link href="/payment-policy" className="hover:text-blue-300 transition-colors">Payment Policy</Link></li>
              <li><Link href="/contact" className="hover:text-blue-300 transition-colors">Contact us</Link></li>
            </ul>
          </div>

          {/* Other Products */}
          <div className="col-span-1 lg:col-span-1">
            <h4 className="font-extrabold text-white mb-5 uppercase tracking-wider text-xs">Other Products</h4>
            <ul className="space-y-3">
              <li><Link href="/lighting" className="hover:text-blue-300 transition-colors">Acrylic Lighting</Link></li>
              <li><Link href="/mementos" className="hover:text-blue-300 transition-colors">Acrylic Mementos</Link></li>
              <li><Link href="/boxes" className="hover:text-blue-300 transition-colors">Acrylic Boxes</Link></li>
              <li><Link href="/fb" className="hover:text-blue-300 transition-colors">Acrylic F&B Products</Link></li>
              <li><Link href="/utility" className="hover:text-blue-300 transition-colors">Acrylic Utility Items</Link></li>
              <li><Link href="/industrial" className="hover:text-blue-300 transition-colors">Industrial Products</Link></li>
              <li><Link href="/signage" className="hover:text-blue-300 transition-colors">Acrylic Signage</Link></li>
              <li><Link href="/brochure" className="hover:text-blue-300 transition-colors">Brochure Holder</Link></li>
            </ul>
          </div>

          {/* Contact Us */}
          <div className="col-span-1 lg:col-span-1">
            <h4 className="font-extrabold text-white mb-5 uppercase tracking-wider text-xs">Contact Us</h4>
            <p className="mb-4 leading-relaxed whitespace-pre-line text-white/60">
              {(settings?.address || 'M/s. Classic Concepts Acrylic Private Limited,\n1-6-44/2, Muthiyam Reddy Estate,\nSecunderabad - 500 015, India.').replace(/\\n/g, '\n')}
            </p>
            <p className="mb-2 text-white/80">
              <span className="block hover:text-blue-300 cursor-pointer">{settings?.phone1 || '+91 7901 650 662'}</span>
              {settings?.phone2 && <span className="block hover:text-blue-300 cursor-pointer">{settings.phone2}</span>}
            </p>
            <p>
              <a href={`mailto:${settings?.email || 'info@classicconcepts.in'}`} className="text-white hover:text-blue-300 transition-colors font-semibold">{settings?.email || 'info@classicconcepts.in'}</a>
            </p>
          </div>

          {/* Pay With Us */}
          <div className="col-span-1 lg:col-span-1">
            <h4 className="font-extrabold text-white mb-5 uppercase tracking-wider text-xs">Pay With Us</h4>
            <div className="flex flex-col gap-4">
              
              {upiLink && (
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col items-center gap-3">
                  <span className="text-[10px] font-bold text-white/60 uppercase tracking-wide">Scan & Pay via UPI</span>
                  <div className="bg-white p-2 rounded-lg">
                    <QRCodeSVG value={upiLink} size={80} fgColor="#0c1a40" />
                  </div>
                  <span className="text-[10px] font-medium text-white/50">{settings.upiId}</span>
                </div>
              )}

              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <span className="text-white/80 font-bold block mb-3 text-center text-xs tracking-wide">We Accept</span>
                <div className="flex flex-wrap justify-center gap-2">
                  <span className="bg-white/10 text-white/80 text-[9px] px-2 py-1 rounded font-semibold border border-white/5">UPI</span>
                  <span className="bg-white/10 text-white/80 text-[9px] px-2 py-1 rounded font-semibold border border-white/5">PayPal</span>
                  <span className="bg-white/10 text-white/80 text-[9px] px-2 py-1 rounded font-semibold border border-white/5">VISA</span>
                  <span className="bg-white/10 text-white/80 text-[9px] px-2 py-1 rounded font-semibold border border-white/5">MasterCard</span>
                </div>
              </div>
            </div>
          </div>
          
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row justify-between items-center text-xs text-white/50">
          <p className="font-medium">
            Website Managed by <a href="https://alaqmar.dev" target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:text-white font-bold transition-colors">The Web Sensei</a>
          </p>
          <p className="font-semibold text-center md:text-left text-white/60">
            Copyright &copy; {new Date().getFullYear()} - All Rights Reserved - Classic Concepts
          </p>
          <div className="flex gap-6 mt-4 md:mt-0 font-medium">
            <Link href="/privacy" className="hover:text-blue-300 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-blue-300 transition-colors">Terms of Services</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
