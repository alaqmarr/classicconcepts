"use client";

import Link from "next/link";
import { Phone, Mail, Menu, X } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = [
    { name: "HOME", href: "/" },
    { name: "ABOUT US", href: "/about" },
    { name: "SHOP", href: "/shop" },
    { name: "ACRYLIC PODIUM", href: "/podiums" },
    { name: "CONTACT US", href: "/contact" },
    { name: "BLOG", href: "/blogs" },
  ];

  return (
    <header className="w-full flex flex-col shadow-sm sticky top-0 z-50 bg-white">
      {/* Top Bar */}
      <div className="w-full bg-brand-blue text-white text-xs sm:text-sm py-2 px-4 sm:px-8 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <a href="mailto:sales@classicconcepts.in" className="flex items-center gap-2 hover:text-gray-200 transition">
            <Mail size={14} />
            <span className="hidden sm:inline">sales@classicconcepts.in</span>
          </a>
          <a href="tel:+917901650662" className="flex items-center gap-2 hover:text-gray-200 transition">
            <Phone size={14} />
            <span>+91 7901 650 662 / 663</span>
          </a>
        </div>
        <div className="flex items-center gap-3">
          <a href="#" className="hover:text-gray-200 transition"><span>FB</span></a>
          <a href="#" className="hover:text-gray-200 transition"><span>IN</span></a>
          <a href="#" className="hover:text-gray-200 transition"><span>IG</span></a>
          <Link href="/admin" className="font-semibold ml-2 hover:underline hidden sm:inline">Login</Link>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="w-full px-4 sm:px-8 py-4 flex justify-between items-center bg-gradient-to-b from-white via-slate-50/50 to-white relative">
        <Link href="/" className="flex flex-col items-start">
          <span className="text-2xl font-bold text-brand-dark tracking-tight">
            CLASSIC<span className="text-brand-red">CONCEPTS</span>®
          </span>
          <span className="text-sm font-medium tracking-wide text-gray-600">acrylic by design</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-semibold text-brand-dark">
          {navLinks.map((link) => (
            <Link key={link.name} href={link.href} className="hover:text-brand-blue transition-colors">
              {link.name}
            </Link>
          ))}
          <Link 
            href="/contact"
            className="bg-brand-blue text-white px-6 py-2 rounded font-semibold hover:bg-blue-800 transition-colors shadow-md hover:shadow-lg"
          >
            Quick Enquiry
          </Link>
        </nav>

        {/* Mobile Toggle */}
        <button 
          className="lg:hidden p-2 text-brand-dark"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Nav Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-white border-t border-gray-100 overflow-hidden"
          >
            <nav className="flex flex-col py-4 px-4 gap-4 text-sm font-semibold text-brand-dark shadow-inner">
              {navLinks.map((link) => (
                <Link 
                  key={link.name} 
                  href={link.href} 
                  className="hover:text-brand-blue transition-colors py-2 border-b border-gray-50"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              <Link 
                href="/contact"
                className="bg-brand-blue text-white text-center px-6 py-3 mt-2 rounded font-semibold hover:bg-blue-800 transition-colors shadow-md"
                onClick={() => setIsMenuOpen(false)}
              >
                Quick Enquiry
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
