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

    return NextResponse.json(
      {
        isAdmin,
        email: isAdmin ? session?.user?.email : null,
        name: isAdmin ? session?.user?.name : null,
        aiConfigured: Boolean(aiSettings.apiKey && aiSettings.aiEnabled),
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
        isAdmin: false,
        email: null,
        aiConfigured: false,
        aiEnabled: true,
        popupEnabled: true,
        popupDelaySeconds: 3,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
}
