import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendAdminOrderNotification, sendClientOrderThankYou } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { name, email, phone, message, cartItems } = await req.json();

    if (!name || !email || !phone || !cartItems || cartItems.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const cartTotal = cartItems.reduce((total: number, item: any) => total + ((item.price || 0) * item.quantity), 0);

    // Save to Database
    const order = await prisma.cartOrder.create({
      data: {
        name,
        email,
        phone,
        message,
        total: cartTotal,
        items: {
          create: cartItems.map((item: any) => ({
            productId: item.id,
            productName: item.name,
            productSlug: item.slug,
            productImage: item.image,
            price: item.price,
            quantity: item.quantity,
          }))
        }
      }
    });

    const emailItems = cartItems.map((item: any) => ({
      productName: item.name,
      productImage: item.image,
      productSlug: item.slug,
      quantity: item.quantity,
      price: item.price
    }));

    // Send Emails asynchronously
    Promise.all([
      sendAdminOrderNotification({ name, email, phone, message, items: emailItems }),
      sendClientOrderThankYou({ name, email, items: emailItems })
    ]).catch(err => {
      console.error('Email sending failed for order:', err);
    });

    return NextResponse.json({ success: true, orderId: order.id });
  } catch (error) {
    console.error("Checkout processing error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
