"use client";

import { useState } from "react";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { RichTextEditor } from "@/components/admin/RichTextEditor";

interface Category {
  id: string;
  name: string;
}

interface ProductFormProps {
  categories: Category[];
  action: (formData: FormData) => Promise<void>;
  product?: any;
}

export function ProductForm({ categories, action, product }: ProductFormProps) {
  const [features, setFeatures] = useState(
    product?.features?.length ? product.features : [{ id: 1, text: "" }]
  );
  
  const [specs, setSpecs] = useState(
    product?.specifications?.length ? product.specifications : [{ id: 1, name: "", value: "", type: "specification" }]
  );
  
  const [variants, setVariants] = useState(
    product?.variants?.length ? product.variants : [{ id: 1, name: "", price: "", imageUrl: "" }]
  );

  const mainImage = product?.images?.find((i: any) => i.isMain)?.url || "";

  return (
    <form action={action} className="space-y-8">
      <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6 space-y-6">
        <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">Basic Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Product Name</label>
            <input type="text" name="name" defaultValue={product?.name} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white text-sm" placeholder="e.g. Acrylic Podium CCP053" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Category</label>
            <select name="categoryId" defaultValue={product?.categoryId} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white text-sm appearance-none">
              <option value="">Select a category</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">SKU</label>
            <input type="text" name="sku" defaultValue={product?.sku || ""} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white text-sm" placeholder="e.g. CCP053" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6 space-y-6">
        <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">Pricing & Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Base Price (₹)</label>
            <input type="number" step="0.01" name="basePrice" defaultValue={product?.basePrice || ""} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white text-sm" placeholder="42000" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Discount Price (₹)</label>
            <input type="number" step="0.01" name="discountPrice" defaultValue={product?.discountPrice || ""} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white text-sm" placeholder="23100" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Stock Status</label>
            <input type="text" name="stockStatus" defaultValue={product?.stockStatus || "In stock"} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Discount Badge Text</label>
          <input type="text" name="discountBadge" defaultValue={product?.discountBadge || ""} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white text-sm" placeholder="e.g. Up to 45% discount." />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6 space-y-6">
        <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">Media & Descriptions</h2>
        <div>
           <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Main Image</label>
           <ImageUploader name="mainImage" defaultValue={mainImage} />
        </div>
        <div>
           <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">YouTube Video URL</label>
           <input type="url" name="videoUrl" defaultValue={product?.videoUrl || ""} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white text-sm" placeholder="https://youtube.com/watch?v=..." />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Short Description (Summary)</label>
          <textarea name="description" defaultValue={product?.description || ""} rows={3} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white text-sm"></textarea>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Full HTML Description (Description Tab)</label>
          <RichTextEditor name="descriptionHtml" defaultValue={product?.descriptionHtml || ""} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Important Note HTML (Important Note Tab)</label>
          <RichTextEditor name="importantNoteHtml" defaultValue={product?.importantNoteHtml || ""} />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h2 className="text-lg font-bold text-slate-800">Bullet Features</h2>
          <button type="button" onClick={() => setFeatures([...features, { id: Date.now(), text: "" }])} className="text-xs font-bold text-[#0056b3] flex items-center gap-1 hover:underline">
            <Plus size={14} /> Add Feature
          </button>
        </div>
        {features.map((f: any, index: number) => (
          <div key={f.id} className="flex items-center gap-3">
            <input type="text" name="featureText[]" defaultValue={f.text} className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="e.g. EMI options are available." />
            <button type="button" onClick={() => setFeatures(features.filter((_: any, i: number) => i !== index))} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h2 className="text-lg font-bold text-slate-800">Specifications & Dimensions</h2>
          <button type="button" onClick={() => setSpecs([...specs, { id: Date.now(), name: "", value: "", type: "specification" }])} className="text-xs font-bold text-[#0056b3] flex items-center gap-1 hover:underline">
            <Plus size={14} /> Add Spec
          </button>
        </div>
        {specs.map((s: any, index: number) => (
          <div key={s.id} className="flex items-center gap-3">
            <input type="text" name="specName[]" defaultValue={s.name} className="w-1/3 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="e.g. Height" />
            <input type="text" name="specValue[]" defaultValue={s.value} className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="e.g. 40 to 42 inches" />
            <select name="specType[]" defaultValue={s.type} className="w-1/4 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm">
              <option value="specification">Specification</option>
              <option value="dimension">Dimension</option>
            </select>
            <button type="button" onClick={() => setSpecs(specs.filter((_: any, i: number) => i !== index))} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h2 className="text-lg font-bold text-slate-800">Product Variants</h2>
          <button type="button" onClick={() => setVariants([...variants, { id: Date.now(), name: "", price: "" }])} className="text-xs font-bold text-[#0056b3] flex items-center gap-1 hover:underline">
            <Plus size={14} /> Add Variant
          </button>
        </div>
        {variants.map((v: any, index: number) => (
          <div key={v.id} className="flex flex-col gap-3 p-4 border border-slate-100 rounded-xl bg-slate-50 relative">
            <button type="button" onClick={() => setVariants(variants.filter((_: any, i: number) => i !== index))} className="absolute top-4 right-4 text-red-500 hover:text-red-700">
              <Trash2 size={18} />
            </button>
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Variant Name</label>
                  <input type="text" name="variantName[]" defaultValue={v.name} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm" placeholder="e.g. BLACK FROSTED" />
               </div>
               <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Price Override (Optional)</label>
                  <input type="number" name="variantPrice[]" defaultValue={v.price} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm" placeholder="Leaves base price if empty" />
               </div>
            </div>
            <div>
               <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Variant Image</label>
               <ImageUploader name={`variantImage_${index}`} defaultValue={v.imageUrl || ""} />
            </div>
          </div>
        ))}
      </div>

      <button type="submit" className="w-full py-4 bg-[#0056b3] text-white font-bold rounded-xl hover:bg-blue-800 transition-colors text-lg shadow-soft">
        Save Product
      </button>
    </form>
  );
}
