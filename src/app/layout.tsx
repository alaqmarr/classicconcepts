export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import { PublicChrome } from "@/components/layout/PublicChrome";
import { CustomAnalyticsInjector } from "@/components/layout/CustomAnalyticsInjector";
import { CartProvider } from "@/context/CartContext";
import { getPublicChromeData } from "@/lib/public-data";

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
    "Manufacturing in India Since 2008, Classic Concepts crafts acrylic podiums, lecterns, retail displays, trophies, and custom acrylic products at our 16,000 sq. ft. ISO 9001:2015 factory in Secunderabad.",
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
  const {
    settings,
    usefulLinks,
    categories,
    podiumSubCategories,
    siteContent,
  } = await getPublicChromeData();

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Classic Concepts",
    url: "https://classicconcepts.in",
    logo: "https://classicconcepts.in/logo.png",
    foundingDate: "2008",
    description:
      "Manufacturing in India Since 2008, Classic Concepts crafts acrylic podiums, lecterns, displays, and custom acrylic products at its 16,000 sq. ft. ISO 9001:2015 factory.",
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
      data-scroll-behavior="smooth"
      className={`${jakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c"),
          }}
        />
        <CustomAnalyticsInjector
          googleAnalyticsId={settings?.googleAnalyticsId}
          headScripts={settings?.headScripts}
          bodyScripts={settings?.bodyScripts}
        />
        <CartProvider>
          <PublicChrome
            settings={settings}
            usefulLinks={usefulLinks}
            categories={categories}
            podiumSubCategories={podiumSubCategories}
            siteContent={siteContent}
          >
            {children}
          </PublicChrome>
          <Toaster position="top-right" />
        </CartProvider>
      </body>
    </html>
  );
}
