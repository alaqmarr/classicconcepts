import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendAdminOrderNotification, sendClientOrderThankYou } from "@/lib/email";
import { pushWebsiteOrderToWhatsAppHub } from "@/lib/whatsapp-bridge";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
    const address = typeof body?.address === "string" ? body.address.trim() || null : null;
    const city = typeof body?.city === "string" ? body.city.trim() || null : null;
    const state = typeof body?.state === "string" ? body.state.trim() || null : null;
    const pincode = typeof body?.pincode === "string" ? body.pincode.trim() || null : null;
    const message = typeof body?.message === "string" ? body.message.trim() || null : null;
    const rawItems = Array.isArray(body?.cartItems) ? body.cartItems : [];

    if (!name || !email || !phone || rawItems.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const sanitizedItems = rawItems
      .slice(0, 100)
      .map((item: any) => {
        const quantity = Math.max(
          1,
          Math.min(9999, Math.floor(Number(item?.quantity) || 1))
        );
        const rawPrice = Number(item?.price);
        const price =
          item?.price !== null &&
          item?.price !== undefined &&
          Number.isFinite(rawPrice) &&
          rawPrice >= 0
            ? rawPrice
            : null;

        return {
          productId: String(item?.id || "unknown").slice(0, 120),
          productName: String(item?.name || "Acrylic Product").trim().slice(0, 300),
          productSlug: String(item?.slug || "").trim().slice(0, 200),
          productImage: item?.image ? String(item.image).trim().slice(0, 500) : null,
          price,
          quantity,
        };
      })
      .filter((i: any) => Boolean(i.productName));

    if (sanitizedItems.length === 0) {
      return NextResponse.json({ error: "No valid cart items" }, { status: 400 });
    }

    const cartTotal = sanitizedItems.reduce(
      (total: number, item: any) => total + (item.price || 0) * item.quantity,
      0
    );

    const order = await prisma.cartOrder.create({
      data: {
        name,
        email,
        phone,
        address,
        city,
        state,
        pincode,
        message,
        total: cartTotal,
        items: {
          create: sanitizedItems,
        },
      },
    });

    const emailItems = sanitizedItems.map((item: any) => ({
      productName: item.productName,
      productImage: item.productImage || undefined,
      productSlug: item.productSlug,
      quantity: item.quantity,
      price: item.price ?? undefined,
    }));

    const displayOrderId = `CC-${order.id.slice(-6).toUpperCase()}`;
    const itemsSummary = sanitizedItems
      .map((i: any) => `${i.quantity}x ${i.productName}`)
      .join(", ");

    // Send Emails + sync Order ID to WhatsApp Hub (:3007) for instant order tracking
    Promise.all([
      sendAdminOrderNotification({
        name,
        email,
        phone,
        address: address || undefined,
        city: city || undefined,
        state: state || undefined,
        pincode: pincode || undefined,
        message: message || undefined,
        items: emailItems,
      }),
      sendClientOrderThankYou({ name, email, items: emailItems }),
      pushWebsiteOrderToWhatsAppHub({
        orderId: order.id,
        displayOrderId,
        name,
        email,
        phone,
        itemsSummary,
        totalAmountInr: cartTotal,
        status: order.status,
        city,
        state,
      }),
    ]).catch((err) => {
      console.error("Email / WhatsApp order sync failed:", err);
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      displayOrderId,
      trackingUrl: `https://track.ccapl.cc/${displayOrderId}`,
    });
  } catch (error) {
    console.error("Checkout processing error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
