export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/layout/PageHeader";
import { getSiteContentMap } from "@/lib/site-content";
import { CartClient } from "./CartClient";

export const metadata = {
  title: "Your Cart & Request Checkout - Classic Concepts",
  description:
    "Review your selected acrylic podiums and products and submit an instant checkout enquiry.",
};

export default async function CartPage() {
  const content = await getSiteContentMap();

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#fff0f0] via-[#fffbf0] to-[#f0f4ff] flex flex-col">
      <PageHeader
        contentKeyPrefix="cart.banner"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Shop", href: "/shop" },
          { label: "Cart" },
        ]}
        title={
          <>
            Your{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
              Cart
            </span>
          </>
        }
        description="Review your selected items and submit your enquiry for rapid dispatch and custom branding quotes."
      />

      <CartClient content={content} />
    </main>
  );
}
