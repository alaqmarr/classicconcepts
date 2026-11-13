import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAiRuntimeSettings } from "@/lib/ai-context";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [session, aiSettings] = await Promise.all([
      getServerSession(authOptions),
      getAiRuntimeSettings(),
    ]);

    const isAdmin = Boolean(session?.user?.email);
    const clientReady = Boolean(aiSettings.clientApiKey && aiSettings.aiEnabled);
    const adminReady = Boolean(aiSettings.adminApiKey && aiSettings.aiEnabled);

    return NextResponse.json(
      {
        assistantName: "ACRIO",
        isAdmin,
        email: isAdmin ? session?.user?.email : null,
        name: isAdmin ? session?.user?.name : null,
        model: aiSettings.aiModel,
        aiConfigured: isAdmin ? adminReady : clientReady,
        clientAiConfigured: clientReady,
        adminAiConfigured: isAdmin ? adminReady : false,
        aiEnabled: aiSettings.aiEnabled,
        popupEnabled: aiSettings.aiPopupEnabled,
        popupDelaySeconds: aiSettings.aiPopupDelaySeconds,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch {
    return NextResponse.json(
      {
        assistantName: "ACRIO",
        isAdmin: false,
        email: null,
        model: "claude-haiku-5-5",
        aiConfigured: false,
        clientAiConfigured: false,
        adminAiConfigured: false,
        aiEnabled: true,
        popupEnabled: true,
        popupDelaySeconds: 3,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
}
