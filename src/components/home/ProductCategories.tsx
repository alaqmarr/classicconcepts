import Link from "next/link";
import { getFullCatalogIndex } from "@/lib/public-data";
import { ArrowRight } from "lucide-react";
import {
  getSiteContentMap,
  getContentValue,
  hasContentOverride,
} from "@/lib/site-content";
import { EditableText } from "@/components/inline-edit/EditableText";
import { EditableImage } from "@/components/inline-edit/EditableImage";

export async function ProductCategories() {
  const [catalog, content] = await Promise.all([
    getFullCatalogIndex(),
    getSiteContentMap(),
  ]);
  const categories = catalog.categories;

  if (!categories || categories.length === 0) return null;

  return (
    <section className="relative py-20 overflow-hidden bg-gradient-to-b from-white via-slate-50/50 to-white">
      {/* Subtle Radial Gradient Pattern */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,rgba(227,24,55,0.04)_0%,rgba(255,223,0,0.03)_40%,rgba(59,130,246,0.03)_70%,transparent_100%)] pointer-events-none"></div>

      <div className="container mx-auto px-4 md:px-8 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div>
            <EditableText
              as="span"
              contentKey="home.categories.badge"
              value={getContentValue(
                content,
                "home.categories.badge",
                "Our Products"
              )}
              hasCustomValue={hasContentOverride(content, "home.categories.badge")}
              label="Categories Section Eyebrow"
              className="text-[#3b82f6] text-[10px] font-bold uppercase tracking-widest mb-2 block"
            />
            <EditableText
              as="h2"
              contentKey="home.categories.heading"
              value={getContentValue(
                content,
                "home.categories.heading",
                "Explore Our Categories"
              )}
              hasCustomValue={hasContentOverride(
                content,
                "home.categories.heading"
              )}
              label="Categories Section Heading"
              className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight block"
            >
              Explore Our{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-red-500">
                Categories
              </span>
            </EditableText>
          </div>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 text-[#3b82f6] font-bold text-sm hover:text-blue-800 transition-colors group"
          >
            <EditableText
              contentKey="home.categories.cta"
              value={getContentValue(
                content,
                "home.categories.cta",
                "View All Products"
              )}
              hasCustomValue={hasContentOverride(content, "home.categories.cta")}
              label="Categories CTA Button Text"
            />
            <ArrowRight
              size={16}
              className="transform group-hover:translate-x-1 transition-transform"
            />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6 md:gap-8">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/shop?category=${category.slug}`}
              className="group flex flex-col bg-white rounded-[1.5rem] overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300"
            >
              {/* Image Section */}
              <div className="relative w-full h-64 bg-slate-100 overflow-hidden">
                <EditableImage
                  entity={{
                    model: "category",
                    id: category.id,
                    field: "imageUrl",
                  }}
                  src={category.imageUrl || "/placeholder-image.jpg"}
                  alt={category.name}
                  label={`Category Image: ${category.name}`}
                  aspectRatio={4 / 3}
                  wrapperClassName="relative w-full h-full"
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 ease-in-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>

              {/* Title Bar */}
              <div className="bg-[#f8f9fa] py-5 px-6 flex justify-between items-center group-hover:bg-blue-50 transition-colors duration-300">
                <EditableText
                  as="h3"
                  entity={{
                    model: "category",
                    id: category.id,
                    field: "name",
                  }}
                  value={category.name}
                  label={`Category Name — ${category.name}`}
                  className="text-[15px] font-bold text-slate-800 group-hover:text-[#0056b3] transition-colors"
                />
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-red-500 group-hover:bg-[#3b82f6] group-hover:text-white shadow-sm transition-all duration-300">
                  <ArrowRight size={14} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
