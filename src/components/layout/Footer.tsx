"use client";

import Link from "next/link";
import Image from "next/image";
import {
  FaLinkedinIn,
  FaInstagram,
  FaFacebookF,
  FaWhatsapp,
} from "react-icons/fa6";
import { QRCodeSVG } from "qrcode.react";
import { EditableText } from "@/components/inline-edit/EditableText";
import { getContentValue, type SiteContentMap } from "@/lib/site-content-shared";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface UsefulLink {
  id: string;
  title: string;
  url: string;
}

interface FooterProps {
  settings: any;
  categories?: Category[];
  usefulLinks?: UsefulLink[];
  siteContent?: SiteContentMap;
}

export function Footer({
  settings,
  categories = [],
  usefulLinks = [],
  siteContent,
}: FooterProps) {
  const upiLink = settings?.upiId
    ? `upi://pay?pa=${settings.upiId}&pn=${encodeURIComponent(
        settings.upiName || "Classic Concepts"
      )}&cu=INR`
    : null;
  const whatsappNumber = (settings?.whatsappNumber || "+917337222876").replace(
    /\D/g,
    ""
  );

  const firstColCategories = categories.slice(0, 5);
  const secondColCategories = categories.slice(5, 11);

  const footerTagline = getContentValue(
    siteContent,
    "footer.tagline",
    "Manufacturing clear cast acrylic podiums, display stands, trophies, furniture, and custom acrylic products across India Since 2008."
  );

  return (
    <footer className="bg-[#0c1a40] pt-16 sm:pt-20 pb-24 sm:pb-28 text-white/70 text-[13px] relative overflow-hidden">
      <div className="container mx-auto px-4 md:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 mb-16">
          {/* Logo & Socials */}
          <div className="col-span-1 lg:col-span-1">
            <div className="mb-6 bg-white/10 p-4 rounded-xl inline-block">
              <Image
                src="/logo.png"
                alt="Classic Concepts"
                width={200}
                height={55}
                className="object-contain"
                style={{ width: "auto", height: "auto" }}
              />
            </div>
            <EditableText
              as="p"
              mode="multiline"
              contentKey="footer.tagline"
              label="Footer Brand Tagline"
              value={footerTagline}
              className="text-xs text-white/60 mb-6 leading-relaxed block"
            />
            <div className="flex flex-wrap gap-2">
              <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-[#25D366] transition-colors"
                title="WhatsApp"
              >
                <FaWhatsapp size={14} />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-[#0056b3] transition-colors"
                title="LinkedIn"
              >
                <FaLinkedinIn size={14} />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-[#e31837] transition-colors"
                title="Instagram"
              >
                <FaInstagram size={14} />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-[#0056b3] transition-colors"
                title="Facebook"
              >
                <FaFacebookF size={14} />
              </a>
            </div>
          </div>

          {/* Shop Categories */}
          <div className="col-span-1 lg:col-span-1">
            <h4 className="font-extrabold text-white mb-5 uppercase tracking-wider text-xs">
              Categories
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/podiums"
                  className="hover:text-blue-300 transition-colors font-medium"
                >
                  Acrylic Podiums
                </Link>
              </li>
              {firstColCategories.map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/shop/c/${cat.slug}`}
                    className="hover:text-blue-300 transition-colors"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
              {firstColCategories.length === 0 && (
                <>
                  <li>
                    <Link
                      href="/shop"
                      className="hover:text-blue-300 transition-colors"
                    >
                      Acrylic Display Units
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/shop"
                      className="hover:text-blue-300 transition-colors"
                    >
                      Acrylic Furniture
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/shop"
                      className="hover:text-blue-300 transition-colors"
                    >
                      Acrylic Interiors
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* More Categories / Products */}
          <div className="col-span-1 lg:col-span-1">
            <h4 className="font-extrabold text-white mb-5 uppercase tracking-wider text-xs">
              More Products
            </h4>
            <ul className="space-y-3">
              {secondColCategories.map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/shop/c/${cat.slug}`}
                    className="hover:text-blue-300 transition-colors"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/shop"
                  className="hover:text-blue-300 transition-colors"
                >
                  View All Products
                </Link>
              </li>
              <li>
                <Link
                  href="/classicedge53"
                  className="hover:text-blue-300 transition-colors"
                >
                  Classic Edge 53 Machines
                </Link>
              </li>
              <li>
                <Link
                  href="/resources"
                  className="hover:text-blue-300 transition-colors"
                >
                  Catalogs &amp; Downloads
                </Link>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div className="col-span-1 lg:col-span-1">
            <h4 className="font-extrabold text-white mb-5 uppercase tracking-wider text-xs">
              Quick Links
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/"
                  className="hover:text-blue-300 transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="hover:text-blue-300 transition-colors"
                >
                  Company Profile
                </Link>
              </li>
              <li>
                <Link
                  href="/about/team"
                  className="hover:text-blue-300 transition-colors"
                >
                  Our Team
                </Link>
              </li>
              <li>
                <Link
                  href="/about/infrastructure"
                  className="hover:text-blue-300 transition-colors"
                >
                  Infrastructure
                </Link>
              </li>
              <li>
                <Link
                  href="/about/certificates"
                  className="hover:text-blue-300 transition-colors"
                >
                  Certificates
                </Link>
              </li>
              <li>
                <Link
                  href="/about/press"
                  className="hover:text-blue-300 transition-colors"
                >
                  Press &amp; Media
                </Link>
              </li>
              <li>
                <Link
                  href="/about/clients"
                  className="hover:text-blue-300 transition-colors"
                >
                  Our Clients
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="hover:text-blue-300 transition-colors"
                >
                  Contact Us
                </Link>
              </li>
              {usefulLinks.slice(0, 3).map((link) => (
                <li key={link.id}>
                  <a
                    href={link.url}
                    target={link.url.startsWith("/") ? "_self" : "_blank"}
                    rel="noopener noreferrer"
                    className="hover:text-blue-300 transition-colors"
                  >
                    {link.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Details */}
          <div className="col-span-1 lg:col-span-1">
            <h4 className="font-extrabold text-white mb-5 uppercase tracking-wider text-xs">
              Contact Us
            </h4>
            <EditableText
              as="p"
              mode="multiline"
              allowSwitchToHtml={false}
              settingField="address"
              label="Head Office & Factory Address"
              value={(
                settings?.address ||
                "Secunderabad, Hyderabad, Telangana, India"
              ).replace(/\\n/g, "\n")}
              className="mb-4 leading-relaxed whitespace-pre-line text-white/60 block"
            />
            <div className="mb-3 space-y-1">
              {settings?.phone1 && (
                <div>
                  <EditableText
                    as="span"
                    mode="plain"
                    allowSwitchToHtml={false}
                    settingField="phone1"
                    label="Primary Phone Number"
                    value={settings.phone1}
                    className="hover:text-blue-300 transition-colors text-white font-medium block"
                  />
                </div>
              )}
              {settings?.phone2 && (
                <div>
                  <EditableText
                    as="span"
                    mode="plain"
                    allowSwitchToHtml={false}
                    settingField="phone2"
                    label="Secondary Phone Number"
                    value={settings.phone2}
                    className="hover:text-blue-300 transition-colors text-white/80 block"
                  />
                </div>
              )}
            </div>
            <div className="mb-4 space-y-1">
              {settings?.email && (
                <div>
                  <EditableText
                    as="span"
                    mode="plain"
                    allowSwitchToHtml={false}
                    settingField="email"
                    label="Primary Email Address"
                    value={settings.email}
                    className="text-white hover:text-blue-300 transition-colors font-medium block break-all"
                  />
                </div>
              )}
              {settings?.email2 && (
                <div>
                  <EditableText
                    as="span"
                    mode="plain"
                    allowSwitchToHtml={false}
                    settingField="email2"
                    label="Secondary Email Address"
                    value={settings.email2}
                    className="text-white/80 hover:text-blue-300 transition-colors block break-all"
                  />
                </div>
              )}
            </div>
            {settings?.businessHours && (
              <div className="pt-2 border-t border-white/10">
                <span className="text-[11px] font-bold text-white uppercase tracking-wider block mb-1">
                  Business Hours:
                </span>
                <EditableText
                  as="p"
                  mode="multiline"
                  allowSwitchToHtml={false}
                  settingField="businessHours"
                  label="Business Hours"
                  value={settings.businessHours}
                  className="text-white/60 text-xs leading-relaxed whitespace-pre-line block"
                />
              </div>
            )}
          </div>

          {/* Pay With Us */}
          <div className="col-span-1 lg:col-span-1">
            <h4 className="font-extrabold text-white mb-5 uppercase tracking-wider text-xs">
              Pay With Us
            </h4>
            <div className="flex flex-col gap-4">
              {upiLink && (
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col items-center gap-3">
                  <span className="text-[10px] font-bold text-white/60 uppercase tracking-wide">
                    Scan &amp; Pay via UPI
                  </span>
                  <div className="bg-white p-2 rounded-lg">
                    <QRCodeSVG value={upiLink} size={80} fgColor="#0c1a40" />
                  </div>
                  <span className="text-[10px] font-medium text-white/50">
                    {settings.upiId}
                  </span>
                </div>
              )}

              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <span className="text-white/80 font-bold block mb-3 text-center text-xs tracking-wide">
                  We Accept
                </span>
                <div className="flex flex-wrap justify-center gap-2">
                  <span className="bg-white/10 text-white/80 text-[9px] px-2 py-1 rounded font-semibold border border-white/5">
                    UPI
                  </span>
                  <span className="bg-white/10 text-white/80 text-[9px] px-2 py-1 rounded font-semibold border border-white/5">
                    NEFT / RTGS
                  </span>
                  <span className="bg-white/10 text-white/80 text-[9px] px-2 py-1 rounded font-semibold border border-white/5">
                    VISA
                  </span>
                  <span className="bg-white/10 text-white/80 text-[9px] px-2 py-1 rounded font-semibold border border-white/5">
                    MasterCard
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 pt-6 flex flex-col lg:flex-row justify-between items-center gap-4 text-xs text-white/50">
          <p className="font-medium">
            Website Managed by{" "}
            <a
              href="https://alaqmar.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-300 hover:text-white font-bold transition-colors"
            >
              The Web Sensei
            </a>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-white/70 font-medium">
            <Link
              href="/privacy-policy"
              className="hover:text-white transition-colors"
            >
              Privacy Policy
            </Link>
            <span className="text-white/25">|</span>
            <Link
              href="/terms-of-service"
              className="hover:text-white transition-colors"
            >
              Terms of Service
            </Link>
            <span className="text-white/25">|</span>
            <Link
              href="/data-deletion"
              className="hover:text-white transition-colors"
            >
              Data Deletion
            </Link>
          </div>
          <p className="font-semibold text-center md:text-left text-white/60">
            Copyright &copy; {new Date().getFullYear()} - All Rights Reserved -
            Classic Concepts
          </p>
        </div>
      </div>
    </footer>
  );
}
