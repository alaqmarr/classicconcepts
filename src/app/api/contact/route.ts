import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  sendAdminEnquiryNotification,
  sendAdminReply,
  sendClientEnquiryThankYou,
} from "@/lib/email";
import { runCustomerConcierge } from "@/lib/ai";
import { pushWebsiteEnquiryToWhatsAppHub } from "@/lib/whatsapp-bridge";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = typeof body?.name === "string" ? body.name.trim().slice(0, 200) : "";
    const email = typeof body?.email === "string" ? body.email.trim().slice(0, 200) : "";
    const phone = typeof body?.phone === "string" ? body.phone.trim().slice(0, 60) : "";
    const message = typeof body?.message === "string" ? body.message.trim().slice(0, 5000) : "";
    const source =
      typeof body?.source === "string" && body.source.trim()
        ? body.source.trim().slice(0, 120)
        : "Contact Form";

    if (!name || !email || !phone || !message) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // 1. Save to Database
    const enquiry = await prisma.enquiry.create({
      data: {
        name,
        email,
        phone,
        message,
        source,
      },
    });

    // 2. Evaluate immediately via WhatsApp Hub (:3007 -> Claude Haiku 5.5 + Sales Routing + Staff Email Alert)
    //    and fall back to local Claude Haiku 5.5 evaluation if :3007 is temporarily restarting.
    void (async () => {
      try {
        await sendAdminEnquiryNotification({ name, email, phone, message, source }).catch(
          (err) => console.error("Admin enquiry email error:", err)
        );

        const hubResult = await pushWebsiteEnquiryToWhatsAppHub({
          enquiryId: enquiry.id,
          name,
          email,
          phone,
          message,
          source,
        });

        if (hubResult.ok && hubResult.emailDispatchedByHub) {
          await prisma.enquiry
            .update({ where: { id: enquiry.id }, data: { status: "Replied" } })
            .catch(() => null);
          return;
        }

        let tailoredReply = hubResult.smartReplyText || "";
        if (!tailoredReply) {
          const localEval = await runCustomerConcierge(message, true).catch(() => null);
          if (localEval && localEval.message) {
            const prodLines = (localEval.products || [])
              .slice(0, 3)
              .map(
                (p) =>
                  `- ${p.name}${p.effectivePrice ? ` (Rs ${p.effectivePrice.toLocaleString("en-IN")})` : ""}: https://classicconcepts.in/shop/p/${p.slug}`
              )
              .join("\n");
            tailoredReply = [
              localEval.message,
              prodLines ? `\nMatching options from our catalog:\n${prodLines}` : "",
              `\nOur Sales Team has also received your enquiry and will follow up with exact pricing and delivery details.`,
            ]
              .filter(Boolean)
              .join("\n");
          }
        }

        if (tailoredReply) {
          await sendAdminReply({
            name,
            email,
            replyMessage: tailoredReply,
            originalMessage: message,
          });
          await prisma.enquiry
            .update({ where: { id: enquiry.id }, data: { status: "Replied" } })
            .catch(() => null);
        } else {
          await sendClientEnquiryThankYou({ name, email });
        }
      } catch (err) {
        console.error("Smart enquiry evaluation & dispatch failed:", err);
        await sendClientEnquiryThankYou({ name, email }).catch(() => null);
      }
    })();

    return NextResponse.json({ success: true, enquiryId: enquiry.id });
  } catch (error: any) {
    console.error("Contact API Error:", error);
    return NextResponse.json(
      { error: "Failed to submit enquiry. Please try again later." },
      { status: 500 }
    );
  }
}
