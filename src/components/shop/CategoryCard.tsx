import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { EditableText } from "@/components/inline-edit/EditableText";
import { EditableImage } from "@/components/inline-edit/EditableImage";

interface CategoryCardProps {
  category: {
    id?: string;
    name: string;
    slug: string;
    imageUrl: string | null;
    bgClass: string | null;
    description?: string | null;
  };
}

export function CategoryCard({ category }: CategoryCardProps) {
  const bgClass = category.bgClass || "bg-slate-100";

  const letterFallback = (
    <div className="w-24 h-24 bg-white/40 backdrop-blur-sm rounded-xl border border-white/60 shadow-sm group-hover:scale-110 transition-transform duration-500 flex items-center justify-center">
      <span className="text-3xl font-extrabold text-slate-400">
        {category.name.charAt(0)}
      </span>
    </div>
  );

  return (
    <Link href={`/shop/c/${category.slug}`} className="group block">
      <div className="relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 flex flex-col h-72 cursor-pointer transform hover:-translate-y-1">
        {/* Image / Background Area */}
        <div
          className={`w-full h-52 ${bgClass} flex items-center justify-center relative overflow-hidden`}
        >
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300 z-10 pointer-events-none" />

          {category.id ? (
            <EditableImage
              entity={{
                model: "category",
                id: category.id,
                field: "imageUrl",
              }}
              src={category.imageUrl}
              alt={category.name}
              label={`Category Image: ${category.name}`}
              aspectRatio={4 / 3}
              wrapperClassName="relative w-full h-full flex items-center justify-center"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              emptyPlaceholder={letterFallback}
            />
          ) : category.imageUrl ? (
            <Image
              src={category.imageUrl}
              alt={category.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            letterFallback
          )}
        </div>

        {/* Card Footer */}
        <div className="flex-1 flex items-center justify-between gap-3 px-5 py-3.5 bg-gradient-to-b from-white via-slate-50/50 to-white z-20 border-t border-slate-50 relative">
          <div className="min-w-0 flex-1">
            {category.id ? (
              <EditableText
                as="h3"
                entity={{ model: "category", id: category.id, field: "name" }}
                value={category.name}
                label="Category Name"
                className="font-bold text-[#0056b3] group-hover:text-slate-900 transition-colors truncate block"
              />
            ) : (
              <h3 className="font-bold text-[#0056b3] group-hover:text-slate-900 transition-colors truncate">
                {category.name}
              </h3>
            )}
            {category.description && (
              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                {category.description}
              </p>
            )}
          </div>
          <ArrowRight
            size={18}
            className="text-[#0056b3] shrink-0 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"
          />
        </div>
      </div>
    </Link>
  );
}
