"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  Sparkles,
  ListChecks,
  Ruler,
  Sliders,
  ExternalLink,
  Check,
  X,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { MultiImageUploader } from "@/components/admin/MultiImageUploader";
import { VideoLinksEditor } from "@/components/admin/VideoLinksEditor";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { isNextRedirectError } from "@/lib/is-redirect";
import { extractBulletsFromContent } from "@/lib/bullet-formatter";

interface SubCategoryItem {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  subCategories?: SubCategoryItem[];
}

export interface ProductActionResult {
  success?: boolean;
  error?: string;
  id?: string;
  slug?: string;
}

interface ProductFormProps {
  categories: Category[];
  podiumSubCategories?: Category[];
  problemStatements?: Category[];
  industries?: Category[];
  action: (formData: FormData) => Promise<ProductActionResult | void>;
  product?: any;
  isPodiumForm?: boolean;
  redirectTo?: string;
  successMessage?: string;
  onSuccess?: () => void;
}

export function ProductForm({
  categories,
  podiumSubCategories = [],
  problemStatements = [],
  industries = [],
  action,
  product,
  isPodiumForm = false,
  redirectTo,
  successMessage,
  onSuccess,
}: ProductFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement | null>(null);
  const nextKeyRef = useRef<number>(1000);

  const allocKey = () => {
    nextKeyRef.current += 1;
    return `k_${Date.now()}_${nextKeyRef.current}`;
  };

  // Controlled core fields so ACRIO Autofill can read & populate cleanly after admin confirmation
  const [name, setName] = useState<string>(product?.name || "");
  const [categoryId, setCategoryId] = useState<string>(product?.categoryId || "");
  const [selectedSubCategoryIds, setSelectedSubCategoryIds] = useState<string[]>(
    () =>
      Array.from(
        new Set([
          ...(product?.subCategoryId ? [product.subCategoryId] : []),
          ...(product?.subCategories?.map((s: any) => s.id) || []),
        ])
      )
  );
  const [selectedPodiumSubIds, setSelectedPodiumSubIds] = useState<string[]>(
    () =>
      Array.from(
        new Set([
          ...(product?.podiumSubCategoryId ? [product.podiumSubCategoryId] : []),
          ...(product?.podiumSubCategories?.map((s: any) => s.id) || []),
        ])
      )
  );
  const [sku, setSku] = useState<string>(product?.sku || "");
  const [importantNoteHtml, setImportantNoteHtml] = useState<string>(
    product?.importantNoteHtml || ""
  );

  const initialExtractedBullets = extractBulletsFromContent(
    product?.descriptionHtml,
    product?.description
  );

  const [descriptionBullets, setDescriptionBullets] = useState<
    { id: string; text: string }[]
  >(
    initialExtractedBullets.length > 0
      ? initialExtractedBullets.map((text, idx) => ({
          id: `db_${idx}`,
          text,
        }))
      : [
          { id: "db_0", text: "" },
          { id: "db_1", text: "" },
          { id: "db_2", text: "" },
        ]
  );

  const [pasteRawNotes, setPasteRawNotes] = useState("");
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [aiNotes, setAiNotes] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [bulletAiLoading, setBulletAiLoading] = useState(false);

  // Pending ACRIO draft state — NEVER applied to form fields until Admin reviews & confirms!
  const [pendingAiDraft, setPendingAiDraft] = useState<{
    mode: "full" | "bullets_only";
    warning?: string;
    applyBullets: boolean;
    bullets: string[];
    applyFeatures: boolean;
    features: string[];
    applySpecs: boolean;
    specs: { name: string; value: string; type: "dimension" | "specification" }[];
    applyImportantNote: boolean;
    importantNoteHtml: string;
    applyTags: boolean;
    matchedIndustryIds: string[];
    matchedProblemIds: string[];
    suggestedNewUseCases: string;
    suggestedNewIndustries: string;
  } | null>(null);

  const [newSubCategoryInput, setNewSubCategoryInput] = useState("");
  const [newPodiumSubCategoryInput, setNewPodiumSubCategoryInput] = useState("");
  const [newUseCasesInput, setNewUseCasesInput] = useState("");
  const [newIndustriesInput, setNewIndustriesInput] = useState("");

  const [selectedProblemIds, setSelectedProblemIds] = useState<string[]>(
    product?.problemStatements?.map((p: any) => p.id) || []
  );
  const [selectedIndustryIds, setSelectedIndustryIds] = useState<string[]>(
    product?.industries?.map((i: any) => i.id) || []
  );

  const [features, setFeatures] = useState<{ id: string; text: string }[]>(
    product?.features?.length
      ? product.features.map((f: any, i: number) => ({
          id: f.id || `f_${i}`,
          text: f.text || "",
        }))
      : [{ id: "f_init", text: "" }]
  );

  const [specs, setSpecs] = useState<
    { id: string; name: string; value: string; type: string }[]
  >(
    product?.specifications?.length
      ? product.specifications.map((s: any, i: number) => ({
          id: s.id || `s_${i}`,
          name: s.name || "",
          value: s.value || "",
          type: s.type || "specification",
        }))
      : [
          { id: "s_dim_init", name: "", value: "", type: "dimension" },
          { id: "s_spec_init", name: "", value: "", type: "specification" },
        ]
  );

  const [variants, setVariants] = useState(
    product?.variants?.length
      ? product.variants.map((v: any, idx: number) => ({
          id: String(v.id || `v_${idx}`),
          name: v.name || "",
          price: v.price ?? "",
          imageUrl: v.imageUrl || "",
          images: v.images
            ? v.images.map((img: any) => (typeof img === "string" ? img : img.url))
            : [],
        }))
      : [{ id: "v_init", name: "", price: "", imageUrl: "", images: [] }]
  );

  const mainImage =
    product?.images?.find((i: any) => i.isMain)?.url ||
    product?.images?.[0]?.url ||
    "";
  const initialGalleryImages =
    product?.images
      ?.filter((i: any) => i.url !== mainImage)
      .map((i: any) => i.url) || [];
  const showPodiumSubCategory =
    isPodiumForm || product?.isPodium || podiumSubCategories.length > 0;

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const selectedCategoryName = selectedCategory?.name || "";
  const availableSubCategories = selectedCategory?.subCategories || [];

  // ACRIO Magic Fill entire product -> Prepares draft & opens Confirmation Modal (NEVER overwrites directly!)
  const handleAiMagicFill = async () => {
    if (!name.trim()) {
      toast.error("Please enter a Product Name first so ACRIO knows what to write.");
      return;
    }

    setAiLoading(true);
    try {
      const res = await fetch("/api/admin/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "product_autofill",
          name: name.trim(),
          categoryName: selectedCategoryName,
          isPodium: Boolean(isPodiumForm || product?.isPodium),
          sku: sku.trim() || undefined,
          existingDescription: descriptionBullets
            .map((b) => b.text)
            .filter(Boolean)
            .join("\n"),
          existingSpecs: specs.filter((s) => s.name && s.value),
          customNotes: aiNotes.trim() || undefined,
        }),
      });
      const json = await res.json();

      if (json?.ok && json.data) {
        const d = json.data;
        const proposedSpecs: {
          name: string;
          value: string;
          type: "dimension" | "specification";
        }[] = [];
        if (Array.isArray(d.dimensions)) {
          for (const dim of d.dimensions) {
            if (dim?.name && dim?.value) {
              proposedSpecs.push({
                name: String(dim.name),
                value: String(dim.value),
                type: "dimension",
              });
            }
          }
        }
        if (Array.isArray(d.specifications)) {
          for (const sp of d.specifications) {
            if (sp?.name && sp?.value) {
              proposedSpecs.push({
                name: String(sp.name),
                value: String(sp.value),
                type: "specification",
              });
            }
          }
        }

        const unmatchedProblems = Array.isArray(d.suggestedProblems)
          ? d.suggestedProblems.filter(
              (sName: string) =>
                !problemStatements.some(
                  (ps) => ps.name.toLowerCase() === String(sName).toLowerCase()
                )
            )
          : [];
        const unmatchedIndustries = Array.isArray(d.suggestedIndustries)
          ? d.suggestedIndustries.filter(
              (iName: string) =>
                !industries.some(
                  (ind) => ind.name.toLowerCase() === String(iName).toLowerCase()
                )
            )
          : [];

        setPendingAiDraft({
          mode: "full",
          warning: json.warning,
          applyBullets: Array.isArray(d.bullets) && d.bullets.length > 0,
          bullets: Array.isArray(d.bullets) ? d.bullets : [],
          applyFeatures: Array.isArray(d.features) && d.features.length > 0,
          features: Array.isArray(d.features) ? d.features : [],
          applySpecs: proposedSpecs.length > 0,
          specs: proposedSpecs,
          applyImportantNote: Boolean(d.importantNoteHtml && !importantNoteHtml.trim()),
          importantNoteHtml: d.importantNoteHtml || "",
          applyTags:
            (Array.isArray(d.matchedIndustryIds) && d.matchedIndustryIds.length > 0) ||
            (Array.isArray(d.matchedProblemIds) && d.matchedProblemIds.length > 0) ||
            unmatchedProblems.length > 0 ||
            unmatchedIndustries.length > 0,
          matchedIndustryIds: Array.isArray(d.matchedIndustryIds)
            ? d.matchedIndustryIds
            : [],
          matchedProblemIds: Array.isArray(d.matchedProblemIds)
            ? d.matchedProblemIds
            : [],
          suggestedNewUseCases: unmatchedProblems.join(", "),
          suggestedNewIndustries: unmatchedIndustries.join(", "),
        });
      } else {
        // Non-blocking smart template fallback -> ALSO shown in Confirmation Modal first!
        const catLabel =
          selectedCategoryName || (isPodiumForm ? "Acrylic Podiums" : "Acrylic Products");
        setPendingAiDraft({
          mode: "bullets_only",
          warning:
            json?.error ||
            "Prepared clear starter bullet points locally. Review and confirm below before applying.",
          applyBullets: true,
          bullets: [
            `Material: Made from 100% imported clear cast acrylic that stays strong and does not turn yellow over time.`,
            `Clean Finish: Laser-cut and CNC-shaped with smooth diamond-polished edges at our ISO 9001:2015 factory (Since 2008).`,
            `Built For Daily Use: Practical ${catLabel.toLowerCase()} design (${name.trim()}${sku ? `, SKU ${sku}` : ""}) suitable for offices, hotels, schools, and shops.`,
            `Custom Logo & Size: Available in custom sizes, clear or frosted colors, and UV-printed or laser-engraved company logos.`,
          ],
          applyFeatures: false,
          features: [],
          applySpecs: false,
          specs: [],
          applyImportantNote: false,
          importantNoteHtml: "",
          applyTags: false,
          matchedIndustryIds: [],
          matchedProblemIds: [],
          suggestedNewUseCases: "",
          suggestedNewIndustries: "",
        });
      }
    } catch {
      toast.error("Could not reach ACRIO.");
    } finally {
      setAiLoading(false);
    }
  };

  // Convert pasted prose or polish existing bullets -> Opens Confirmation Modal before applying!
  const handleBulletizeDescription = async (rawSource?: string) => {
    const sourceText =
      (rawSource !== undefined ? rawSource : pasteRawNotes).trim() ||
      descriptionBullets
        .map((b) => b.text)
        .filter(Boolean)
        .join("\n") ||
      `${name} (${selectedCategoryName})`;

    if (!sourceText.trim()) {
      toast.error("Enter some notes or a product name first.");
      return;
    }

    setBulletAiLoading(true);
    try {
      const res = await fetch("/api/admin/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "inline_rewrite",
          currentText: sourceText,
          instruction: `Convert into 5 clear, easy-to-understand layman bullet points for "${
            name || "Acrylic Product"
          }" starting with short labels like "Material:", "Finish:", "Size & Design:", "Custom Logo:", "Best Used For:". Avoid em dashes and fancy words.`,
          mode: "bullets",
          fieldLabel: "Product Bullet Description",
        }),
      });
      const json = await res.json();
      const candidateBullets: string[] =
        json?.ok && Array.isArray(json.bullets) && json.bullets.length > 0
          ? json.bullets
          : extractBulletsFromContent(sourceText);

      if (candidateBullets.length > 0) {
        setPendingAiDraft({
          mode: "bullets_only",
          warning: json?.warning,
          applyBullets: true,
          bullets: candidateBullets,
          applyFeatures: false,
          features: [],
          applySpecs: false,
          specs: [],
          applyImportantNote: false,
          importantNoteHtml: "",
          applyTags: false,
          matchedIndustryIds: [],
          matchedProblemIds: [],
          suggestedNewUseCases: "",
          suggestedNewIndustries: "",
        });
      } else {
        toast.error(json?.error || "Could not format bullet points.");
      }
    } catch {
      const local = extractBulletsFromContent(sourceText);
      if (local.length > 0) {
        setPendingAiDraft({
          mode: "bullets_only",
          applyBullets: true,
          bullets: local,
          applyFeatures: false,
          features: [],
          applySpecs: false,
          specs: [],
          applyImportantNote: false,
          importantNoteHtml: "",
          applyTags: false,
          matchedIndustryIds: [],
          matchedProblemIds: [],
          suggestedNewUseCases: "",
          suggestedNewIndustries: "",
        });
      }
    } finally {
      setBulletAiLoading(false);
    }
  };

  const handleConfirmApplyAiDraft = () => {
    if (!pendingAiDraft) return;

    if (pendingAiDraft.applyBullets && pendingAiDraft.bullets.length > 0) {
      const clean = pendingAiDraft.bullets.map((b) => b.trim()).filter(Boolean);
      if (clean.length > 0) {
        setDescriptionBullets(clean.map((text) => ({ id: allocKey(), text })));
      }
    }

    if (pendingAiDraft.applyFeatures && pendingAiDraft.features.length > 0) {
      const cleanF = pendingAiDraft.features.map((f) => f.trim()).filter(Boolean);
      if (cleanF.length > 0) {
        setFeatures(cleanF.map((text) => ({ id: allocKey(), text })));
      }
    }

    if (pendingAiDraft.applySpecs && pendingAiDraft.specs.length > 0) {
      const cleanS = pendingAiDraft.specs.filter(
        (s) => s.name.trim() && s.value.trim()
      );
      if (cleanS.length > 0) {
        setSpecs(
          cleanS.map((s) => ({
            id: allocKey(),
            name: s.name.trim(),
            value: s.value.trim(),
            type: s.type,
          }))
        );
      }
    }

    if (pendingAiDraft.applyImportantNote && pendingAiDraft.importantNoteHtml.trim()) {
      setImportantNoteHtml(pendingAiDraft.importantNoteHtml);
    }

    if (pendingAiDraft.applyTags) {
      if (pendingAiDraft.matchedIndustryIds.length > 0) {
        setSelectedIndustryIds((prev) =>
          Array.from(new Set([...prev, ...pendingAiDraft.matchedIndustryIds]))
        );
      }
      if (pendingAiDraft.matchedProblemIds.length > 0) {
        setSelectedProblemIds((prev) =>
          Array.from(new Set([...prev, ...pendingAiDraft.matchedProblemIds]))
        );
      }
      if (pendingAiDraft.suggestedNewUseCases.trim()) {
        setNewUseCasesInput((prev) =>
          prev.trim()
            ? `${prev.trim()}, ${pendingAiDraft.suggestedNewUseCases.trim()}`
            : pendingAiDraft.suggestedNewUseCases.trim()
        );
      }
      if (pendingAiDraft.suggestedNewIndustries.trim()) {
        setNewIndustriesInput((prev) =>
          prev.trim()
            ? `${prev.trim()}, ${pendingAiDraft.suggestedNewIndustries.trim()}`
            : pendingAiDraft.suggestedNewIndustries.trim()
        );
      }
    }

    setShowPasteBox(false);
    setPasteRawNotes("");
    setPendingAiDraft(null);
    toast.success("Approved ACRIO changes applied to form! Click Save Product when ready.");
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isPending) return;

    const formEl = e.currentTarget;
    if (formEl.querySelector('[data-uploading="true"]')) {
      const msg = "Please wait for image cropping/uploading to complete before saving.";
      toast.error(msg);
      setFormError(msg);
      return;
    }

    setFormError(null);
    const formData = new FormData(formEl);

    startTransition(async () => {
      try {
        const res = await action(formData);
        if (res && typeof res === "object" && "error" in res && res.error) {
          setFormError(res.error);
          toast.error(res.error);
          setTimeout(() => {
            errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 50);
          return;
        }

        if (successMessage) {
          toast.success(successMessage);
        } else if (redirectTo) {
          toast.success(product?.id ? "Updated successfully!" : "Created successfully!");
        }

        if (onSuccess) {
          onSuccess();
        }

        if (redirectTo) {
          router.push(redirectTo);
          router.refresh();
        }
      } catch (err: any) {
        if (isNextRedirectError(err)) {
          throw err;
        }
        const msg =
          err?.message ||
          "Failed to save product. Please check your connection and try again.";
        console.error("ProductForm submit error:", err);
        setFormError(msg);
        toast.error(msg);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8" aria-busy={isPending}>
      <input type="hidden" name="syncDescriptionFromBullets" value="true" />
      {(isPodiumForm || product?.isPodium !== undefined) && (
        <input
          type="hidden"
          name="isPodium"
          value={String(Boolean(isPodiumForm || product?.isPodium))}
        />
      )}

      {/* ACRIO Product Co-Pilot Banner */}
      <div className="bg-gradient-to-r from-indigo-950 via-blue-950 to-slate-900 text-white rounded-2xl p-5 md:p-6 shadow-lg border border-indigo-500/30 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/25 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-sm md:text-base font-extrabold tracking-tight flex items-center gap-2">
                <span>ACRIO Product Co-Pilot (Claude Haiku 5.5)</span>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-bold">
                  Plain English
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Enter Product Name &amp; Category below, then let ACRIO write simple bullet descriptions, key features, dimensions &amp; specs in one click.
              </p>
            </div>
          </div>

          {product?.slug && (
            <Link
              href={`/shop/p/${product.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/15 transition-colors"
            >
              <span>Edit Live on Product Page</span>
              <ExternalLink size={13} />
            </Link>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            value={aiNotes}
            onChange={(e) => setAiNotes(e.target.value)}
            placeholder="Optional notes for ACRIO (e.g. '12mm clear acrylic, 45 inch height, dual mic mount, warm LED base')..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white placeholder:text-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button
            type="button"
            disabled={aiLoading}
            onClick={handleAiMagicFill}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-400 hover:to-blue-400 text-white text-xs font-extrabold shadow-md inline-flex items-center justify-center gap-2 transition-all disabled:opacity-60 shrink-0"
          >
            {aiLoading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Writing with ACRIO...
              </>
            ) : (
              <>
                <Sparkles size={15} />
                Auto-Fill with ACRIO
              </>
            )}
          </button>
        </div>
      </div>

      {formError && (
        <div
          ref={errorRef}
          className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl flex items-start gap-3 shadow-xs"
        >
          <AlertCircle className="shrink-0 mt-0.5 text-red-600" size={20} />
          <div className="text-sm font-semibold">{formError}</div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6 space-y-6">
        <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">
          Basic Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Product Name *
            </label>
            <input
              type="text"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white text-sm"
              placeholder="e.g. Acrylic Podium CCP053"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Main Category *
            </label>
            <select
              name="categoryId"
              value={categoryId}
              onChange={(e) => {
                const nextCatId = e.target.value;
                setCategoryId(nextCatId);
                const nextCat = categories.find((c) => c.id === nextCatId);
                setSelectedSubCategoryIds((prev) =>
                  prev.filter((sid) =>
                    nextCat?.subCategories?.some((s) => s.id === sid)
                  )
                );
              }}
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white text-sm appearance-none"
            >
              <option value="">Select a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              SKU (Optional, must be unique if set)
            </label>
            <input
              type="text"
              name="sku"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white text-sm"
              placeholder="e.g. CCP053"
            />
          </div>

          {/* Multi-Select Subcategories */}
          <div className="md:col-span-2 p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Subcategories (Multi-Select, Optional)
              </label>
              <span className="text-[11px] font-semibold text-[#0056b3] bg-blue-50 px-2.5 py-0.5 rounded-full">
                {selectedSubCategoryIds.length} Selected
              </span>
            </div>
            {!categoryId ? (
              <p className="text-xs text-slate-500">
                Select a Main Category above first to pick one or more subcategories.
              </p>
            ) : availableSubCategories.length === 0 ? (
              <p className="text-xs text-slate-500">
                No subcategories yet under this category. You can create one or more below (comma-separated).
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableSubCategories.map((sub) => {
                  const isChecked = selectedSubCategoryIds.includes(sub.id);
                  return (
                    <label
                      key={sub.id}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                        isChecked
                          ? "bg-[#0056b3] text-white border-[#0056b3] shadow-2xs"
                          : "bg-white text-slate-700 border-slate-200 hover:border-blue-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        name="subCategoryIds[]"
                        value={sub.id}
                        checked={isChecked}
                        onChange={(e) => {
                          setSelectedSubCategoryIds((prev) =>
                            e.target.checked
                              ? [...prev, sub.id]
                              : prev.filter((id) => id !== sub.id)
                          );
                        }}
                        className="sr-only"
                      />
                      <span>{isChecked ? "✓" : "+"}</span>
                      <span>{sub.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                + Add &amp; Assign New Subcategories (Comma-Separated)
              </label>
              <input
                type="text"
                name="newSubCategory"
                value={newSubCategoryInput}
                onChange={(e) => setNewSubCategoryInput(e.target.value)}
                disabled={!categoryId}
                placeholder="e.g. Countertop Stands, Wall Mounted Frames (creates & assigns automatically on save)"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] text-sm disabled:opacity-60"
              />
            </div>
          </div>

          {showPodiumSubCategory && (
            <>
              <div className="md:col-span-2 p-4 rounded-xl bg-blue-50/40 border border-blue-200/70 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Podium Ranges / Sub-Categories (Multi-Select, Optional)
                  </label>
                  <span className="text-[11px] font-semibold text-[#0056b3] bg-white px-2.5 py-0.5 rounded-full border border-blue-100">
                    {selectedPodiumSubIds.length} Selected
                  </span>
                </div>
                {podiumSubCategories.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {podiumSubCategories.map((sub) => {
                      const isChecked = selectedPodiumSubIds.includes(sub.id);
                      return (
                        <label
                          key={sub.id}
                          className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                            isChecked
                              ? "bg-[#0056b3] text-white border-[#0056b3] shadow-2xs"
                              : "bg-white text-slate-700 border-slate-200 hover:border-blue-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            name="podiumSubCategoryIds[]"
                            value={sub.id}
                            checked={isChecked}
                            onChange={(e) => {
                              setSelectedPodiumSubIds((prev) =>
                                e.target.checked
                                  ? [...prev, sub.id]
                                  : prev.filter((id) => id !== sub.id)
                              );
                            }}
                            className="sr-only"
                          />
                          <span>{isChecked ? "✓" : "+"}</span>
                          <span>{sub.name}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    No podium ranges created yet. Type one or more below to create and assign them.
                  </p>
                )}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    + Add &amp; Assign New Podium Ranges (Comma-Separated)
                  </label>
                  <input
                    type="text"
                    name="newPodiumSubCategory"
                    value={newPodiumSubCategoryInput}
                    onChange={(e) => setNewPodiumSubCategoryInput(e.target.value)}
                    placeholder="e.g. Clear Acrylic Podiums, LED Stage Podiums"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Patent / Registered Design Ref (Optional)
                </label>
                <input
                  type="text"
                  name="designRegistrationNo"
                  defaultValue={product?.designRegistrationNo || ""}
                  placeholder="e.g. Registered Design & Copyright Protected"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Card Hover Patent &amp; Copyright Info Text (Optional Override)
                </label>
                <input
                  type="text"
                  name="ipProtectionText"
                  defaultValue={product?.ipProtectionText || ""}
                  placeholder="Leave blank to show default Classic Concepts Patent & Copyright protection notice"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white text-sm"
                />
              </div>
            </>
          )}

          {/* Multi-Select Product Use Cases & Applications (Always Visible!) */}
          <div className="md:col-span-2 p-4 rounded-xl bg-indigo-50/40 border border-indigo-200/70 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Product Use Cases &amp; Applications (Multi-Select)
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  One product can fit multiple use cases (e.g. Stage Speeches, Reception Desk, Menu Display, Donation Collection). Select all that apply!
                </p>
              </div>
              <span className="text-[11px] font-semibold text-indigo-700 bg-white px-2.5 py-0.5 rounded-full border border-indigo-200">
                {selectedProblemIds.length} Selected
              </span>
            </div>

            {problemStatements.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {problemStatements.map((ps) => {
                  const isSelected = selectedProblemIds.includes(ps.id);
                  return (
                    <label
                      key={ps.id}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                        isSelected
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                          : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        name="problemStatements[]"
                        value={ps.id}
                        checked={isSelected}
                        onChange={(e) => {
                          setSelectedProblemIds((prev) =>
                            e.target.checked
                              ? [...prev, ps.id]
                              : prev.filter((id) => id !== ps.id)
                          );
                        }}
                        className="sr-only"
                      />
                      <span>{isSelected ? "✓" : "+"}</span>
                      <span>{ps.name}</span>
                    </label>
                  );
                })}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                + Add &amp; Assign New Use Cases (Comma-Separated, Multi-Assign)
              </label>
              <input
                type="text"
                name="newProblemStatements"
                value={newUseCasesInput}
                onChange={(e) => setNewUseCasesInput(e.target.value)}
                placeholder="e.g. Conference & Stage Speeches, Hotel Reception Desk, Classroom Teaching"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
          </div>

          {/* Multi-Select Industries & Venues (Always Visible!) */}
          <div className="md:col-span-2 p-4 rounded-xl bg-emerald-50/40 border border-emerald-200/70 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Industries &amp; Venues (Multi-Select)
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Select every industry or venue where customers use this product (e.g. Schools &amp; Colleges, Hotels &amp; Banquets, Retail Stores, Hospitals).
                </p>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 bg-white px-2.5 py-0.5 rounded-full border border-emerald-200">
                {selectedIndustryIds.length} Selected
              </span>
            </div>

            {industries.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {industries.map((ind) => {
                  const isSelected = selectedIndustryIds.includes(ind.id);
                  return (
                    <label
                      key={ind.id}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                        isSelected
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                          : "bg-white text-slate-700 border-slate-200 hover:border-emerald-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        name="industries[]"
                        value={ind.id}
                        checked={isSelected}
                        onChange={(e) => {
                          setSelectedIndustryIds((prev) =>
                            e.target.checked
                              ? [...prev, ind.id]
                              : prev.filter((id) => id !== ind.id)
                          );
                        }}
                        className="sr-only"
                      />
                      <span>{isSelected ? "✓" : "+"}</span>
                      <span>{ind.name}</span>
                    </label>
                  );
                })}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                + Add &amp; Assign New Industries / Venues (Comma-Separated)
              </label>
              <input
                type="text"
                name="newIndustries"
                value={newIndustriesInput}
                onChange={(e) => setNewIndustriesInput(e.target.value)}
                placeholder="e.g. Hotels & Convention Halls, Schools & Universities, Retail Showrooms"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6 space-y-6">
        <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">
          Pricing &amp; Status
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Base Price (₹)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              name="basePrice"
              defaultValue={product?.basePrice ?? ""}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white text-sm"
              placeholder="42000"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Discount Price (₹)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              name="discountPrice"
              defaultValue={product?.discountPrice ?? ""}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white text-sm"
              placeholder="23100"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Stock Status
            </label>
            <input
              type="text"
              name="stockStatus"
              defaultValue={product?.stockStatus || "In stock"}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Discount Badge Text
          </label>
          <input
            type="text"
            name="discountBadge"
            defaultValue={product?.discountBadge || ""}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white text-sm"
            placeholder="e.g. Up to 45% discount."
          />
        </div>
      </div>

      {/* Media & Structured Bullet-Point Product Description */}
      <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6 space-y-6">
        <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">
          Media &amp; Bullet-Point Description
        </h2>
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Main Image
          </label>
          <ImageUploader
            name="mainImage"
            defaultValue={mainImage}
            aspectRatio={1}
            aspectLabel="1:1 Square (Product Image)"
          />
        </div>

        <div className="pt-4 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">
            Additional Gallery Images
          </label>
          <MultiImageUploader
            name="galleryImages[]"
            defaultValues={initialGalleryImages}
            aspectRatio={1}
            aspectLabel="1:1 Square (Product Gallery)"
          />
        </div>

        <div className="pt-2 border-t border-slate-100">
          <VideoLinksEditor
            name="videoUrl"
            defaultValue={product?.videoUrl || ""}
            productName={name || product?.name || "Product"}
          />
        </div>

        {/* Structured Bullet-Point Description Editor */}
        <div className="pt-4 border-t border-slate-100 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <ListChecks size={15} className="text-[#0056b3]" />
                Product Description (Structured Bullet Points)
              </label>
              <p className="text-xs text-slate-500 mt-0.5">
                All product descriptions render as clean, scannable bullet points. Tip: Start each bullet with <code className="text-slate-700 font-semibold">Label: Details</code> for bold lead-ins.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={bulletAiLoading}
                onClick={() => handleBulletizeDescription()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-colors disabled:opacity-50"
              >
                {bulletAiLoading ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Sparkles size={13} />
                )}
                ACRIO Polish / Generate Bullets
              </button>
              <button
                type="button"
                onClick={() => setShowPasteBox((v) => !v)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                {showPasteBox ? "Close Paste Box" : "Paste Paragraph to Convert"}
              </button>
              <button
                type="button"
                onClick={() =>
                  setDescriptionBullets([
                    ...descriptionBullets,
                    { id: allocKey(), text: "" },
                  ])
                }
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#0056b3] hover:bg-blue-800 text-white text-xs font-bold transition-colors"
              >
                <Plus size={13} /> Add Bullet
              </button>
            </div>
          </div>

          {showPasteBox && (
            <div className="bg-indigo-50/50 border border-indigo-200 rounded-xl p-4 space-y-3">
              <textarea
                value={pasteRawNotes}
                onChange={(e) => setPasteRawNotes(e.target.value)}
                rows={4}
                placeholder="Paste any rough notes, supplier specs, or old long paragraph here and ACRIO will prepare clean bullet points for your review..."
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={bulletAiLoading || !pasteRawNotes.trim()}
                  onClick={() => handleBulletizeDescription(pasteRawNotes)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50"
                >
                  {bulletAiLoading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Sparkles size={14} />
                  )}
                  Convert Paragraph to Bullet Points
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2.5">
            {descriptionBullets.map((item, idx) => (
              <div key={item.id} className="flex items-start gap-2.5">
                <span className="mt-2.5 w-6 h-6 rounded-full bg-blue-50 text-[#0056b3] text-xs font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <input
                  type="text"
                  name="descriptionBullet[]"
                  value={item.text}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDescriptionBullets((prev) =>
                      prev.map((b, i) => (i === idx ? { ...b, text: val } : b))
                    );
                  }}
                  placeholder="e.g. Material & Finish: Made from 12mm thick imported clear cast acrylic with smooth diamond-polished edges."
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white text-sm"
                />
                <button
                  type="button"
                  onClick={() =>
                    setDescriptionBullets(
                      descriptionBullets.length > 1
                        ? descriptionBullets.filter((_, i) => i !== idx)
                        : [{ id: allocKey(), text: "" }]
                    )
                  }
                  className="p-2.5 text-red-500 hover:bg-red-50 rounded-lg shrink-0"
                  title="Remove bullet"
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Important Note / Care Instructions (Important Note Section)
          </label>
          <RichTextEditor
            name="importantNoteHtml"
            value={importantNoteHtml}
            onChangeValue={setImportantNoteHtml}
            fieldLabel="Important Note & Care Instructions"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h2 className="text-lg font-bold text-slate-800">Key Feature Highlights</h2>
          <button
            type="button"
            onClick={() => setFeatures([...features, { id: allocKey(), text: "" }])}
            className="text-xs font-bold text-[#0056b3] flex items-center gap-1 hover:underline"
          >
            <Plus size={14} /> Add Feature
          </button>
        </div>
        {features.map((f, index) => (
          <div key={f.id} className="flex items-center gap-3">
            <input
              type="text"
              name="featureText[]"
              value={f.text}
              onChange={(e) => {
                const val = e.target.value;
                setFeatures((prev) =>
                  prev.map((item, i) => (i === index ? { ...item, text: val } : item))
                );
              }}
              className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              placeholder="e.g. Custom corporate logo UV printing available."
            />
            <button
              type="button"
              onClick={() => setFeatures(features.filter((_, i) => i !== index))}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <h2 className="text-lg font-bold text-slate-800">
            Specifications &amp; Dimensions
          </h2>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                setSpecs([
                  ...specs,
                  { id: allocKey(), name: "", value: "", type: "dimension" },
                ])
              }
              className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-emerald-100"
            >
              <Ruler size={13} /> Add Dimension
            </button>
            <button
              type="button"
              onClick={() =>
                setSpecs([
                  ...specs,
                  { id: allocKey(), name: "", value: "", type: "specification" },
                ])
              }
              className="text-xs font-bold text-[#0056b3] bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-blue-100"
            >
              <Sliders size={13} /> Add Specification
            </button>
          </div>
        </div>
        {specs.map((s, index) => (
          <div key={s.id} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <input
              type="text"
              name="specName[]"
              value={s.name}
              onChange={(e) => {
                const val = e.target.value;
                setSpecs((prev) =>
                  prev.map((item, i) => (i === index ? { ...item, name: val } : item))
                );
              }}
              className="sm:w-1/3 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              placeholder={s.type === "dimension" ? "e.g. Overall Height" : "e.g. Material"}
            />
            <input
              type="text"
              name="specValue[]"
              value={s.value}
              onChange={(e) => {
                const val = e.target.value;
                setSpecs((prev) =>
                  prev.map((item, i) => (i === index ? { ...item, value: val } : item))
                );
              }}
              className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              placeholder={
                s.type === "dimension"
                  ? "e.g. 45 inches (H) x 24 inches (W)"
                  : "e.g. Imported Cast Acrylic"
              }
            />
            <select
              name="specType[]"
              value={s.type}
              onChange={(e) => {
                const val = e.target.value;
                setSpecs((prev) =>
                  prev.map((item, i) => (i === index ? { ...item, type: val } : item))
                );
              }}
              className="sm:w-40 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
            >
              <option value="dimension">Dimension</option>
              <option value="specification">Specification</option>
            </select>
            <button
              type="button"
              onClick={() => setSpecs(specs.filter((_, i) => i !== index))}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg self-end sm:self-auto"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h2 className="text-lg font-bold text-slate-800">Product Variants</h2>
          <button
            type="button"
            onClick={() =>
              setVariants([
                ...variants,
                { id: allocKey(), name: "", price: "", imageUrl: "", images: [] },
              ])
            }
            className="text-xs font-bold text-[#0056b3] flex items-center gap-1 hover:underline"
          >
            <Plus size={14} /> Add Variant
          </button>
        </div>
        {variants.map((v: any, index: number) => (
          <div
            key={v.id}
            className="flex flex-col gap-3 p-4 border border-slate-100 rounded-xl bg-slate-50 relative"
          >
            <input type="hidden" name="variantKey[]" value={v.id} />
            <button
              type="button"
              onClick={() => setVariants(variants.filter((_: any, i: number) => i !== index))}
              className="absolute top-4 right-4 text-red-500 hover:text-red-700"
            >
              <Trash2 size={18} />
            </button>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pr-8">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Variant Name
                </label>
                <input
                  type="text"
                  name="variantName[]"
                  defaultValue={v.name}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm"
                  placeholder="e.g. BLACK FROSTED"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Price Override (Optional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="variantPrice[]"
                  defaultValue={v.price}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm"
                  placeholder="Leaves base price if empty"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Variant Main Image
              </label>
              <ImageUploader
                name={`variantImage_${v.id}`}
                defaultValue={v.imageUrl || ""}
                aspectRatio={1}
                aspectLabel="1:1 Square (Variant Image)"
              />
            </div>
            <div className="pt-2 border-t border-slate-200">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Additional Images for this Variant (Optional)
              </label>
              <MultiImageUploader
                name={`variantGallery_${v.id}[]`}
                defaultValues={v.images || []}
                aspectRatio={1}
                aspectLabel="1:1 Square (Variant Gallery)"
              />
            </div>
          </div>
        ))}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-4 bg-[#0056b3] text-white font-bold rounded-xl hover:bg-blue-800 transition-colors text-lg shadow-soft disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {isPending ? (
          <>
            <Loader2 className="animate-spin" size={22} />
            Saving...
          </>
        ) : (
          "Save Product"
        )}
      </button>

      {/* Mandatory ACRIO Review & Confirmation Modal — Nothing overwrites form fields until confirmed */}
      {pendingAiDraft && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-950 to-slate-900 text-white flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base md:text-lg font-extrabold flex items-center gap-2">
                  <Sparkles size={18} className="text-amber-300" />
                  <span>Review &amp; Confirm ACRIO Suggestions</span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Nothing is changed yet. Review, edit if needed, uncheck anything you want to skip, and click Confirm.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPendingAiDraft(null)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {pendingAiDraft.warning && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
                  {pendingAiDraft.warning}
                </div>
              )}

              {/* 1. Bullet Points */}
              {pendingAiDraft.bullets.length > 0 && (
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
                  <label className="flex items-center justify-between gap-2 cursor-pointer">
                    <span className="inline-flex items-center gap-2 text-sm font-extrabold text-slate-900">
                      <input
                        type="checkbox"
                        checked={pendingAiDraft.applyBullets}
                        onChange={(e) =>
                          setPendingAiDraft((prev) =>
                            prev
                              ? { ...prev, applyBullets: e.target.checked }
                              : null
                          )
                        }
                        className="w-4 h-4 rounded text-indigo-600"
                      />
                      Bullet-Point Description ({pendingAiDraft.bullets.length} bullets)
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setPendingAiDraft((prev) =>
                          prev
                            ? { ...prev, bullets: [...prev.bullets, ""] }
                            : null
                        )
                      }
                      className="text-xs font-bold text-indigo-700 hover:underline"
                    >
                      + Add Bullet
                    </button>
                  </label>
                  <div className="space-y-2">
                    {pendingAiDraft.bullets.map((bText, bIdx) => (
                      <div key={bIdx} className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 w-5">
                          {bIdx + 1}.
                        </span>
                        <input
                          type="text"
                          value={bText}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPendingAiDraft((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    bullets: prev.bullets.map((x, i) =>
                                      i === bIdx ? val : x
                                    ),
                                  }
                                : null
                            );
                          }}
                          className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setPendingAiDraft((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    bullets: prev.bullets.filter(
                                      (_, i) => i !== bIdx
                                    ),
                                  }
                                : null
                            )
                          }
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Key Features */}
              {pendingAiDraft.features.length > 0 && (
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
                  <label className="inline-flex items-center gap-2 text-sm font-extrabold text-slate-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pendingAiDraft.applyFeatures}
                      onChange={(e) =>
                        setPendingAiDraft((prev) =>
                          prev
                            ? { ...prev, applyFeatures: e.target.checked }
                            : null
                        )
                      }
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    Key Feature Highlights ({pendingAiDraft.features.length})
                  </label>
                  <div className="space-y-2">
                    {pendingAiDraft.features.map((fText, fIdx) => (
                      <div key={fIdx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={fText}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPendingAiDraft((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    features: prev.features.map((x, i) =>
                                      i === fIdx ? val : x
                                    ),
                                  }
                                : null
                            );
                          }}
                          className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setPendingAiDraft((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    features: prev.features.filter(
                                      (_, i) => i !== fIdx
                                    ),
                                  }
                                : null
                            )
                          }
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Dimensions & Specifications */}
              {pendingAiDraft.specs.length > 0 && (
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
                  <label className="inline-flex items-center gap-2 text-sm font-extrabold text-slate-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pendingAiDraft.applySpecs}
                      onChange={(e) =>
                        setPendingAiDraft((prev) =>
                          prev
                            ? { ...prev, applySpecs: e.target.checked }
                            : null
                        )
                      }
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    Dimensions &amp; Specifications ({pendingAiDraft.specs.length})
                  </label>
                  <div className="space-y-2">
                    {pendingAiDraft.specs.map((sp, spIdx) => (
                      <div key={spIdx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={sp.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPendingAiDraft((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    specs: prev.specs.map((x, i) =>
                                      i === spIdx ? { ...x, name: val } : x
                                    ),
                                  }
                                : null
                            );
                          }}
                          className="w-1/3 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                        />
                        <input
                          type="text"
                          value={sp.value}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPendingAiDraft((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    specs: prev.specs.map((x, i) =>
                                      i === spIdx ? { ...x, value: val } : x
                                    ),
                                  }
                                : null
                            );
                          }}
                          className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                        />
                        <span className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-slate-200 text-slate-600">
                          {sp.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Important Care Note */}
              {pendingAiDraft.importantNoteHtml && (
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2">
                  <label className="inline-flex items-center gap-2 text-sm font-extrabold text-slate-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pendingAiDraft.applyImportantNote}
                      onChange={(e) =>
                        setPendingAiDraft((prev) =>
                          prev
                            ? { ...prev, applyImportantNote: e.target.checked }
                            : null
                        )
                      }
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    Important Care Note
                  </label>
                  <div
                    className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 prose prose-xs max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: pendingAiDraft.importantNoteHtml,
                    }}
                  />
                </div>
              )}

              {/* 5. Suggested Use Cases & Industries */}
              {(pendingAiDraft.matchedProblemIds.length > 0 ||
                pendingAiDraft.matchedIndustryIds.length > 0 ||
                pendingAiDraft.suggestedNewUseCases ||
                pendingAiDraft.suggestedNewIndustries) && (
                <div className="p-4 rounded-2xl border border-indigo-200 bg-indigo-50/40 space-y-2">
                  <label className="inline-flex items-center gap-2 text-sm font-extrabold text-slate-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pendingAiDraft.applyTags}
                      onChange={(e) =>
                        setPendingAiDraft((prev) =>
                          prev
                            ? { ...prev, applyTags: e.target.checked }
                            : null
                        )
                      }
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    Suggested Multi-Select Use Cases &amp; Industries
                  </label>
                  {pendingAiDraft.suggestedNewUseCases && (
                    <div>
                      <span className="block text-[11px] font-bold text-slate-600 mb-1">
                        New Use Cases to Add:
                      </span>
                      <input
                        type="text"
                        value={pendingAiDraft.suggestedNewUseCases}
                        onChange={(e) =>
                          setPendingAiDraft((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  suggestedNewUseCases: e.target.value,
                                }
                              : null
                          )
                        }
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
                      />
                    </div>
                  )}
                  {pendingAiDraft.suggestedNewIndustries && (
                    <div>
                      <span className="block text-[11px] font-bold text-slate-600 mb-1">
                        New Industries to Add:
                      </span>
                      <input
                        type="text"
                        value={pendingAiDraft.suggestedNewIndustries}
                        onChange={(e) =>
                          setPendingAiDraft((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  suggestedNewIndustries: e.target.value,
                                }
                              : null
                          )
                        }
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingAiDraft(null)}
                className="px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100"
              >
                Discard (Change Nothing)
              </button>
              <button
                type="button"
                onClick={handleConfirmApplyAiDraft}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-sm"
              >
                <Check size={15} />
                Confirm &amp; Apply Approved Fields to Form
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
