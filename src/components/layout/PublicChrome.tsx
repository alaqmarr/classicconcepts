"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FloatingWhatsApp } from "@/components/layout/FloatingWhatsApp";
import { InlineEditProvider } from "@/components/inline-edit/InlineEditProvider";
import { CustomerConciergeModal } from "@/components/ai/CustomerConciergeModal";
import { GlobalSearchModal } from "@/components/ai/GlobalSearchModal";
import type { SiteContentMap } from "@/lib/site-content-shared";

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
  siteContent?: SiteContentMap;
}

export function PublicChrome({
  children,
  settings,
  usefulLinks,
  categories,
  podiumSubCategories,
  siteContent,
}: PublicChromeProps) {
  const pathname = usePathname() || "";
  const isAdminRoute = pathname.startsWith("/admin");

  if (isAdminRoute) {
    return <>{children}</>;
  }

  return (
    <InlineEditProvider
      initialSiteContent={siteContent}
      initialSiteSettings={settings}
    >
      <Header
        usefulLinks={usefulLinks}
        categories={categories}
        podiumSubCategories={podiumSubCategories}
        siteContent={siteContent}
      />
      <main className="flex-1">{children}</main>
      <Footer
        settings={settings}
        categories={categories}
        usefulLinks={usefulLinks}
        siteContent={siteContent}
      />
      <CustomerConciergeModal />
      <GlobalSearchModal />
      <FloatingWhatsApp
        phoneNumber={settings?.whatsappNumber || "+917337220568"}
      />
    </InlineEditProvider>
  );
}
