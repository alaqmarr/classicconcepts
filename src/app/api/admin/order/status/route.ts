import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const VALID_ORDER_STATUSES = new Set([
  "Pending",
  "New",
  "Processing",
  "Completed",
  "Cancelled",
]);

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId, status } = await req.json();

    if (!orderId || !status || !VALID_ORDER_STATUSES.has(status)) {
      return NextResponse.json({ error: "Invalid order ID or status" }, { status: 400 });
    }

    const updatedOrder = await prisma.cartOrder.update({
      where: { id: orderId },
      data: { status },
      include: { items: true },
    });

    const { pushWebsiteOrderToWhatsAppHub } = await import("@/lib/whatsapp-bridge");
    void pushWebsiteOrderToWhatsAppHub({
      orderId: updatedOrder.id,
      displayOrderId: `CC-${updatedOrder.id.slice(-6).toUpperCase()}`,
      name: updatedOrder.name,
      email: updatedOrder.email,
      phone: updatedOrder.phone,
      itemsSummary:
        updatedOrder.items
          .map((it) => `${it.quantity}x ${it.productName}`)
          .join(", ") || "Website Order",
      totalAmountInr: updatedOrder.total || 0,
      status: updatedOrder.status,
      city: updatedOrder.city,
      state: updatedOrder.state,
    });

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin");

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Update order status error:", error);
    return NextResponse.json(
      { error: "Failed to update order status" },
      { status: 500 }
    );
  }
}
