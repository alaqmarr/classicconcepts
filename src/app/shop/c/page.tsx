export const dynamic = "force-dynamic";
import { getFullCatalogIndex } from "@/lib/public-data";
import { PageHeader } from "@/components/layout/PageHeader";
import { CategoryCard } from "@/components/shop/CategoryCard";
import {
  getSiteContentMap,
  getContentValue,
  hasContentOverride,
} from "@/lib/site-content";
import { EditableText } from "@/components/inline-edit/EditableText";
import { FolderTree } from "lucide-react";

export const metadata = {
  title: "Shop Categories - Classic Concepts",
  description:
    "Browse our premium acrylic furniture and products by category.",
};

export default async function ShopCategoriesPage() {
  const [catalog, content] = await Promise.all([
    getFullCatalogIndex(),
    getSiteContentMap(),
  ]);
  const categories = catalog.categories.filter((c) => c._count.products > 0);

  return (
    <main className="min-h-screen bg-[#fafbfc] flex flex-col">
      <PageHeader
        contentKeyPrefix="shop.categories.banner"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Shop", href: "/shop" },
          { label: "Categories" },
        ]}
        title={
          <>
            Shop by{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
              Category
            </span>
          </>
        }
        description="Explore all Classic Concepts product categories engineered with precision cast acrylic."
      />

      <section className="py-20 container mx-auto px-6 relative z-20">
        <div className="flex items-center gap-3 mb-10 border-b border-slate-200 pb-4">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#0056b3]">
            <FolderTree size={20} />
          </div>
          <div>
            <EditableText
              as="h2"
              contentKey="shop.categories.heading"
              value={getContentValue(
                content,
                "shop.categories.heading",
                "All Categories"
              )}
              hasCustomValue={hasContentOverride(
                content,
                "shop.categories.heading"
              )}
              label="All Categories Heading"
              className="text-2xl font-bold text-slate-800 block"
            />
            <EditableText
              as="p"
              contentKey="shop.categories.subheading"
              value={getContentValue(
                content,
                "shop.categories.subheading",
                "Browse our extensive catalog structured for your convenience"
              )}
              hasCustomValue={hasContentOverride(
                content,
                "shop.categories.subheading"
              )}
              label="All Categories Subheading"
              className="text-slate-500 text-sm font-medium block"
            />
          </div>
        </div>

        {categories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-6">
            {categories.map((category) => (
              <div key={category.id} className="relative group">
                <CategoryCard category={category} />
                <div className="absolute top-4 left-4 z-20 bg-white/90 backdrop-blur text-[#0056b3] text-xs font-bold px-3 py-1 rounded-full shadow-sm pointer-events-none">
                  {category._count.products} Items
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              No categories found
            </h3>
            <p className="text-slate-500">
              Categories will appear here once they are added in the admin
              dashboard.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
