export const revalidate = 60;
import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FloatingWhatsApp } from "@/components/layout/FloatingWhatsApp";
import { prisma } from "@/lib/db";
import { CartProvider } from "@/context/CartContext";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://classicconcepts.in"),
  title: {
    default: "Classic Concepts | Superior Acrylic Craftsmanship & Podium Manufacturer",
    template: "%s | Classic Concepts",
  },
  description:
    "With over two decades of experience, Classic Concepts is a market leader in acrylic manufacturing. Our 16,000 sq. ft. factory designs and crafts premium acrylic podiums, lecterns, displays, and custom acrylic products in India.",
  keywords: [
    "Classic Concepts",
    "Acrylic Podium",
    "Acrylic Podium Manufacturer India",
    "Acrylic Lectern",
    "Digital Podium",
    "Motorized Podium",
    "Acrylic Products",
    "Custom Acrylic Fabrication",
    "Acrylic Trophy",
    "Acrylic Display Stand",
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/short-logo.png",
    apple: "/short-logo.png",
  },
  openGraph: {
    title: "Classic Concepts | Superior Acrylic Craftsmanship",
    description:
      "Market leader in acrylic manufacturing with a 16,000 sq. ft. factory crafting podiums and custom acrylic products.",
    url: "https://classicconcepts.in",
    siteName: "Classic Concepts",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "Classic Concepts Logo",
      }
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Classic Concepts | Acrylic Podiums & Products",
    description: "Superior Acrylic Craftsmanship in India.",
    images: ["/logo.png"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await prisma.siteSetting.findUnique({ where: { id: "default" } });
  const usefulLinks = await prisma.usefulLink.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' }
  });
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' }
  });
  const podiumSubCategories = await prisma.podiumSubCategory.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
  });

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Classic Concepts",
    url: "https://classicconcepts.in",
    logo: "https://classicconcepts.in/logo.png",
    description:
      "With over two decades of experience, Classic Concepts is a market leader in acrylic manufacturing with a 16,000 sq. ft. factory in India.",
    contactPoint: {
      "@type": "ContactPoint",
      telephone: settings?.phone1 || "+917337222876",
      contactType: "sales",
      email: settings?.email || "sales@classicconcepts.in",
      areaServed: "IN",
      availableLanguage: ["English", "Hindi"],
    },
  };

  return (
    <html
      lang="en"
      className={`${jakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <CartProvider>
          <Header
            settings={settings}
            usefulLinks={usefulLinks}
            categories={categories}
            podiumSubCategories={podiumSubCategories}
          />
          <main className="flex-1">
            {children}
          </main>
          <Footer settings={settings} categories={categories} usefulLinks={usefulLinks} />
          <FloatingWhatsApp phoneNumber={settings?.whatsappNumber || "+917337222876"} />
          <Toaster position="top-right" />
        </CartProvider>
      </body>
    </html>
  );
}
