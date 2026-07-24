export const dynamic = 'force-dynamic';
import { DeleteForm } from "@/components/admin/DeleteForm";
import { SubmitForm } from "@/components/admin/SubmitForm";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Image as ImageIcon, Trash2, Plus, ArrowUp, ArrowDown } from "lucide-react";
import { ImageUploader } from "@/components/admin/ImageUploader";

export default async function AdminGalleryPage() {
  const images = await prisma.galleryImage.findMany({
    orderBy: { sortOrder: "asc" }
  });

  async function addImage(formData: FormData) {
    "use server";
    const url = formData.get("url") as string;
    const altText = formData.get("altText") as string;

    if (!url) return;

    // Get max sort order
    const maxSort = await prisma.galleryImage.aggregate({
      _max: { sortOrder: true }
    });
    const nextSort = (maxSort._max.sortOrder || 0) + 1;

    await prisma.galleryImage.create({
      data: {
        url,
        altText: altText || null,
        sortOrder: nextSort
      }
    });

    revalidatePath("/admin/gallery");
    revalidatePath("/");
  }

  async function deleteImage(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    if (!id) return;
    await prisma.galleryImage.delete({ where: { id } });
    revalidatePath("/admin/gallery");
    revalidatePath("/");
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
          <ImageIcon size={32} className="text-[#0056b3]" />
          Gallery
        </h1>
        <p className="text-slate-500 font-medium mt-2">Manage the image gallery shown on your homepage.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Add Image Form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6 sticky top-24">
            <h3 className="text-lg font-extrabold text-slate-800 mb-4 flex items-center gap-2">
              <Plus size={20} className="text-[#0056b3]" /> Add Image
            </h3>
            
            <SubmitForm action={addImage} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Upload Image</label>
                <ImageUploader name="url" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Alt Text (Optional)</label>
                <input type="text" name="altText" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:bg-white transition-all text-sm" placeholder="e.g. Modern living room design" />
              </div>
              
              <button type="submit" className="w-full py-3 bg-[#0056b3] text-white font-bold rounded-xl hover:bg-blue-800 transition-colors mt-2">
                Add to Gallery
              </button>
            </SubmitForm>
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="lg:col-span-2">
          {images.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-12 text-center">
              <ImageIcon size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 font-medium">Your gallery is empty. Add some images to showcase your work.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {images.map((img) => (
                <div key={img.id} className="group relative bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden">
                  <div className="aspect-[4/3] bg-slate-100 relative">
                    <img src={img.url} alt={img.altText || "Gallery Image"} className="w-full h-full object-cover" />
                    
                    {/* Hover Overlay with Delete */}
                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                      <DeleteForm action={deleteImage}>
                        <input type="hidden" name="id" value={img.id} />
                        <button type="submit" className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-xl transition-all shadow-lg hover:scale-110 flex items-center gap-2 font-bold text-sm">
                          <Trash2 size={18} /> Remove
                        </button>
                      </DeleteForm>
                    </div>
                  </div>
                  {img.altText && (
                    <div className="p-3 bg-white border-t border-slate-100">
                      <p className="text-xs font-semibold text-slate-600 truncate">{img.altText}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

