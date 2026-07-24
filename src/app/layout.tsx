import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { prisma } from "@/lib/db";
import { CartProvider } from "@/context/CartContext";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://classicconcepts.in"),
  title: "Classic Concepts | Superior Acrylic Craftsmanship",
  description: "Classic Concepts is a leading manufacturer of high-quality acrylic products in India. Discover our wide range of acrylic podiums, displays, interiors, and custom solutions.",
  icons: {
    icon: "/short-logo.png",
    apple: "/short-logo.png",
  },
  openGraph: {
    title: "Classic Concepts | Superior Acrylic Craftsmanship",
    description: "Classic Concepts is a leading manufacturer of high-quality acrylic products in India.",
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
    title: "Classic Concepts",
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

  return (
    <html
      lang="en"
      className={`${jakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground">
        <CartProvider>
          <Header settings={settings} usefulLinks={usefulLinks} />
          <main className="flex-1">
            {children}
          </main>
          <Footer settings={settings} />
          <Toaster position="top-right" />
        </CartProvider>
      </body>
    </html>
  );
}
