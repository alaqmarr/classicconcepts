"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, Mail, Phone, ChevronDown, User, ShoppingCart } from "lucide-react";
import { FaFacebookF, FaLinkedinIn, FaInstagram } from "react-icons/fa";
import { useCart } from "@/context/CartContext";

export function Header({ settings, usefulLinks = [] }: { settings: any, usefulLinks?: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [aboutDropdownOpen, setAboutDropdownOpen] = useState(false);
  const [linksDropdownOpen, setLinksDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname() || '';
  const { cartItems } = useCart();
  
  const totalItems = cartItems.reduce((total, item) => total + item.quantity, 0);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className="w-full font-sans relative z-50">
      {/* Top Blue Bar - Sleek & Modern */}
      <div className="bg-gradient-to-r from-[#004b9c] to-[#0056b3] text-white/90 text-[11px] py-2 px-4 md:px-8 flex justify-between items-center transition-all duration-300">
        <div className="flex items-center gap-6">
          <a href={`mailto:${settings?.email || 'sales@classicconcepts.in'}`} className="flex items-center gap-2 hover:text-white transition-colors">
            <Mail size={12} className="text-blue-300" />
            <span className="hidden sm:inline tracking-wide">{settings?.email || 'sales@classicconcepts.in'}</span>
          </a>
          <a href={`tel:${settings?.phone1?.replace(/\s+/g, '') || '+917901650662'}`} className="flex items-center gap-2 hover:text-white transition-colors">
            <Phone size={12} className="text-blue-300" />
            <span className="hidden sm:inline tracking-wide">{settings?.phone1 || '+91 7901 650 662'} {settings?.phone2 ? `/ ${settings.phone2.split(' ').pop()}` : ''}</span>
          </a>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4 border-r border-white/20 pr-5">
            <a href="#" className="hover:text-white transition-colors"><FaFacebookF size={12} /></a>
            <a href="#" className="hover:text-white transition-colors"><FaLinkedinIn size={12} /></a>
            <a href="#" className="hover:text-white transition-colors"><FaInstagram size={12} /></a>
          </div>
          <Link href="/admin" className="flex items-center gap-1.5 hover:text-white transition-colors font-semibold uppercase tracking-wider text-[10px] bg-white/10 px-3 py-1 rounded-full">
            <User size={12} />
            Admin Login
          </Link>
        </div>
      </div>

      {/* Main Navbar - Floating Glass effect when scrolled */}
      <div className={`w-full transition-all duration-300 ${scrolled ? 'fixed top-0 bg-white/90 backdrop-blur-md shadow-soft py-2' : 'bg-white py-4'}`}>
        <div className="container mx-auto px-4 md:px-8 flex justify-between items-center">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <Image 
              src="/logo.png" 
              alt="Classic Concepts" 
              width={220} 
              height={65} 
              className="object-contain h-[45px] md:h-[55px] w-auto transition-transform duration-300 hover:scale-[1.02]"
              priority
            />
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-8 text-[13px] font-bold text-slate-700 tracking-wider uppercase">
            <Link href="/" className={`${pathname === '/' ? 'text-[#e31837]' : 'hover:text-[#0056b3]'} transition-colors relative group`}>
              HOME
              <span className={`absolute -bottom-1 left-0 w-full h-0.5 ${pathname === '/' ? 'bg-[#e31837] scale-x-100' : 'bg-[#0056b3] scale-x-0 group-hover:scale-x-100'} transform origin-left transition-transform duration-300`}></span>
            </Link>
            
            {/* About Us Dropdown */}
            <div 
              className="relative group"
              onMouseEnter={() => setAboutDropdownOpen(true)}
              onMouseLeave={() => setAboutDropdownOpen(false)}
            >
              <button className={`flex items-center gap-1 transition-colors py-2 ${pathname.startsWith('/about') ? 'text-[#0056b3]' : 'hover:text-[#0056b3]'}`}>
                ABOUT US
                <ChevronDown size={14} className={`transition-transform duration-200 ${aboutDropdownOpen ? 'rotate-180 text-[#0056b3]' : ''}`} />
              </button>
              
              {aboutDropdownOpen && (
                <div className="absolute top-full left-0 mt-0 w-56 bg-white/95 backdrop-blur-sm border border-slate-100 shadow-soft rounded-xl overflow-hidden flex flex-col py-2 z-50">
                  <Link href="/about" className={`px-5 py-2.5 text-sm font-semibold hover:bg-slate-50 hover:text-[#0056b3] hover:pl-6 transition-all duration-200 ${pathname === '/about' ? 'text-[#0056b3] bg-slate-50 pl-6' : 'text-slate-600'}`}>Company Profile</Link>
                  <Link href="/about/infrastructure" className={`px-5 py-2.5 text-sm font-semibold hover:bg-slate-50 hover:text-[#0056b3] hover:pl-6 transition-all duration-200 ${pathname === '/about/infrastructure' ? 'text-[#0056b3] bg-slate-50 pl-6' : 'text-slate-600'}`}>Infrastructure</Link>
                  <Link href="/about/press" className={`px-5 py-2.5 text-sm font-semibold hover:bg-slate-50 hover:text-[#0056b3] hover:pl-6 transition-all duration-200 ${pathname === '/about/press' ? 'text-[#0056b3] bg-slate-50 pl-6' : 'text-slate-600'}`}>Press</Link>
                  <Link href="/about/clients" className={`px-5 py-2.5 text-sm font-semibold hover:bg-slate-50 hover:text-[#0056b3] hover:pl-6 transition-all duration-200 ${pathname === '/about/clients' ? 'text-[#0056b3] bg-slate-50 pl-6' : 'text-slate-600'}`}>Clients</Link>
                </div>
              )}
            </div>

            <Link href="/shop" className={`${pathname.startsWith('/shop') ? 'text-[#0056b3]' : 'hover:text-[#0056b3]'} transition-colors relative group`}>
              SHOP
              <span className={`absolute -bottom-1 left-0 w-full h-0.5 bg-[#0056b3] transform origin-left ${pathname.startsWith('/shop') ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'} transition-transform duration-300`}></span>
            </Link>
            <Link href="/podiums" className={`${pathname.startsWith('/podiums') ? 'text-[#0056b3]' : 'hover:text-[#0056b3]'} transition-colors relative group`}>
              ACRYLIC PODIUM
              <span className={`absolute -bottom-1 left-0 w-full h-0.5 bg-[#0056b3] transform origin-left ${pathname.startsWith('/podiums') ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'} transition-transform duration-300`}></span>
            </Link>

            {usefulLinks && usefulLinks.length > 0 && (
              <div 
                className="relative group"
                onMouseEnter={() => setLinksDropdownOpen(true)}
                onMouseLeave={() => setLinksDropdownOpen(false)}
              >
                <button className={`flex items-center gap-1 transition-colors py-2 hover:text-[#0056b3]`}>
                  OTHER USEFUL LINKS
                  <ChevronDown size={14} className={`transition-transform duration-200 ${linksDropdownOpen ? 'rotate-180 text-[#0056b3]' : ''}`} />
                </button>
                
                {linksDropdownOpen && (
                  <div className="absolute top-full left-0 mt-0 w-56 bg-white/95 backdrop-blur-sm border border-slate-100 shadow-soft rounded-xl overflow-hidden flex flex-col py-2 z-50">
                    {usefulLinks.map(link => (
                      <a key={link.id} href={link.url} target={link.url.startsWith('/') ? "_self" : "_blank"} rel="noopener noreferrer" className="px-5 py-2.5 text-sm font-semibold hover:bg-slate-50 hover:text-[#0056b3] hover:pl-6 transition-all duration-200 text-slate-600">
                        {link.title}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Link href="/contact" className={`${pathname.startsWith('/contact') ? 'text-[#0056b3]' : 'hover:text-[#0056b3]'} transition-colors relative group`}>
              CONTACT US
              <span className={`absolute -bottom-1 left-0 w-full h-0.5 bg-[#0056b3] transform origin-left ${pathname.startsWith('/contact') ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'} transition-transform duration-300`}></span>
            </Link>
          </nav>

          {/* Right Action */}
          <div className="hidden lg:flex items-center gap-4">
            <Link 
              href="/cart"
              className="relative p-2 text-slate-700 hover:text-[#0056b3] transition-colors"
            >
              <ShoppingCart size={24} />
              {totalItems > 0 && (
                <span className="absolute top-0 right-0 bg-[#e31837] text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                  {totalItems}
                </span>
              )}
            </Link>
            <Link
              href="/contact"
              className="bg-[#0056b3] text-white px-6 py-2.5 rounded-full font-bold text-[13px] hover:bg-blue-800 hover:shadow-hover transition-all duration-300 tracking-wide"
            >
              Quick Enquiry
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="lg:hidden text-slate-800 p-2 hover:bg-slate-100 rounded-lg transition-colors"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {isOpen && (
        <div className="lg:hidden bg-white/95 backdrop-blur-md border-t border-slate-100 absolute w-full z-50 shadow-soft">
          <nav className="flex flex-col p-6 gap-5 text-sm font-bold text-slate-700 uppercase tracking-wide">
            <Link href="/" onClick={() => setIsOpen(false)} className={`${pathname === '/' ? 'text-[#e31837]' : 'hover:text-[#0056b3]'}`}>HOME</Link>
            <div className="flex flex-col gap-3">
              <span className={`${pathname.startsWith('/about') ? 'text-[#0056b3]' : 'text-slate-400'}`}>ABOUT US</span>
              <div className="flex flex-col pl-4 gap-3 border-l-2 border-slate-100 ml-2">
                <Link href="/about" onClick={() => setIsOpen(false)} className={`${pathname === '/about' ? 'text-[#0056b3]' : 'hover:text-[#0056b3]'}`}>Company Profile</Link>
                <Link href="/about/infrastructure" onClick={() => setIsOpen(false)} className={`${pathname === '/about/infrastructure' ? 'text-[#0056b3]' : 'hover:text-[#0056b3]'}`}>Infrastructure</Link>
                <Link href="/about/press" onClick={() => setIsOpen(false)} className={`${pathname === '/about/press' ? 'text-[#0056b3]' : 'hover:text-[#0056b3]'}`}>Press</Link>
                <Link href="/about/clients" onClick={() => setIsOpen(false)} className={`${pathname === '/about/clients' ? 'text-[#0056b3]' : 'hover:text-[#0056b3]'}`}>Clients</Link>
              </div>
            </div>
            <Link href="/shop" onClick={() => setIsOpen(false)} className={`${pathname.startsWith('/shop') ? 'text-[#0056b3]' : 'hover:text-[#0056b3]'}`}>SHOP</Link>
            <Link href="/podiums" onClick={() => setIsOpen(false)} className={`${pathname.startsWith('/podiums') ? 'text-[#0056b3]' : 'hover:text-[#0056b3]'}`}>ACRYLIC PODIUM</Link>
            
            {usefulLinks && usefulLinks.length > 0 && (
              <div className="flex flex-col gap-3">
                <span className="text-slate-400">OTHER USEFUL LINKS</span>
                <div className="flex flex-col pl-4 gap-3 border-l-2 border-slate-100 ml-2">
                  {usefulLinks.map(link => (
                    <a key={link.id} href={link.url} target={link.url.startsWith('/') ? "_self" : "_blank"} rel="noopener noreferrer" className="hover:text-[#0056b3]" onClick={() => setIsOpen(false)}>
                      {link.title}
                    </a>
                  ))}
                </div>
              </div>
            )}

            <Link href="/contact" onClick={() => setIsOpen(false)} className={`${pathname.startsWith('/contact') ? 'text-[#0056b3]' : 'hover:text-[#0056b3]'}`}>CONTACT US</Link>
            <Link href="/cart" onClick={() => setIsOpen(false)} className={`${pathname.startsWith('/cart') ? 'text-[#0056b3]' : 'hover:text-[#0056b3]'} flex items-center justify-between`}>
              CART
              {totalItems > 0 && (
                <span className="bg-[#e31837] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {totalItems}
                </span>
              )}
            </Link>
            <Link
              href="/contact"
              className="bg-[#0056b3] text-white px-4 py-3 text-center rounded-xl mt-4 hover:bg-blue-800 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Quick Enquiry
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
