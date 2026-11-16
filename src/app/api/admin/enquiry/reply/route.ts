import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendAdminReply } from "@/lib/email";
import {
  isAuthorizedInternalBridgeRequest,
  pushEnquiryReplyToWhatsAppHub,
} from "@/lib/whatsapp-bridge";

export async function POST(req: Request) {
  try {
    const isBridge = isAuthorizedInternalBridgeRequest(req);
    const session = isBridge ? null : await getServerSession(authOptions);
    if (!isBridge && !session?.user) {
      return NextResponse.json({ error: "Unauthorized. Please log in again." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { enquiryId, message, channel, repliedByName } = body;

    if (!enquiryId) {
      return NextResponse.json({ error: "Missing enquiry ID" }, { status: 400 });
    }

    const enquiry = await prisma.enquiry.findUnique({
      where: { id: String(enquiryId) },
    });

    if (!enquiry) {
      return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
    }

    const replyText = String(message || "").trim();
    const isWhatsApp = String(channel || "").toLowerCase() === "whatsapp";
    const actorName =
      repliedByName || session?.user?.name || session?.user?.email || "Classic Concepts Admin";

    let emailSentLocally = false;
    let localEmailError: string | null = null;

    if (!isWhatsApp) {
      if (!replyText) {
        return NextResponse.json({ error: "Missing reply message" }, { status: 400 });
      }
      try {
        await sendAdminReply({
          name: enquiry.name,
          email: enquiry.email,
          replyMessage: replyText,
          originalMessage: enquiry.message,
        });
        emailSentLocally = true;
      } catch (err: any) {
        localEmailError = err?.message || "Local SMTP error";
        console.warn("[Enquiry Reply] Local SMTP failed, trying Hub relay:", localEmailError);
      }
    }

    // Sync reply status + message across the ecosystem (and fallback to Hub email/WhatsApp dispatch if needed)
    const hubSync = await pushEnquiryReplyToWhatsAppHub({
      enquiryId: enquiry.id,
      name: enquiry.name,
      email: enquiry.email,
      phone: enquiry.phone,
      originalMessage: enquiry.message,
      replyMessage: replyText,
      channel: isWhatsApp ? "WHATSAPP" : "EMAIL",
      repliedByName: actorName,
      dispatchEmailViaHub: !isWhatsApp && !emailSentLocally,
    });

    if (!isWhatsApp && !emailSentLocally && !hubSync.emailDispatchedByHub) {
      return NextResponse.json(
        {
          error:
            localEmailError ||
            "Could not send email reply. Please verify SMTP settings in Site Settings.",
        },
        { status: 500 }
      );
    }

    await prisma.enquiry.update({
      where: { id: enquiry.id },
      data: { status: "Replied" },
    });

    revalidatePath("/admin/enquiries");
    revalidatePath(`/admin/enquiries/${enquiry.id}`);
    revalidatePath("/admin");

    return NextResponse.json({
      success: true,
      emailSent: emailSentLocally || Boolean(hubSync.emailDispatchedByHub),
      whatsappSent: Boolean(hubSync.whatsappDispatchedByHub),
      syncedToHub: hubSync.ok,
    });
  } catch (error: any) {
    console.error("Enquiry reply error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to send reply" },
      { status: 500 }
    );
  }
}
