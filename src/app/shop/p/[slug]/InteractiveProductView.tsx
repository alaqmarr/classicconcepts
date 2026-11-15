"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Package,
  PlayCircle,
  Pencil,
  Image as ImageIcon,
  Layers,
  Plus,
  Trash2,
  Star,
  Upload,
  Loader2,
  Check,
  X,
} from "lucide-react";
import { ProductGallery } from "./ProductGallery";
import { ProductActions } from "./ProductActions";
import { resolveProductVideos, serializeVideoUrlEntries, parseVideoUrlEntries } from "@/lib/youtube";
import { UniversalVideoPlayer } from "@/components/shop/UniversalVideoPlayer";
import { VideoLinksEditor } from "@/components/admin/VideoLinksEditor";
import { useInlineEdit } from "@/components/inline-edit/InlineEditProvider";
import { EditableText } from "@/components/inline-edit/EditableText";
import {
  extractBulletsFromContent,
  formatBulletItemHtml,
} from "@/lib/bullet-formatter";
import { ImageCropperModal } from "@/components/admin/ImageCropperModal";
import {
  compressRasterImageIfNeeded,
  uploadAdminFile,
} from "@/lib/client-upload";

interface Variant {
  id: string;
  name: string;
  price?: number | null;
  imageUrl?: string | null;
  images?: { url: string }[];
}

interface Product {
  id: string;
  name: string;
  slug: string;
  sku?: string | null;
  basePrice?: number | null;
  discountPrice?: number | null;
  discountBadge?: string | null;
  stockStatus: string;
  videoUrl?: string | null;
  description?: string | null;
  descriptionHtml?: string | null;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  subCategoryIds?: string[];
  problemStatementIds?: string[];
  industryIds?: string[];
  images: { url: string; isMain: boolean }[];
  variants: Variant[];
}

interface InteractiveProductViewProps {
  product: Product;
  phone: string;
  allCategories?: {
    id: string;
    name: string;
    subCategories?: { id: string; name: string }[];
  }[];
  allProblemStatements?: { id: string; name: string }[];
  allIndustries?: { id: string; name: string }[];
}

export function InteractiveProductView({
  product,
  phone,
  allCategories = [],
  allProblemStatements = [],
  allIndustries = [],
}: InteractiveProductViewProps) {
  const { editMode, openEditor } = useInlineEdit();
  const router = useRouter();
  const pathname = usePathname();

  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);

  // Admin on-page modal states
  const [showMetaModal, setShowMetaModal] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [showVariantsModal, setShowVariantsModal] = useState(false);

  // Meta form state
  const [skuDraft, setSkuDraft] = useState(product.sku || "");
  const [basePriceDraft, setBasePriceDraft] = useState(
    product.basePrice != null ? String(product.basePrice) : ""
  );
  const [discountPriceDraft, setDiscountPriceDraft] = useState(
    product.discountPrice != null ? String(product.discountPrice) : ""
  );
  const [discountBadgeDraft, setDiscountBadgeDraft] = useState(
    product.discountBadge || ""
  );
  const [stockStatusDraft, setStockStatusDraft] = useState(
    product.stockStatus || "In stock"
  );
  const [categoryIdDraft, setCategoryIdDraft] = useState(product.category.id);
  const [subCategoryIdsDraft, setSubCategoryIdsDraft] = useState<string[]>(
    product.subCategoryIds || []
  );
  const [problemStatementIdsDraft, setProblemStatementIdsDraft] = useState<
    string[]
  >(product.problemStatementIds || []);
  const [industryIdsDraft, setIndustryIdsDraft] = useState<string[]>(
    product.industryIds || []
  );

  // Gallery form state
  const [imagesDraft, setImagesDraft] = useState(product.images);
  const [videoUrlDraft, setVideoUrlDraft] = useState(product.videoUrl || "");
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropTargetVariantIdx, setCropTargetVariantIdx] = useState<
    number | null
  >(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const galleryFileRef = useRef<HTMLInputElement | null>(null);

  // Variants form state
  const [variantsDraft, setVariantsDraft] = useState<
    { name: string; price: string; imageUrl: string }[]
  >(() =>
    product.variants.map((v) => ({
      name: v.name,
      price: v.price != null ? String(v.price) : "",
      imageUrl: v.imageUrl || v.images?.[0]?.url || "",
    }))
  );
  const variantFileRef = useRef<HTMLInputElement | null>(null);

  const [savingPatch, setSavingPatch] = useState(false);

  useEffect(() => {
    setImagesDraft(product.images);
    setVideoUrlDraft(product.videoUrl || "");
  }, [product.images, product.videoUrl]);

  useEffect(() => {
    setVariantsDraft(
      product.variants.map((v) => ({
        name: v.name,
        price: v.price != null ? String(v.price) : "",
        imageUrl: v.imageUrl || v.images?.[0]?.url || "",
      }))
    );
  }, [product.variants]);

  const currentPrice =
    selectedVariant?.price || product.discountPrice || product.basePrice;
  const originalPrice = selectedVariant ? null : product.basePrice;
  const currentName = selectedVariant
    ? `${product.name} - ${selectedVariant.name}`
    : product.name;

  const defaultImage =
    product.images.find((i) => i.isMain)?.url ||
    product.images[0]?.url ||
    "/short-logo.png";
  const currentImage =
    selectedVariant?.imageUrl ||
    selectedVariant?.images?.[0]?.url ||
    defaultImage;
  const resolvedVideos = resolveProductVideos(product.videoUrl);

  const allImageUrls = Array.from(
    new Set([
      ...product.images.map((img) => img.url),
      ...product.variants
        .flatMap((v) => [
          v.imageUrl,
          ...(v.images?.map((img) => img.url) || []),
        ])
        .filter((url): url is string => Boolean(url)),
    ])
  );

  // Structured bullet highlights (never render a messy wall of prose)
  const highlightBullets = extractBulletsFromContent(
    product.descriptionHtml,
    product.description
  );
  const topHighlights = highlightBullets.slice(0, 4);

  const saveProductPatch = async (
    patch: Record<string, unknown>,
    onDone?: () => void
  ) => {
    setSavingPatch(true);
    try {
      const res = await fetch("/api/admin/inline-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "product_patch",
          productId: product.id,
          patch,
          pathname,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to update product.");
      }
      onDone?.();
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not save changes.");
    } finally {
      setSavingPatch(false);
    }
  };

  const handleUploadedFile = async (file: File) => {
    const targetVarIdx = cropTargetVariantIdx;
    setCropFile(null);
    setCropTargetVariantIdx(null);
    setUploadingPhoto(true);
    try {
      const compressed = await compressRasterImageIfNeeded(file, 2000);
      const url = await uploadAdminFile(compressed);
      if (targetVarIdx !== null) {
        setVariantsDraft((prev) =>
          prev.map((v, i) => (i === targetVarIdx ? { ...v, imageUrl: url } : v))
        );
      } else {
        setImagesDraft((prev) => [
          ...prev,
          { url, isMain: prev.length === 0 },
        ]);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
        {/* Left Column: Image Gallery & Product Video */}
        <div className="lg:col-span-6 xl:col-span-5 p-5 sm:p-8 lg:p-10 border-b lg:border-b-0 lg:border-r border-slate-200/80 bg-slate-50/50 space-y-6 min-w-0 relative">
          {editMode && (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowGalleryModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0056b3] hover:bg-[#004494] text-white text-xs font-semibold shadow-md transition-colors"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Manage Photos &amp; Video ({product.images.length})</span>
              </button>
              <Link
                href={`/admin/products/${product.id}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs transition-colors"
              >
                <Pencil className="w-3 h-3" />
                <span>Full Form</span>
              </Link>
            </div>
          )}

          <ProductGallery
            images={allImageUrls}
            productName={product.name}
            discountBadge={product.discountBadge}
            selectedImageUrl={
              selectedVariant?.imageUrl || selectedVariant?.images?.[0]?.url
            }
          />

          {resolvedVideos.length > 0 ? (
            <div className="pt-6 border-t border-slate-200/80 w-full">
              <UniversalVideoPlayer
                rawVideoUrl={product.videoUrl}
                productName={product.name}
                headerAction={
                  editMode ? (
                    <button
                      type="button"
                      onClick={() => setShowGalleryModal(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 hover:bg-[#0056b3] text-[#0056b3] hover:text-white border border-blue-200 text-[11px] font-semibold transition-colors"
                    >
                      <Pencil className="w-2.5 h-2.5" />
                      <span>Edit Videos</span>
                    </button>
                  ) : null
                }
              />
            </div>
          ) : editMode ? (
            <div className="pt-6 border-t border-slate-200/80 w-full">
              <button
                type="button"
                onClick={() => setShowGalleryModal(true)}
                className="w-full py-3.5 px-4 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/40 hover:bg-blue-50 text-[#0056b3] text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <PlayCircle className="w-4 h-4" />
                <span>
                  + Add Product Videos, YouTube Shorts, Instagram Reels or External Video Links
                </span>
              </button>
            </div>
          ) : null}
        </div>

        {/* Right Column: Product Details */}
        <div className="lg:col-span-6 xl:col-span-7 p-5 sm:p-8 lg:p-10 flex flex-col min-w-0">
          <div className="mb-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <Link
                href={`/shop/c/${product.category.slug}`}
                className="inline-block px-3 py-1 bg-blue-50 text-[#0056b3] text-xs font-bold rounded-full uppercase tracking-wider hover:bg-[#0056b3] hover:text-white transition-colors"
              >
                {product.category.name}
              </Link>

              {editMode && (
                <button
                  type="button"
                  onClick={() => setShowMetaModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 text-xs font-semibold transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                  <span>Edit Price / SKU / Stock</span>
                </button>
              )}
            </div>

            <EditableText
              as="h1"
              mode="plain"
              allowSwitchToHtml={false}
              label="Product Title"
              productPatch={{ productId: product.id, field: "name" }}
              value={currentName}
              contextHint={`Product title in ${product.category.name}`}
              className="text-3xl lg:text-4xl font-extrabold text-slate-900 leading-tight mb-2 block"
            />

            {(product.sku || editMode) && (
              <p className="text-sm font-medium text-slate-500">
                SKU:{" "}
                <EditableText
                  as="span"
                  mode="plain"
                  allowSwitchToHtml={false}
                  label="Product SKU"
                  productPatch={{ productId: product.id, field: "sku" }}
                  value={product.sku || "Set SKU"}
                />
              </p>
            )}
          </div>

          <div className="flex items-end gap-4 mb-6">
            {currentPrice ? (
              <>
                <span className="text-4xl font-extrabold text-[#0056b3]">
                  ₹{currentPrice.toLocaleString("en-IN")}
                </span>
                {originalPrice && product.discountPrice && (
                  <span className="text-lg font-medium text-slate-400 line-through mb-1">
                    ₹{originalPrice.toLocaleString("en-IN")}
                  </span>
                )}
              </>
            ) : (
              <span className="text-2xl font-bold text-slate-500">
                Price on Request
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold ${
                product.stockStatus === "In stock"
                  ? "bg-green-50 text-green-700"
                  : "bg-orange-50 text-orange-700"
              }`}
            >
              <Package size={18} />
              {product.stockStatus}
            </div>
          </div>

          {/* Structured Bullet Highlights (replaces unstructured long text) */}
          {(topHighlights.length > 0 || editMode) && (
            <div className="mb-8 p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 relative group/topb">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Quick Overview
                </span>
                {editMode && (
                  <button
                    type="button"
                    onClick={() =>
                      openEditor({
                        title: `Edit Bullet Points — ${product.name}`,
                        mode: "bullets",
                        initialValue: highlightBullets.join("\n"),
                        initialBullets: highlightBullets,
                        contextHint: `${product.name} (${product.category.name})`,
                        target: {
                          kind: "product_patch",
                          productId: product.id,
                          field: "bullets",
                        },
                      })
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold shadow-xs"
                  >
                    <Pencil className="w-2.5 h-2.5" />
                    <span>Edit Bullets</span>
                  </button>
                )}
              </div>

              {topHighlights.length > 0 ? (
                <ul className="space-y-2 text-sm sm:text-[15px] text-slate-700 leading-relaxed">
                  {topHighlights.map((b, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#0056b3] shrink-0" />
                      <span
                        dangerouslySetInnerHTML={{
                          __html: formatBulletItemHtml(b),
                        }}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Click &ldquo;Edit Bullets&rdquo; to add structured bullet-point highlights with AI.
                </p>
              )}
            </div>
          )}

          {/* Variants */}
          {(product.variants.length > 0 || editMode) && (
            <div className="mb-8">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  Select Variant
                  {selectedVariant && (
                    <button
                      type="button"
                      onClick={() => setSelectedVariant(null)}
                      className="text-xs font-normal text-blue-500 hover:underline"
                    >
                      Clear Selection
                    </button>
                  )}
                </h3>

                {editMode && (
                  <button
                    type="button"
                    onClick={() => setShowVariantsModal(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900 hover:bg-indigo-600 text-white text-xs font-semibold transition-colors"
                  >
                    <Layers className="w-3 h-3" />
                    <span>Manage Variants ({product.variants.length})</span>
                  </button>
                )}
              </div>

              {product.variants.length > 0 ? (
                <div className="flex flex-wrap gap-4">
                  {product.variants.map((variant) => {
                    const isSelected = selectedVariant?.id === variant.id;
                    return (
                      <button
                        type="button"
                        key={variant.id}
                        onClick={() => setSelectedVariant(variant)}
                        className={`group relative flex flex-col items-center border-2 rounded-2xl p-2 sm:p-3 transition-all w-24 sm:w-28 text-center ${
                          isSelected
                            ? "border-[#0056b3] bg-blue-50/30 shadow-md ring-2 ring-[#0056b3]/20"
                            : "border-slate-200 hover:border-[#0056b3]/60 hover:shadow-md bg-white"
                        }`}
                      >
                        {variant.imageUrl ? (
                          <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-3 bg-white border border-slate-100 shadow-sm">
                            <Image
                              src={variant.imageUrl}
                              alt={variant.name}
                              fill
                              sizes="100px"
                              className="object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          </div>
                        ) : (
                          <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-3 bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 shadow-sm group-hover:text-slate-400 transition-colors">
                            <Package size={28} />
                          </div>
                        )}
                        <span
                          className={`text-xs font-bold leading-tight ${
                            isSelected
                              ? "text-[#0056b3]"
                              : "text-slate-700 group-hover:text-slate-900"
                          }`}
                        >
                          {variant.name}
                        </span>
                        {variant.price ? (
                          <span
                            className={`text-[11px] mt-1 font-medium ${
                              isSelected ? "text-blue-600" : "text-slate-500"
                            }`}
                          >
                            ₹{variant.price.toLocaleString("en-IN")}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  No color/finish variants configured. Click &ldquo;Manage Variants&rdquo; to add options.
                </p>
              )}
            </div>
          )}

          {/* Call to action */}
          <ProductActions
            product={{
              id: selectedVariant
                ? `${product.id}-${selectedVariant.id}`
                : product.id,
              name: currentName,
              slug: product.slug,
              price: currentPrice || null,
              image: currentImage,
            }}
            phone={phone}
          />

          {/* Factory Assurance & Institutional Dispatch Grid */}
          <div className="mt-6 pt-5 border-t border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
              <p className="text-[11px] font-extrabold text-slate-900">
                ISO 9001:2015
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Certified fabrication quality
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
              <p className="text-[11px] font-extrabold text-slate-900">
                16,000 sq. ft. Factory
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Direct manufacturer pricing
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
              <p className="text-[11px] font-extrabold text-slate-900">
                Custom Branding
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                UV logo print &amp; laser engraving
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
              <p className="text-[11px] font-extrabold text-slate-900">
                Pan-India Shipping
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Safe foam &amp; wooden crate packing
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal 1: Quick Edit Price, SKU, Stock & Category */}
      {showMetaModal && (
        <div
          className="fixed inset-0 z-[115] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !savingPatch)
              setShowMetaModal(false);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base">
                Quick Edit Pricing, SKU, Subcategories &amp; Use Cases
              </h3>
              <button
                type="button"
                onClick={() => setShowMetaModal(false)}
                className="text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {allCategories.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Main Category
                  </label>
                  <select
                    value={categoryIdDraft}
                    onChange={(e) => {
                      const nextCatId = e.target.value;
                      setCategoryIdDraft(nextCatId);
                      const nextSubs =
                        allCategories.find((c) => c.id === nextCatId)
                          ?.subCategories || [];
                      setSubCategoryIdsDraft((prev) =>
                        prev.filter((id) => nextSubs.some((s) => s.id === id))
                      );
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-900"
                  >
                    {allCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(() => {
                const availSubs =
                  allCategories.find((c) => c.id === categoryIdDraft)
                    ?.subCategories || [];
                if (availSubs.length === 0) return null;
                return (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Subcategories (Multi-Select)
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {availSubs.map((sc) => {
                        const checked = subCategoryIdsDraft.includes(sc.id);
                        return (
                          <button
                            key={sc.id}
                            type="button"
                            onClick={() =>
                              setSubCategoryIdsDraft((prev) =>
                                checked
                                  ? prev.filter((x) => x !== sc.id)
                                  : [...prev, sc.id]
                              )
                            }
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                              checked
                                ? "bg-indigo-600 text-white border-indigo-600"
                                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            {checked ? "✓ " : ""}
                            {sc.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {allProblemStatements.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Product Use Cases &amp; Applications (Multi-Select)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {allProblemStatements.map((ps) => {
                      const checked = problemStatementIdsDraft.includes(ps.id);
                      return (
                        <button
                          key={ps.id}
                          type="button"
                          onClick={() =>
                            setProblemStatementIdsDraft((prev) =>
                              checked
                                ? prev.filter((x) => x !== ps.id)
                                : [...prev, ps.id]
                            )
                          }
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                            checked
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {checked ? "✓ " : ""}
                          {ps.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {allIndustries.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Industries &amp; Venues (Multi-Select)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {allIndustries.map((ind) => {
                      const checked = industryIdsDraft.includes(ind.id);
                      return (
                        <button
                          key={ind.id}
                          type="button"
                          onClick={() =>
                            setIndustryIdsDraft((prev) =>
                              checked
                                ? prev.filter((x) => x !== ind.id)
                                : [...prev, ind.id]
                            )
                          }
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                            checked
                              ? "bg-emerald-600 text-white border-emerald-600"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {checked ? "✓ " : ""}
                          {ind.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    SKU Code
                  </label>
                  <input
                    type="text"
                    value={skuDraft}
                    onChange={(e) => setSkuDraft(e.target.value)}
                    placeholder="e.g. CC-POD-101"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Stock Status
                  </label>
                  <select
                    value={stockStatusDraft}
                    onChange={(e) => setStockStatusDraft(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-900"
                  >
                    <option value="In stock">In stock</option>
                    <option value="Made to order">Made to order</option>
                    <option value="Out of stock">Out of stock</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Base / MRP Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={basePriceDraft}
                    onChange={(e) => setBasePriceDraft(e.target.value)}
                    placeholder="Leave empty for Price on Request"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Selling / Discount Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={discountPriceDraft}
                    onChange={(e) => setDiscountPriceDraft(e.target.value)}
                    placeholder="Optional discounted price"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Discount Badge (Optional)
                </label>
                <input
                  type="text"
                  value={discountBadgeDraft}
                  onChange={(e) => setDiscountBadgeDraft(e.target.value)}
                  placeholder="e.g. Bulk Institutional Pricing Available"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-900"
                />
              </div>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowMetaModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-sm text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingPatch}
                onClick={() =>
                  void saveProductPatch(
                    {
                      sku: skuDraft,
                      basePrice: basePriceDraft,
                      discountPrice: discountPriceDraft,
                      discountBadge: discountBadgeDraft,
                      stockStatus: stockStatusDraft,
                      categoryId: categoryIdDraft,
                      subCategoryIds: subCategoryIdsDraft,
                      problemStatementIds: problemStatementIdsDraft,
                      industryIds: industryIdsDraft,
                    },
                    () => setShowMetaModal(false)
                  )
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-50"
              >
                {savingPatch ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>Save Details</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Manage Gallery Photos & YouTube Video */}
      {showGalleryModal && (
        <div
          className="fixed inset-0 z-[115] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !savingPatch)
              setShowGalleryModal(false);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base">
                Manage Gallery Photos &amp; Product Video
              </h3>
              <button
                type="button"
                onClick={() => setShowGalleryModal(false)}
                className="text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Product Photos ({imagesDraft.length})
                  </span>
                  <div>
                    <input
                      ref={galleryFileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        if (!f) return;
                        setCropTargetVariantIdx(null);
                        setCropFile(f);
                      }}
                    />
                    <button
                      type="button"
                      disabled={uploadingPhoto}
                      onClick={() => galleryFileRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                    >
                      {uploadingPhoto ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      <span>Upload &amp; Crop Photo</span>
                    </button>
                  </div>
                </div>

                {imagesDraft.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {imagesDraft.map((img, idx) => (
                      <div
                        key={idx}
                        className={`relative rounded-xl border-2 p-2 bg-slate-50 ${
                          img.isMain ? "border-indigo-600" : "border-slate-200"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.url}
                          alt={`Product ${idx + 1}`}
                          className="w-full h-28 object-contain rounded-lg bg-white"
                        />
                        <div className="mt-2 flex items-center justify-between gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setImagesDraft((prev) =>
                                prev.map((item, i) => ({
                                  ...item,
                                  isMain: i === idx,
                                }))
                              )
                            }
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                              img.isMain
                                ? "bg-indigo-600 text-white"
                                : "bg-white text-slate-600 border border-slate-200"
                            }`}
                          >
                            <Star className="w-3 h-3" />
                            <span>{img.isMain ? "Main" : "Set Main"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setImagesDraft((prev) =>
                                prev.filter((_, i) => i !== idx)
                              )
                            }
                            className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                            title="Delete photo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic py-6 text-center border border-dashed border-slate-200 rounded-xl">
                    No photos uploaded yet. Click &ldquo;Upload &amp; Crop Photo&rdquo; above.
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100">
                <VideoLinksEditor
                  value={videoUrlDraft}
                  onChange={setVideoUrlDraft}
                  productName={product.name}
                />
              </div>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowGalleryModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-sm text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingPatch || uploadingPhoto}
                onClick={() =>
                  void saveProductPatch(
                    {
                      images: imagesDraft,
                      videoUrl:
                        serializeVideoUrlEntries(
                          parseVideoUrlEntries(videoUrlDraft)
                        ) || "",
                    },
                    () => setShowGalleryModal(false)
                  )
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-50"
              >
                {savingPatch ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>Save Gallery &amp; Video</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Manage Color / Finish Variants */}
      {showVariantsModal && (
        <div
          className="fixed inset-0 z-[115] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !savingPatch)
              setShowVariantsModal(false);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base">
                Manage Color / Finish Variants
              </h3>
              <button
                type="button"
                onClick={() => setShowVariantsModal(false)}
                className="text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              <input
                ref={variantFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  setCropFile(f);
                }}
              />

              {variantsDraft.map((v, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-3"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setCropTargetVariantIdx(idx);
                      variantFileRef.current?.click();
                    }}
                    className="w-14 h-14 rounded-lg border border-slate-300 bg-white flex items-center justify-center overflow-hidden shrink-0 hover:border-indigo-500"
                    title="Upload variant thumbnail"
                  >
                    {v.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={v.imageUrl}
                        alt={v.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Upload className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={v.name}
                      onChange={(e) =>
                        setVariantsDraft((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, name: e.target.value } : item
                          )
                        )
                      }
                      placeholder="Variant (e.g. Clear / Frosted / Black)"
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900"
                    />
                    <input
                      type="number"
                      min="0"
                      value={v.price}
                      onChange={(e) =>
                        setVariantsDraft((prev) =>
                          prev.map((item, i) =>
                            i === idx
                              ? { ...item, price: e.target.value }
                              : item
                          )
                        )
                      }
                      placeholder="Price override (optional)"
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setVariantsDraft((prev) =>
                        prev.filter((_, i) => i !== idx)
                      )
                    }
                    className="p-1.5 text-slate-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() =>
                  setVariantsDraft((prev) => [
                    ...prev,
                    { name: "", price: "", imageUrl: "" },
                  ])
                }
                className="w-full py-2.5 rounded-xl border border-dashed border-indigo-300 text-indigo-700 hover:bg-indigo-50 text-xs font-semibold inline-flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Variant Option</span>
              </button>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowVariantsModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-sm text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingPatch || uploadingPhoto}
                onClick={() =>
                  void saveProductPatch(
                    {
                      variants: variantsDraft
                        .filter((v) => v.name.trim())
                        .map((v) => ({
                          name: v.name.trim(),
                          price: v.price ? Number(v.price) : null,
                          imageUrl: v.imageUrl || null,
                        })),
                    },
                    () => setShowVariantsModal(false)
                  )
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-50"
              >
                {savingPatch ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>Save Variants</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {cropFile && (
        <ImageCropperModal
          file={cropFile}
          defaultAspectRatio={1}
          onComplete={(cropped) => void handleUploadedFile(cropped)}
          onSkipCrop={(orig) => void handleUploadedFile(orig)}
          onCancel={() => {
            setCropFile(null);
            setCropTargetVariantIdx(null);
          }}
        />
      )}
    </>
  );
}
