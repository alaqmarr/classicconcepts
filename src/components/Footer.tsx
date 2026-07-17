"use client";

import Link from "next/link";
import { Mail, Phone, MapPin, ArrowRight } from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full bg-brand-dark text-gray-300 py-16 px-4 sm:px-8 border-t-4 border-brand-blue">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
        
        {/* Brand & Intro */}
        <div className="flex flex-col gap-6">
          <Link href="/" className="flex flex-col items-start bg-white p-4 rounded-lg self-start">
            <span className="text-2xl font-bold text-brand-dark tracking-tight">
              CLASSIC<span className="text-brand-red">CONCEPTS</span>®
            </span>
            <span className="text-sm font-medium tracking-wide text-gray-600">acrylic by design</span>
          </Link>
          <p className="text-sm leading-relaxed">
            Leading manufacturer of high-quality acrylic products in India, providing superior craftsmanship and innovative designs.
          </p>
          <div className="flex gap-4">
            <a href="#" className="bg-white/10 p-2 rounded-full hover:bg-brand-blue hover:text-white transition-colors"><span className="text-xs">FB</span></a>
            <a href="#" className="bg-white/10 p-2 rounded-full hover:bg-brand-blue hover:text-white transition-colors"><span className="text-xs">IN</span></a>
            <a href="#" className="bg-white/10 p-2 rounded-full hover:bg-brand-blue hover:text-white transition-colors"><span className="text-xs">IG</span></a>
          </div>
        </div>

        {/* Quick Links */}
        <div className="flex flex-col gap-6">
          <h4 className="text-white font-bold text-lg tracking-wider">QUICK LINKS</h4>
          <nav className="flex flex-col gap-3 text-sm">
            {["Home", "About Us", "Shop", "Acrylic Podium", "Blog", "Contact Us"].map((link) => (
              <Link 
                key={link} 
                href={link === 'Home' ? '/' : `/${link.toLowerCase().replace(' ', '-')}`}
                className="hover:text-brand-blue transition-colors flex items-center gap-2 group"
              >
                <ArrowRight size={14} className="text-brand-blue opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                {link}
              </Link>
            ))}
          </nav>
        </div>

        {/* Categories */}
        <div className="flex flex-col gap-6">
          <h4 className="text-white font-bold text-lg tracking-wider">CATEGORIES</h4>
          <nav className="flex flex-col gap-3 text-sm">
            {["Acrylic Furniture", "Display Units", "Brochure Holders", "Industrial Products", "Signage"].map((link) => (
              <Link 
                key={link} 
                href="/shop"
                className="hover:text-brand-blue transition-colors flex items-center gap-2 group"
              >
                <ArrowRight size={14} className="text-brand-blue opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                {link}
              </Link>
            ))}
          </nav>
        </div>

        {/* Contact Info */}
        <div className="flex flex-col gap-6">
          <h4 className="text-white font-bold text-lg tracking-wider">CONTACT US</h4>
          <div className="flex flex-col gap-4 text-sm">
            <div className="flex items-start gap-3">
              <MapPin size={18} className="text-brand-blue shrink-0 mt-1" />
              <p className="leading-relaxed">Hyderabad, Telangana, India</p>
            </div>
            <a href="tel:+917901650662" className="flex items-center gap-3 hover:text-brand-blue transition-colors">
              <Phone size={18} className="text-brand-blue shrink-0" />
              +91 7901 650 662 / 663
            </a>
            <a href="mailto:sales@classicconcepts.in" className="flex items-center gap-3 hover:text-brand-blue transition-colors">
              <Mail size={18} className="text-brand-blue shrink-0" />
              sales@classicconcepts.in
            </a>
          </div>
        </div>

      </div>

      <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-gray-800 text-center text-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <p>&copy; {new Date().getFullYear()} Classic Concepts. All rights reserved.</p>
        <div className="flex gap-4">
          <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
          <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
}
