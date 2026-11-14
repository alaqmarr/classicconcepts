import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTransporter } from "@/lib/email";
import { isAuthorizedInternalBridgeRequest } from "@/lib/whatsapp-bridge";

export const dynamic = "force-dynamic";

function stripAlnum(raw: string): string {
  return String(raw || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export async function GET(req: Request) {
  if (!isAuthorizedInternalBridgeRequest(req)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const action = (searchParams.get("action") || "health").trim();

  if (action === "health") {
    const [productsCount, ordersCount, enquiriesCount] = await Promise.all([
      prisma.product.count().catch(() => 0),
      prisma.cartOrder.count().catch(() => 0),
      prisma.enquiry.count().catch(() => 0),
    ]);
    return NextResponse.json({
      ok: true,
      app: "classicconcepts",
      brand: "CLASSIC_CONCEPTS",
      port: 3003,
      productsCount,
      ordersCount,
      enquiriesCount,
      timestamp: new Date().toISOString(),
    });
  }

  if (action === "orders") {
    const rawOrderId = (searchParams.get("orderId") || "").trim();
    const rawPhone = (searchParams.get("phone") || "").replace(/\D/g, "").slice(-10);
    const rawEmail = (searchParams.get("email") || "").trim().toLowerCase();

    const recentOrders = await prisma.cartOrder.findMany({
      orderBy: { createdAt: "desc" },
      take: 250,
      include: { items: true },
    });

    const targetAlnum = stripAlnum(rawOrderId);
    const matched = recentOrders.filter((o) => {
      if (rawOrderId) {
        const fullAlnum = stripAlnum(o.id);
        const short6 = o.id.slice(-6).toLowerCase();
        if (
          fullAlnum === targetAlnum ||
          short6 === targetAlnum ||
          `cc${short6}` === targetAlnum
        ) {
          return true;
        }
      }
      if (rawPhone && rawPhone.length >= 8) {
        const orderPhone10 = String(o.phone || "").replace(/\D/g, "").slice(-10);
        if (orderPhone10 && orderPhone10 === rawPhone) return true;
      }
      if (rawEmail && String(o.email || "").trim().toLowerCase() === rawEmail) {
        return true;
      }
      return false;
    });

    return NextResponse.json({
      ok: true,
      brand: "CLASSIC_CONCEPTS",
      orders: matched.slice(0, 15).map((o) => {
        const shortId = `CC-${o.id.slice(-6).toUpperCase()}`;
        const itemsSummary =
          o.items
            .map((it) => `${it.quantity}x ${it.productName}`)
            .join(", ") || "Acrylic Order";
        return {
          id: o.id,
          orderId: shortId,
          rawId: o.id,
          brand: "CLASSIC_CONCEPTS",
          brandLabel: "Classic Concepts",
          customerName: o.name,
          customerEmail: o.email,
          customerPhone: o.phone,
          city: o.city,
          state: o.state,
          itemsSummary,
          totalAmountInr: o.total || 0,
          status: o.status,
          shipmentStatus:
            o.status === "Completed"
              ? "DELIVERED"
              : o.status === "Processing"
              ? "IN_PRODUCTION"
              : "ORDER_CONFIRMED",
          createdAt: o.createdAt.toISOString(),
          updatedAt: o.updatedAt.toISOString(),
        };
      }),
    });
  }

  if (action === "enquiries") {
    const rawPhone = (searchParams.get("phone") || "").replace(/\D/g, "").slice(-10);
    const rawEmail = (searchParams.get("email") || "").trim().toLowerCase();
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 20)));

    const enquiries = await prisma.enquiry.findMany({
      orderBy: { createdAt: "desc" },
      take: 250,
    });

    const filtered = enquiries.filter((e) => {
      if (!rawPhone && !rawEmail) return true;
      if (rawPhone && rawPhone.length >= 8) {
        const p10 = String(e.phone || "").replace(/\D/g, "").slice(-10);
        if (p10 === rawPhone) return true;
      }
      if (rawEmail && String(e.email || "").trim().toLowerCase() === rawEmail) {
        return true;
      }
      return false;
    });

    return NextResponse.json({
      ok: true,
      brand: "CLASSIC_CONCEPTS",
      enquiries: filtered.slice(0, limit).map((e) => ({
        id: e.id,
        name: e.name,
        email: e.email,
        phone: e.phone,
        message: e.message,
        source: e.source,
        status: e.status,
        createdAt: e.createdAt.toISOString(),
      })),
    });
  }

  return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
}

export async function POST(req: Request) {
  if (!isAuthorizedInternalBridgeRequest(req)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action || "");

  if (action === "mark_enquiry_replied" && body?.enquiryId) {
    await prisma.enquiry
      .update({
        where: { id: String(body.enquiryId) },
        data: { status: "Replied" },
      })
      .catch(() => null);
    return NextResponse.json({ ok: true });
  }

  // Allows ccwhatsapp (:3007) on the same server to dispatch emails through Classic Concepts' configured SMTP if ccwhatsapp .env SMTP is empty
  if (action === "send_smtp_mail") {
    const to = String(body?.to || "").trim();
    const subject = String(body?.subject || "").trim();
    const html = String(body?.html || "").trim();
    const text = String(body?.text || "").trim();
    const replyTo = body?.replyTo ? String(body.replyTo).trim() : undefined;

    if (!to || !subject || (!html && !text)) {
      return NextResponse.json(
        { ok: false, error: "Missing email fields" },
        { status: 400 }
      );
    }

    try {
      const { transporter, settings } = await getTransporter();
      const fromAddr = settings.smtpUser || settings.email || "noreply@classicconcepts.in";
      await transporter.sendMail({
        from: `"Classic Concepts WhatsApp Desk" <${fromAddr}>`,
        to,
        subject,
        ...(replyTo ? { replyTo } : {}),
        ...(html ? { html } : {}),
        ...(text ? { text } : {}),
      });
      return NextResponse.json({ ok: true, deliveredVia: "classicconcepts_smtp" });
    } catch (err: any) {
      return NextResponse.json(
        { ok: false, error: err?.message || "SMTP relay failed" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: false, error: "Unsupported bridge action" }, { status: 400 });
}
