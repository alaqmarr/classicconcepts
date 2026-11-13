"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ShoppingCart, Pencil, Info, ShieldCheck, X } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { useCart } from "@/context/CartContext";
import { useInlineEdit } from "@/components/inline-edit/InlineEditProvider";
import { EditableText } from "@/components/inline-edit/EditableText";
import { EditableImage } from "@/components/inline-edit/EditableImage";

const DEFAULT_PODIUM_IP_NOTICE =
  "Patented, Registered Design & Copyright Protected by Classic Concepts Acrylic Pvt. Ltd. Official IP documents are held on file. Unauthorised copying is strictly prohibited.";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug: string;
    basePrice: number | null;
    discountPrice: number | null;
    discountBadge: string | null;
    stockStatus: string;
    isPodium?: boolean;
    isRegisteredDesign?: boolean;
    designRegistrationNo?: string | null;
    ipProtectionText?: string | null;
    images: { url: string; isMain: boolean }[];
    category?: { name: string; slug: string };
    subCategory?: { id?: string; name: string; slug: string } | null;
    podiumSubCategory?: { name: string; slug: string } | null;
  };
  phone?: string | null;
}

export function ProductCard({
  product,
  phone = "+917337222876",
}: ProductCardProps) {
  const { addToCart } = useCart();
  const { editMode } = useInlineEdit();
  const [ipHovered, setIpHovered] = useState(false);
  const [ipMobileOpen, setIpMobileOpen] = useState(false);

  const mainImage =
    product.images.find((img) => img.isMain)?.url ||
    product.images[0]?.url ||
    "/placeholder-image.jpg";

  const currentPrice = product.discountPrice || product.basePrice;
  const showPodiumIpBadge = Boolean(product.isPodium);
  const ipText = product.ipProtectionText?.trim() || DEFAULT_PODIUM_IP_NOTICE;
  const isIpOpen = ipHovered || ipMobileOpen;

  const handleEnquire = (e: React.MouseEvent) => {
    e.preventDefault();
    const rawPhone = phone || "+917337222876";
    let cleanPhone = rawPhone.replace(/\D/g, "");
    if (!cleanPhone.startsWith("91") && cleanPhone.length === 10) {
      cleanPhone = "91" + cleanPhone;
    }
    const text = encodeURIComponent(
      `Hi, I would like to enquire about the product: ${product.name} (SKU/Link: ${window.location.origin}/shop/p/${product.slug})`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, "_blank");
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addToCart({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: currentPrice,
      image: mainImage,
    });
  };

  const eyebrowLabel = product.podiumSubCategory
    ? product.podiumSubCategory.name
    : product.subCategory
    ? `${product.category?.name ? `${product.category.name} • ` : ""}${product.subCategory.name}`
    : product.category?.name;

  return (
    <Link
      href={`/shop/p/${product.slug}`}
      className={`group relative block h-full ${isIpOpen ? "z-40" : "hover:z-20"}`}
    >
      {/* Outer card uses overflow-visible so floating badges/popovers are NEVER clipped on any edge */}
      <div className="bg-white rounded-xl sm:rounded-2xl overflow-visible border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 sm:transform sm:group-hover:-translate-y-1 h-full flex flex-col relative">
        {/* Image Container */}
        <div className="relative aspect-square w-full bg-slate-100 rounded-t-xl sm:rounded-t-2xl overflow-visible">
          <div className="relative w-full h-full overflow-hidden rounded-t-xl sm:rounded-t-2xl">
            {product.discountBadge && (
              <EditableText
                as="div"
                mode="plain"
                allowSwitchToHtml={false}
                productPatch={{ productId: product.id, field: "discountBadge" }}
                value={product.discountBadge}
                label={`Discount Badge - ${product.name}`}
                className="hidden sm:block absolute top-3.5 left-3.5 z-10 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md"
              />
            )}

            {editMode && (
              <span
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.location.href = `/shop/p/${product.slug}`;
                }}
                className="hidden sm:inline-flex absolute bottom-3 left-3 z-20 items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900/90 hover:bg-indigo-600 text-white text-[11px] font-semibold shadow-lg border border-white/60 transition-colors"
              >
                <Pencil className="w-2.5 h-2.5" />
                <span>Specs / Videos</span>
              </span>
            )}

            <EditableImage
              productPatch={{ productId: product.id, field: "mainImage" }}
              src={mainImage}
              alt={product.name}
              label={`Main Product Photo - ${product.name}`}
              aspectRatio={1}
              wrapperClassName="relative w-full h-full"
              className={`w-full h-full object-cover transition-transform duration-500 ${
                isIpOpen ? "scale-100" : "group-hover:scale-105"
              }`}
            />

            {/* Quick view overlay (desktop hover only, paused when reading the IP info popover) */}
            {!editMode && (
              <div
                className={`hidden sm:flex absolute inset-0 bg-black/35 transition-opacity duration-300 items-center justify-center pointer-events-none ${
                  isIpOpen ? "opacity-0" : "opacity-0 group-hover:opacity-100"
                }`}
              >
                <div className="bg-white text-slate-900 px-5 py-2 rounded-full font-bold text-xs sm:text-sm transform translate-y-3 group-hover:translate-y-0 transition-transform duration-300 flex items-center gap-1.5 shadow-md">
                  View Details <ArrowRight size={15} />
                </div>
              </div>
            )}
          </div>

          {/* Subtle Podium Patent, Registered Design & Copyright Info Trigger + Unclipped Popover */}
          {showPodiumIpBadge && (
            <div className="absolute inset-x-2 top-2 sm:inset-x-auto sm:right-2.5 sm:top-2.5 z-30 pointer-events-none flex flex-col items-end">
              {/* Zero native `title` attribute so browser tooltip NEVER collides with our custom popover */}
              <button
                type="button"
                onMouseEnter={() => setIpHovered(true)}
                onMouseLeave={() => setIpHovered(false)}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIpMobileOpen((prev) => !prev);
                }}
                aria-label="Patented and copyright protected podium details"
                aria-expanded={isIpOpen}
                className={`pointer-events-auto w-6 h-6 sm:w-7 sm:h-7 rounded-full backdrop-blur-md border shadow-sm flex items-center justify-center transition-all duration-200 cursor-pointer ${
                  isIpOpen
                    ? "bg-slate-900 text-amber-300 border-amber-400/60 scale-105"
                    : "bg-white/90 hover:bg-slate-900 text-slate-700 hover:text-amber-300 border-slate-200/90"
                }`}
              >
                <Info className="w-3.5 h-3.5 stroke-[2.25]" />
              </button>

              {/* Hover bridge + Clean Popover Card: Fits 100% inside mobile 2-col cards and floats cleanly on desktop */}
              <div
                onMouseEnter={() => setIpHovered(true)}
                onMouseLeave={() => {
                  setIpHovered(false);
                  setIpMobileOpen(false);
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className={`pt-1.5 w-full sm:w-60 transition-all duration-150 origin-top-right z-50 ${
                  isIpOpen
                    ? "opacity-100 scale-100 translate-y-0 pointer-events-auto visible"
                    : "opacity-0 scale-95 -translate-y-1 pointer-events-none invisible"
                }`}
              >
                <div className="relative p-2.5 sm:p-3 rounded-xl bg-white text-slate-800 border border-slate-200/95 ring-1 ring-slate-900/5 shadow-xl">
                  {/* Crisp upward pointer arrow aligned directly with the (i) icon */}
                  <span
                    aria-hidden="true"
                    className="absolute -top-1.5 right-2 sm:right-2.5 w-3 h-3 rotate-45 bg-white border-l border-t border-slate-200/95"
                  />

                  <div className="relative flex items-center justify-between gap-1.5 pb-1.5 mb-1.5 border-b border-slate-100">
                    <div className="flex items-center gap-1 text-[#0056b3] text-[10px] sm:text-[10.5px] font-extrabold uppercase tracking-wider">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>Patented &amp; Copyrighted</span>
                    </div>
                    {ipMobileOpen && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIpMobileOpen(false);
                          setIpHovered(false);
                        }}
                        className="sm:hidden p-0.5 rounded text-slate-400 hover:text-slate-700"
                        aria-label="Close notice"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {product.designRegistrationNo && (
                    <p className="relative text-[10px] font-mono font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 mb-1.5 truncate">
                      Ref: {product.designRegistrationNo}
                    </p>
                  )}

                  {editMode ? (
                    <EditableText
                      as="p"
                      mode="multiline"
                      allowSwitchToHtml={false}
                      productPatch={{
                        productId: product.id,
                        field: "ipProtectionText",
                      }}
                      value={ipText}
                      label={`Podium Patent & Copyright Notice - ${product.name}`}
                      className="relative text-[10.5px] sm:text-[11px] text-slate-600 leading-snug block"
                    />
                  ) : (
                    <p className="relative text-[10.5px] sm:text-[11px] text-slate-600 leading-snug">
                      {ipText}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content Container: Compact on Mobile (Image + Name + Buttons only), Full Details on sm+ */}
        <div className="p-2.5 sm:p-5 flex-1 flex flex-col">
          {eyebrowLabel && (
            <p className="hidden sm:block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 truncate">
              {eyebrowLabel}
            </p>
          )}
          <EditableText
            as="h3"
            mode="plain"
            allowSwitchToHtml={false}
            label={`Product Card Title - ${product.name}`}
            productPatch={{ productId: product.id, field: "name" }}
            value={product.name}
            className="font-bold text-slate-800 text-xs sm:text-lg leading-snug sm:leading-tight mb-2.5 sm:mb-3 group-hover:text-[#0056b3] transition-colors line-clamp-2 min-h-[2.1rem] sm:min-h-0 block"
          />

          <div className="mt-auto">
            {/* Price row: hidden on mobile per mobile declutter specification */}
            <div className="hidden sm:flex items-center gap-3 mb-3">
              {product.discountPrice ? (
                <>
                  <EditableText
                    as="span"
                    mode="plain"
                    allowSwitchToHtml={false}
                    productPatch={{
                      productId: product.id,
                      field: "discountPrice",
                    }}
                    value={String(product.discountPrice)}
                    label={`Offer Price (₹) - ${product.name}`}
                    className="text-xl font-extrabold text-[#0056b3]"
                  >
                    ₹{product.discountPrice.toLocaleString("en-IN")}
                  </EditableText>
                  <EditableText
                    as="span"
                    mode="plain"
                    allowSwitchToHtml={false}
                    productPatch={{ productId: product.id, field: "basePrice" }}
                    value={String(product.basePrice ?? "")}
                    label={`MRP / Base Price (₹) - ${product.name}`}
                    className="text-sm font-medium text-slate-400 line-through"
                  >
                    ₹{product.basePrice?.toLocaleString("en-IN")}
                  </EditableText>
                </>
              ) : product.basePrice ? (
                <EditableText
                  as="span"
                  mode="plain"
                  allowSwitchToHtml={false}
                  productPatch={{ productId: product.id, field: "basePrice" }}
                  value={String(product.basePrice)}
                  label={`Price (₹) - ${product.name}`}
                  className="text-xl font-extrabold text-slate-800"
                >
                  ₹{product.basePrice.toLocaleString("en-IN")}
                </EditableText>
              ) : (
                <EditableText
                  as="span"
                  mode="plain"
                  allowSwitchToHtml={false}
                  productPatch={{ productId: product.id, field: "basePrice" }}
                  value=""
                  label={`Set Price (₹) - ${product.name} (leave empty for Price on Request)`}
                  className="text-sm font-bold text-slate-500"
                >
                  Price on Request
                </EditableText>
              )}
            </div>

            {/* Stock badge: hidden on mobile */}
            <div className="hidden sm:flex items-center justify-between pt-4 border-t border-slate-100 mb-4">
              <EditableText
                as="span"
                mode="plain"
                allowSwitchToHtml={false}
                productPatch={{ productId: product.id, field: "stockStatus" }}
                value={product.stockStatus}
                label={`Stock Status - ${product.name}`}
                className={`text-xs font-bold px-2 py-1 rounded-md ${
                  product.stockStatus === "In stock"
                    ? "bg-green-50 text-green-600"
                    : "bg-orange-50 text-orange-600"
                }`}
              />
            </div>

            {/* Action Buttons: Kept as Add + Enquire, compact side-by-side on mobile */}
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mt-auto">
              <button
                onClick={handleAddToCart}
                className="flex items-center justify-center gap-1 sm:gap-1.5 py-1.5 sm:py-2 px-1.5 sm:px-3 bg-slate-900 text-white text-[11px] sm:text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors"
              >
                <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>Add</span>
              </button>
              <button
                onClick={handleEnquire}
                className="flex items-center justify-center gap-1 sm:gap-1.5 py-1.5 sm:py-2 px-1.5 sm:px-3 bg-[#25D366] text-white text-[11px] sm:text-sm font-bold rounded-lg hover:bg-[#128C7E] transition-colors"
              >
                <FaWhatsapp className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>Enquire</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
