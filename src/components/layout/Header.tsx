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
      {/* Main Navbar - Dark Theme */}
      <div className={`w-full transition-all duration-300 ${scrolled ? 'fixed top-0 bg-[#05060A]/95 backdrop-blur-md shadow-soft py-6 border-b border-white/5' : 'bg-[#05060A] py-6'}`}>
        <div className="container mx-auto px-4 md:px-8 flex justify-between items-center">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0 px-4 py-1.5 rounded-xl shadow-sm hover:shadow-md transition-all">
            <Image
              src="/logo.png"
              alt="Classic Concepts"
              width={250}
              height={65}
              className="object-contain h-[35px] md:h-[45px] w-auto transition-transform duration-300 hover:scale-[1.02]"
              priority
            />
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-8 text-[12px] font-bold text-white tracking-wider uppercase">
            <Link href="/" className={`${pathname === '/' ? 'text-white' : 'text-white/70 hover:text-white'} transition-colors relative group`}>
              HOME
              <span className={`absolute -bottom-2 left-0 w-full h-0.5 ${pathname === '/' ? 'bg-[#e31837] scale-x-100' : 'bg-white scale-x-0 group-hover:scale-x-100'} transform origin-left transition-transform duration-300`}></span>
            </Link>

            {/* About Us Dropdown */}
            <div
              className="relative group"
              onMouseEnter={() => setAboutDropdownOpen(true)}
              onMouseLeave={() => setAboutDropdownOpen(false)}
            >
              <button className={`flex items-center gap-1 transition-colors py-2 ${pathname.startsWith('/about') ? 'text-white' : 'text-white/70 hover:text-white'}`}>
                ABOUT US
                <ChevronDown size={14} className={`transition-transform duration-200 ${aboutDropdownOpen ? 'rotate-180 text-white' : ''}`} />
              </button>

              {aboutDropdownOpen && (
                <div className="absolute top-full left-0 mt-0 w-56 bg-[#0a0f1c]/95 backdrop-blur-sm border border-white/10 shadow-soft rounded-xl overflow-hidden flex flex-col py-2 z-50">
                  <Link href="/about" className={`px-5 py-2.5 text-sm font-semibold hover:bg-white/5 hover:text-white hover:pl-6 transition-all duration-200 ${pathname === '/about' ? 'text-white bg-white/5 pl-6' : 'text-white/70'}`}>Company Profile</Link>
                  <Link href="/about/infrastructure" className={`px-5 py-2.5 text-sm font-semibold hover:bg-white/5 hover:text-white hover:pl-6 transition-all duration-200 ${pathname === '/about/infrastructure' ? 'text-white bg-white/5 pl-6' : 'text-white/70'}`}>Infrastructure</Link>
                  <Link href="/about/press" className={`px-5 py-2.5 text-sm font-semibold hover:bg-white/5 hover:text-white hover:pl-6 transition-all duration-200 ${pathname === '/about/press' ? 'text-white bg-white/5 pl-6' : 'text-white/70'}`}>Press</Link>
                  <Link href="/about/clients" className={`px-5 py-2.5 text-sm font-semibold hover:bg-white/5 hover:text-white hover:pl-6 transition-all duration-200 ${pathname === '/about/clients' ? 'text-white bg-white/5 pl-6' : 'text-white/70'}`}>Clients</Link>
                </div>
              )}
            </div>

            <Link href="/shop" className={`${pathname.startsWith('/shop') ? 'text-white' : 'text-white/70 hover:text-white'} transition-colors relative group`}>
              SHOP
              <span className={`absolute -bottom-2 left-0 w-full h-0.5 bg-white transform origin-left ${pathname.startsWith('/shop') ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'} transition-transform duration-300`}></span>
            </Link>
            <Link href="/podiums" className={`${pathname.startsWith('/podiums') ? 'text-white' : 'text-white/70 hover:text-white'} transition-colors relative group`}>
              ACRYLIC PODIUM
              <span className={`absolute -bottom-2 left-0 w-full h-0.5 bg-white transform origin-left ${pathname.startsWith('/podiums') ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'} transition-transform duration-300`}></span>
            </Link>

            {usefulLinks && usefulLinks.length > 0 && (
              <div
                className="relative group"
                onMouseEnter={() => setLinksDropdownOpen(true)}
                onMouseLeave={() => setLinksDropdownOpen(false)}
              >
                <button className={`flex items-center gap-1 transition-colors py-2 text-white/70 hover:text-white`}>
                  OTHER USEFUL LINKS
                  <ChevronDown size={14} className={`transition-transform duration-200 ${linksDropdownOpen ? 'rotate-180 text-white' : ''}`} />
                </button>

                {linksDropdownOpen && (
                  <div className="absolute top-full left-0 mt-0 w-56 bg-[#0a0f1c]/95 backdrop-blur-sm border border-white/10 shadow-soft rounded-xl overflow-hidden flex flex-col py-2 z-50">
                    {usefulLinks.map(link => (
                      <a key={link.id} href={link.url} target={link.url.startsWith('/') ? "_self" : "_blank"} rel="noopener noreferrer" className="px-5 py-2.5 text-sm font-semibold hover:bg-white/5 hover:text-white hover:pl-6 transition-all duration-200 text-white/70">
                        {link.title}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Link href="/contact" className={`${pathname.startsWith('/contact') ? 'text-white' : 'text-white/70 hover:text-white'} transition-colors relative group`}>
              CONTACT US
              <span className={`absolute -bottom-2 left-0 w-full h-0.5 bg-white transform origin-left ${pathname.startsWith('/contact') ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'} transition-transform duration-300`}></span>
            </Link>
          </nav>

          {/* Right Action */}
          <div className="hidden lg:flex items-center gap-6">
            <Link
              href="/cart"
              className="relative p-2 text-white/80 hover:text-white transition-colors"
            >
              <ShoppingCart size={20} />
              {totalItems > 0 && (
                <span className="absolute top-0 right-0 bg-[#e31837] text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                  {totalItems}
                </span>
              )}
            </Link>
            <Link
              href="/contact"
              className="bg-[#0047e1] text-white px-6 py-2.5 rounded-full font-bold text-[13px] hover:bg-blue-600 transition-all duration-300 tracking-wide flex items-center gap-2"
            >
              Quick Enquiry &rarr;
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="lg:hidden text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {isOpen && (
        <div className="lg:hidden bg-[#05060A]/95 backdrop-blur-md border-t border-white/10 absolute w-full z-50 shadow-soft">
          <nav className="flex flex-col p-6 gap-5 text-sm font-bold text-white/80 uppercase tracking-wide">
            <Link href="/" onClick={() => setIsOpen(false)} className={`${pathname === '/' ? 'text-white' : 'hover:text-white'}`}>HOME</Link>
            <div className="flex flex-col gap-3">
              <span className={`${pathname.startsWith('/about') ? 'text-white' : 'text-white/50'}`}>ABOUT US</span>
              <div className="flex flex-col pl-4 gap-3 border-l-2 border-white/10 ml-2">
                <Link href="/about" onClick={() => setIsOpen(false)} className={`${pathname === '/about' ? 'text-white' : 'hover:text-white'}`}>Company Profile</Link>
                <Link href="/about/infrastructure" onClick={() => setIsOpen(false)} className={`${pathname === '/about/infrastructure' ? 'text-white' : 'hover:text-white'}`}>Infrastructure</Link>
                <Link href="/about/press" onClick={() => setIsOpen(false)} className={`${pathname === '/about/press' ? 'text-white' : 'hover:text-white'}`}>Press</Link>
                <Link href="/about/clients" onClick={() => setIsOpen(false)} className={`${pathname === '/about/clients' ? 'text-white' : 'hover:text-white'}`}>Clients</Link>
              </div>
            </div>
            <Link href="/shop" onClick={() => setIsOpen(false)} className={`${pathname.startsWith('/shop') ? 'text-white' : 'hover:text-white'}`}>SHOP</Link>
            <Link href="/podiums" onClick={() => setIsOpen(false)} className={`${pathname.startsWith('/podiums') ? 'text-white' : 'hover:text-white'}`}>ACRYLIC PODIUM</Link>

            {usefulLinks && usefulLinks.length > 0 && (
              <div className="flex flex-col gap-3">
                <span className="text-white/50">OTHER USEFUL LINKS</span>
                <div className="flex flex-col pl-4 gap-3 border-l-2 border-white/10 ml-2">
                  {usefulLinks.map(link => (
                    <a key={link.id} href={link.url} target={link.url.startsWith('/') ? "_self" : "_blank"} rel="noopener noreferrer" className="hover:text-white" onClick={() => setIsOpen(false)}>
                      {link.title}
                    </a>
                  ))}
                </div>
              </div>
            )}

            <Link href="/contact" onClick={() => setIsOpen(false)} className={`${pathname.startsWith('/contact') ? 'text-white' : 'hover:text-white'}`}>CONTACT US</Link>
            <Link href="/cart" onClick={() => setIsOpen(false)} className={`${pathname.startsWith('/cart') ? 'text-white' : 'hover:text-white'} flex items-center justify-between`}>
              CART
              {totalItems > 0 && (
                <span className="bg-[#e31837] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {totalItems}
                </span>
              )}
            </Link>
            <Link
              href="/contact"
              className="bg-[#0047e1] text-white px-4 py-3 text-center rounded-xl mt-4 hover:bg-blue-600 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Quick Enquiry &rarr;
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
