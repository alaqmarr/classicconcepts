import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendAdminReply } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { enquiryId, message, channel } = await req.json();

    if (!enquiryId) {
      return NextResponse.json({ error: "Missing enquiry ID" }, { status: 400 });
    }

    const enquiry = await prisma.enquiry.findUnique({
      where: { id: enquiryId },
    });

    if (!enquiry) {
      return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
    }

    if (channel !== "whatsapp") {
      if (!message || !String(message).trim()) {
        return NextResponse.json({ error: "Missing reply message" }, { status: 400 });
      }
      await sendAdminReply({
        name: enquiry.name,
        email: enquiry.email,
        replyMessage: String(message),
        originalMessage: enquiry.message,
      });
    }

    await prisma.enquiry.update({
      where: { id: enquiryId },
      data: { status: "Replied" },
    });

    revalidatePath("/admin/enquiries");
    revalidatePath(`/admin/enquiries/${enquiryId}`);
    revalidatePath("/admin");

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Enquiry reply error:", error);
    return NextResponse.json({ error: "Failed to send reply" }, { status: 500 });
  }
}
