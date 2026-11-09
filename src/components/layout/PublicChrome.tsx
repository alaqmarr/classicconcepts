"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FloatingWhatsApp } from "@/components/layout/FloatingWhatsApp";

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
}

interface PublicChromeProps {
  children: React.ReactNode;
  settings: any;
  usefulLinks: { id: string; title: string; url: string }[];
  categories: CategoryItem[];
  podiumSubCategories: CategoryItem[];
}

export function PublicChrome({
  children,
  settings,
  usefulLinks,
  categories,
  podiumSubCategories,
}: PublicChromeProps) {
  const pathname = usePathname() || "";
  const isAdminRoute = pathname.startsWith("/admin");

  if (isAdminRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <Header
        usefulLinks={usefulLinks}
        categories={categories}
        podiumSubCategories={podiumSubCategories}
      />
      <main className="flex-1">{children}</main>
      <Footer
        settings={settings}
        categories={categories}
        usefulLinks={usefulLinks}
      />
      <FloatingWhatsApp
        phoneNumber={settings?.whatsappNumber || "+917337222876"}
      />
    </>
  );
}
