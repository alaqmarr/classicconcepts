export const dynamic = "force-dynamic";

import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [
    session,
    newEnquiries,
    totalEnquiries,
    pendingOrders,
    products,
    podiums,
    categories,
    settings,
  ] = await Promise.all([
    getServerSession(authOptions),
    prisma.enquiry.count({ where: { status: "New" } }),
    prisma.enquiry.count(),
    prisma.cartOrder.count({
      where: { status: { in: ["Pending", "Processing"] } },
    }),
    prisma.product.count({ where: { isPodium: false } }),
    prisma.product.count({ where: { isPodium: true } }),
    prisma.category.count(),
    prisma.siteSetting.findUnique({
      where: { id: "default" },
      select: { aiEnabled: true },
    }),
  ]);

  return (
    <AdminShell
      counts={{
        newEnquiries,
        totalEnquiries,
        pendingOrders,
        products,
        podiums,
        categories,
        aiEnabled: settings?.aiEnabled ?? true,
        adminName: session?.user?.name || null,
        adminEmail: session?.user?.email || null,
      }}
    >
      {children}
    </AdminShell>
  );
}
