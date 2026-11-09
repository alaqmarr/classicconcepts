"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { MultiImageUploader } from "@/components/admin/MultiImageUploader";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { isNextRedirectError } from "@/lib/is-redirect";

interface Category {
  id: string;
  name: string;
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

  const [features, setFeatures] = useState(
    product?.features?.length
      ? product.features.map((f: any, i: number) => ({
          id: f.id || `f_${i}`,
          text: f.text || "",
        }))
      : [{ id: "f_init", text: "" }]
  );

  const [specs, setSpecs] = useState(
    product?.specifications?.length
      ? product.specifications.map((s: any, i: number) => ({
          id: s.id || `s_${i}`,
          name: s.name || "",
          value: s.value || "",
          type: s.type || "specification",
        }))
      : [{ id: "s_init", name: "", value: "", type: "specification" }]
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
        const msg = err?.message || "Failed to save product. Please check your connection and try again.";
        console.error("ProductForm submit error:", err);
        setFormError(msg);
        toast.error(msg);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8" aria-busy={isPending}>
      {(isPodiumForm || product?.isPodium !== undefined) && (
        <input
          type="hidden"
          name="isPodium"
          value={String(Boolean(isPodiumForm || product?.isPodium))}
        />
      )}

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
              defaultValue={product?.name}
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white text-sm"
              placeholder="e.g. Acrylic Podium CCP053"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Category *
            </label>
            <select
              name="categoryId"
              defaultValue={product?.categoryId || ""}
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
              SKU (Optional — must be unique if set)
            </label>
            <input
              type="text"
              name="sku"
              defaultValue={product?.sku || ""}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white text-sm"
              placeholder="e.g. CCP053"
            />
          </div>

          {showPodiumSubCategory && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Podium Sub-Category (Optional)
                </label>
                <select
                  name="podiumSubCategoryId"
                  defaultValue={product?.podiumSubCategoryId || ""}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white text-sm appearance-none"
                >
                  <option value="">— No Sub-Category —</option>
                  {podiumSubCategories.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Or Create New Podium Sub-Category
                </label>
                <input
                  type="text"
                  name="newPodiumSubCategory"
                  placeholder="Type new sub-category name to auto-create & assign"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white text-sm"
                />
              </div>
            </>
          )}

          {problemStatements.length > 0 && (
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Problem Statements (Optional)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {problemStatements.map((ps) => {
                  const isSelected = product?.problemStatements?.some(
                    (p: any) => p.id === ps.id
                  );
                  return (
                    <label
                      key={ps.id}
                      className="flex items-center gap-2 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        name="problemStatements[]"
                        value={ps.id}
                        defaultChecked={isSelected}
                        className="rounded text-[#0056b3] focus:ring-[#0056b3]"
                      />
                      <span className="text-sm text-slate-700">{ps.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {industries.length > 0 && (
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Industries (Optional)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {industries.map((ind) => {
                  const isSelected = product?.industries?.some(
                    (i: any) => i.id === ind.id
                  );
                  return (
                    <label
                      key={ind.id}
                      className="flex items-center gap-2 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        name="industries[]"
                        value={ind.id}
                        defaultChecked={isSelected}
                        className="rounded text-[#0056b3] focus:ring-[#0056b3]"
                      />
                      <span className="text-sm text-slate-700">{ind.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6 space-y-6">
        <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">
          Pricing & Status
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

      <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6 space-y-6">
        <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">
          Media & Descriptions
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
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            YouTube Video URL or ID
          </label>
          <input
            type="text"
            name="videoUrl"
            defaultValue={product?.videoUrl || ""}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white text-sm"
            placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Short Description (Summary)
          </label>
          <textarea
            name="description"
            defaultValue={product?.description || ""}
            rows={3}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Full HTML Description (Description Tab)
          </label>
          <RichTextEditor
            name="descriptionHtml"
            defaultValue={product?.descriptionHtml || ""}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Important Note HTML (Important Note Tab)
          </label>
          <RichTextEditor
            name="importantNoteHtml"
            defaultValue={product?.importantNoteHtml || ""}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h2 className="text-lg font-bold text-slate-800">Bullet Features</h2>
          <button
            type="button"
            onClick={() => setFeatures([...features, { id: allocKey(), text: "" }])}
            className="text-xs font-bold text-[#0056b3] flex items-center gap-1 hover:underline"
          >
            <Plus size={14} /> Add Feature
          </button>
        </div>
        {features.map((f: any, index: number) => (
          <div key={f.id} className="flex items-center gap-3">
            <input
              type="text"
              name="featureText[]"
              defaultValue={f.text}
              className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              placeholder="e.g. EMI options are available."
            />
            <button
              type="button"
              onClick={() => setFeatures(features.filter((_: any, i: number) => i !== index))}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h2 className="text-lg font-bold text-slate-800">Specifications & Dimensions</h2>
          <button
            type="button"
            onClick={() =>
              setSpecs([
                ...specs,
                { id: allocKey(), name: "", value: "", type: "specification" },
              ])
            }
            className="text-xs font-bold text-[#0056b3] flex items-center gap-1 hover:underline"
          >
            <Plus size={14} /> Add Spec
          </button>
        </div>
        {specs.map((s: any, index: number) => (
          <div key={s.id} className="flex items-center gap-3">
            <input
              type="text"
              name="specName[]"
              defaultValue={s.name}
              className="w-1/3 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              placeholder="e.g. Height"
            />
            <input
              type="text"
              name="specValue[]"
              defaultValue={s.value}
              className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              placeholder="e.g. 40 to 42 inches"
            />
            <select
              name="specType[]"
              defaultValue={s.type}
              className="w-1/4 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
            >
              <option value="specification">Specification</option>
              <option value="dimension">Dimension</option>
            </select>
            <button
              type="button"
              onClick={() => setSpecs(specs.filter((_: any, i: number) => i !== index))}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
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
    </form>
  );
}
