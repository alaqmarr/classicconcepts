export const dynamic = "force-dynamic";
import { SubmitForm } from "@/components/admin/SubmitForm";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Save, Sparkles, ShieldCheck } from "lucide-react";
import { requireAdminSession } from "@/lib/auth";
import {
  invalidateAiCatalogCache,
  invalidateAiSettingsCache,
} from "@/lib/ai-context";
import { invalidateCacheTags } from "@/lib/redis-cache";
import { AiSettingsTester } from "./AiSettingsTester";

async function updateSettings(formData: FormData) {
  "use server";
  await requireAdminSession();

  const existing = await prisma.siteSetting.findUnique({
    where: { id: "default" },
    select: {
      anthropicApiKey: true,
      anthropicClientApiKey: true,
      anthropicAdminApiKey: true,
    },
  });

  const rawClientKey =
    (formData.get("anthropicClientApiKey") as string | null)?.trim() || "";
  const clearClientKey = formData.get("clearAnthropicClientKey") === "on";

  let nextClientKey: string | null = existing?.anthropicClientApiKey || null;
  if (clearClientKey) {
    nextClientKey = null;
  } else if (rawClientKey && !rawClientKey.includes("••••")) {
    nextClientKey = rawClientKey;
  }

  const rawAdminKey =
    (formData.get("anthropicAdminApiKey") as string | null)?.trim() || "";
  const clearAdminKey = formData.get("clearAnthropicAdminKey") === "on";

  let nextAdminKey: string | null = existing?.anthropicAdminApiKey || null;
  if (clearAdminKey) {
    nextAdminKey = null;
  } else if (rawAdminKey && !rawAdminKey.includes("••••")) {
    nextAdminKey = rawAdminKey;
  }

  // Clear legacy shared key if user explicitly clears both, otherwise preserve fallback
  const nextSharedKey =
    clearClientKey && clearAdminKey ? null : existing?.anthropicApiKey || null;

  const aiModel = "claude-haiku-5-5";
  const aiEnabled = formData.get("aiEnabled") === "on";
  const aiPopupEnabled = formData.get("aiPopupEnabled") === "on";
  const parsedDelay = parseInt(
    (formData.get("aiPopupDelaySeconds") as string) || "3",
    10
  );
  const aiPopupDelaySeconds = Number.isFinite(parsedDelay)
    ? Math.min(30, Math.max(1, parsedDelay))
    : 3;

  const sharedData = {
    address: formData.get("address") as string,
    phone1: formData.get("phone1") as string,
    phone2: formData.get("phone2") as string,
    whatsappNumber:
      (formData.get("whatsappNumber") as string) || "+917337220568",
    email: formData.get("email") as string,
    email2: (formData.get("email2") as string) || null,
    businessHours: (formData.get("businessHours") as string) || null,
    upiId: formData.get("upiId") as string,
    upiName: formData.get("upiName") as string,
    smtpHost: formData.get("smtpHost") as string,
    smtpPort: formData.get("smtpPort")
      ? parseInt(formData.get("smtpPort") as string, 10)
      : null,
    smtpUser: formData.get("smtpUser") as string,
    smtpPass: formData.get("smtpPass") as string,
    adminEmail: formData.get("adminEmail") as string,
    mapEmbedUrl: formData.get("mapEmbedUrl") as string,
    homeVideoUrl: formData.get("homeVideoUrl") as string,
    googleAnalyticsId:
      (formData.get("googleAnalyticsId") as string)?.trim() || null,
    headScripts: (formData.get("headScripts") as string) || null,
    bodyScripts: (formData.get("bodyScripts") as string) || null,
    clientCarouselSpeed: formData.get("clientCarouselSpeed")
      ? parseInt(formData.get("clientCarouselSpeed") as string, 10)
      : 25,
    anthropicApiKey: nextSharedKey,
    anthropicClientApiKey: nextClientKey,
    anthropicAdminApiKey: nextAdminKey,
    aiModel,
    aiEnabled,
    aiPopupEnabled,
    aiPopupDelaySeconds,
  };

  await prisma.siteSetting.upsert({
    where: { id: "default" },
    update: sharedData,
    create: {
      id: "default",
      ...sharedData,
    },
  });

  invalidateAiSettingsCache();
  invalidateAiCatalogCache();
  await invalidateCacheTags(["settings", "brand", "ai-snapshot", "ai-responses"]);

  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
}

export default async function AdminSettingsPage() {
  const [settings, productCount, cacheCount] = await Promise.all([
    prisma.siteSetting.findUnique({ where: { id: "default" } }),
    prisma.product.count().catch(() => 0),
    prisma.aiResponseCache.count().catch(() => 0),
  ]);

  const dbClientKey = settings?.anthropicClientApiKey?.trim() || "";
  const dbAdminKey = settings?.anthropicAdminApiKey?.trim() || "";
  const dbSharedKey = settings?.anthropicApiKey?.trim() || "";

  const envClientKey = process.env.ANTHROPIC_CLIENT_API_KEY?.trim() || "";
  const envAdminKey = process.env.ANTHROPIC_ADMIN_API_KEY?.trim() || "";
  const envSharedKey = process.env.ANTHROPIC_API_KEY?.trim() || "";

  const effectiveClientKey = dbClientKey || envClientKey || dbSharedKey || envSharedKey;
  const effectiveAdminKey = dbAdminKey || envAdminKey || dbSharedKey || envSharedKey;

  const hasClientKey = Boolean(effectiveClientKey);
  const hasAdminKey = Boolean(effectiveAdminKey);

  const clientKeyHint = dbClientKey
    ? `Client Key Saved in DB (••••${dbClientKey.slice(-4)})`
    : envClientKey
    ? `Loaded from ANTHROPIC_CLIENT_API_KEY (••••${envClientKey.slice(-4)})`
    : dbSharedKey || envSharedKey
    ? `Using Shared Fallback Key (••••${(dbSharedKey || envSharedKey).slice(-4)})`
    : "Client Key Not Set (Smart Local Mode)";

  const adminKeyHint = dbAdminKey
    ? `Admin Key Saved in DB (••••${dbAdminKey.slice(-4)})`
    : envAdminKey
    ? `Loaded from ANTHROPIC_ADMIN_API_KEY (••••${envAdminKey.slice(-4)})`
    : dbSharedKey || envSharedKey
    ? `Using Shared Fallback Key (••••${(dbSharedKey || envSharedKey).slice(-4)})`
    : "Admin Key Not Set";

  return (
    <div className="p-8 w-full mx-auto">
      <h1 className="text-3xl font-bold mb-8">Site &amp; ACRIO AI Settings</h1>

      <SubmitForm
        action={updateSettings}
        className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 space-y-6"
      >
        {/* Dual-Agent ACRIO Configuration (Strictly Claude Haiku 5.5 Only) */}
        <div
          id="ai-settings"
          className="p-6 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-white to-blue-50/60 border border-indigo-200/80 space-y-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-600 text-white text-xs font-bold mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>ACRIO Dual Agents • Locked to claude-haiku-5-5 (Effort: Low)</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                ACRIO Client Assistant &amp; ACRIO Admin Co-Pilot (Separate API Keys)
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl">
                Configure two independent Anthropic API keys to isolate public visitor traffic (Talk to ACRIO Popup &amp; ACRIO Search) from internal Admin Co-Pilot operations (Inline Editor, Category &amp; Bullet Product Generator, and Enquiry Replies). Both ACRIO agents run strictly on <code className="px-1.5 py-0.5 rounded bg-indigo-100/80 text-indigo-900 font-mono text-xs">claude-haiku-5-5</code> with 90% Prompt Caching.
              </p>
            </div>

            <div className="flex flex-col items-end gap-1.5">
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                  hasClientKey
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-amber-50 text-amber-800 border-amber-200"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Client: {clientKeyHint}</span>
              </div>
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                  hasAdminKey
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-amber-50 text-amber-800 border-amber-200"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Admin: {adminKeyHint}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            {/* 1. Client-Side Agent API Key */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-bold text-slate-900 block">
                  1. Client-Side Anthropic API Key
                </label>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  agents/client-support-agent.yaml
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Used exclusively for customer queries, entrance popup concierge &amp; catalog search (<code className="font-mono">ANTHROPIC_CLIENT_API_KEY</code>).
              </p>
              <input
                type="password"
                name="anthropicClientApiKey"
                autoComplete="new-password"
                placeholder={
                  dbClientKey
                    ? "Leave blank to keep saved Client key, or paste new sk-ant-..."
                    : "sk-ant-api03-... (Client Key)"
                }
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
              />
              {(dbClientKey || dbSharedKey) && (
                <label className="inline-flex items-center gap-2 text-xs text-slate-500 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    name="clearAnthropicClientKey"
                    className="rounded border-slate-300"
                  />
                  <span>Clear saved Client API key on save</span>
                </label>
              )}
            </div>

            {/* 2. Admin-Side Agent API Key */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-bold text-slate-900 block">
                  2. Admin-Side Anthropic API Key
                </label>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                  agents/admin-copilot-agent.yaml
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Used exclusively for Smart Inline Editing, Bullet Product Autofill &amp; Enquiry Reply Co-Pilot (<code className="font-mono">ANTHROPIC_ADMIN_API_KEY</code>).
              </p>
              <input
                type="password"
                name="anthropicAdminApiKey"
                autoComplete="new-password"
                placeholder={
                  dbAdminKey
                    ? "Leave blank to keep saved Admin key, or paste new sk-ant-..."
                    : "sk-ant-api03-... (Admin Key)"
                }
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
              />
              {(dbAdminKey || dbSharedKey) && (
                <label className="inline-flex items-center gap-2 text-xs text-slate-500 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    name="clearAnthropicAdminKey"
                    className="rounded border-slate-300"
                  />
                  <span>Clear saved Admin API key on save</span>
                </label>
              )}
            </div>

            <div className="flex flex-col justify-center gap-3 p-4 rounded-xl bg-white border border-slate-200">
              <label className="inline-flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="aiEnabled"
                  defaultChecked={settings?.aiEnabled !== false}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="text-sm font-bold text-slate-800 block">
                    Enable AI Features Globally (<code className="font-mono text-xs">claude-haiku-5-5</code>)
                  </span>
                  <span className="text-xs text-slate-500">
                    Uses Anthropic Prompt Caching (90% input token discount) + SQLite zero-token query cache
                  </span>
                </div>
              </label>

              <label className="inline-flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="aiPopupEnabled"
                  defaultChecked={settings?.aiPopupEnabled !== false}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="text-sm font-bold text-slate-800 block">
                    Show Entrance Discovery Popup to New Visitors
                  </span>
                  <span className="text-xs text-slate-500">
                    Asks visitors what they need or what work they do (remembers dismissal for 24h)
                  </span>
                </div>
              </label>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-1.5">
              <label className="text-sm font-semibold text-slate-800 block">
                Visitor Welcome Popup Delay (Seconds)
              </label>
              <input
                type="number"
                name="aiPopupDelaySeconds"
                min={1}
                max={30}
                defaultValue={settings?.aiPopupDelaySeconds ?? 3}
                className="w-32 px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-slate-500">
                How many seconds after landing before the concierge popup gently appears (default: 3s).
              </p>
            </div>
          </div>

          <AiSettingsTester
            hasClientKeyConfigured={hasClientKey}
            hasAdminKeyConfigured={hasAdminKey}
            initialCatalogCount={productCount}
            initialCacheRows={cacheCount}
          />
        </div>

        <hr className="my-8 border-gray-100" />
        <h2 className="text-xl font-bold mb-2">Business &amp; Contact Details</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-semibold text-gray-700">
              Address
            </label>
            <textarea
              name="address"
              defaultValue={settings?.address}
              rows={3}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="space-y-2 md:col-span-2 pt-2">
              <label className="text-sm font-semibold text-gray-700">
                Google Maps Embed URL
              </label>
              <p className="text-xs text-gray-500 mb-1">
                Go to Google Maps -&gt; Share -&gt; Embed a map -&gt; Copy HTML.
                Then extract the &apos;src&apos; attribute link from the copied
                code and paste it here.
              </p>
              <input
                type="text"
                name="mapEmbedUrl"
                defaultValue={settings?.mapEmbedUrl || ""}
                placeholder="https://www.google.com/maps/embed?pb=..."
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">
              Primary Phone
            </label>
            <input
              type="text"
              name="phone1"
              defaultValue={settings?.phone1 || "+917337222876"}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">
              Secondary Phone (Optional)
            </label>
            <input
              type="text"
              name="phone2"
              defaultValue={settings?.phone2 || ""}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-semibold text-gray-700">
              WhatsApp Number (For Floating Chat &amp; Product Enquiries)
            </label>
            <input
              type="text"
              name="whatsappNumber"
              defaultValue={settings?.whatsappNumber || "+917337220568"}
              placeholder="+917337220568"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">
              Primary Email Address
            </label>
            <input
              type="email"
              name="email"
              defaultValue={settings?.email}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">
              Secondary Email Address (Optional)
            </label>
            <input
              type="email"
              name="email2"
              defaultValue={settings?.email2 || ""}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-semibold text-gray-700">
              Business Hours
            </label>
            <p className="text-xs text-gray-500 mb-1">
              e.g. Monday - Saturday: 9:00 AM to 6:00 PM (Sunday: Closed)
            </p>
            <textarea
              name="businessHours"
              defaultValue={settings?.businessHours || ""}
              rows={2}
              placeholder={
                "Monday - Saturday: 9:00 AM to 6:00 PM\nSunday: Closed"
              }
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-semibold text-gray-700">
              Home Page &quot;How We Do It&quot; Video URL
            </label>
            <input
              type="text"
              name="homeVideoUrl"
              defaultValue={settings?.homeVideoUrl || ""}
              placeholder="e.g. https://www.youtube.com/embed/... or .mp4 link"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-semibold text-gray-700">
              Brands Showcase Carousel Speed (Seconds per Loop)
            </label>
            <p className="text-xs text-gray-500 mb-1">
              Lower seconds = Faster scroll (e.g. 12 = Fast, 25 = Normal, 45 =
              Slow).
            </p>
            <input
              type="number"
              name="clientCarouselSpeed"
              min={3}
              max={180}
              defaultValue={settings?.clientCarouselSpeed || 25}
              className="w-40 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <hr className="my-8 border-gray-100" />
        <h2 className="text-xl font-bold mb-4">Payment Info (UPI)</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">
              UPI ID
            </label>
            <input
              type="text"
              name="upiId"
              defaultValue={settings?.upiId || ""}
              placeholder="e.g., merchant@upi"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">
              Payee Name
            </label>
            <input
              type="text"
              name="upiName"
              defaultValue={settings?.upiName || ""}
              placeholder="e.g., Classic Concepts"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <hr className="my-8 border-gray-100" />
        <h2 className="text-xl font-bold mb-4">SMTP Settings (For Emails)</h2>
        <p className="text-sm text-gray-500 mb-6">
          These credentials are used to send cart checkout requests to the
          admin.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">
              SMTP Host
            </label>
            <input
              type="text"
              name="smtpHost"
              defaultValue={settings?.smtpHost || ""}
              placeholder="e.g., smtp.gmail.com"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">
              SMTP Port
            </label>
            <input
              type="number"
              name="smtpPort"
              defaultValue={settings?.smtpPort || ""}
              placeholder="e.g., 587 or 465"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">
              SMTP Username
            </label>
            <input
              type="text"
              name="smtpUser"
              defaultValue={settings?.smtpUser || ""}
              placeholder="e.g., your_email@gmail.com"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">
              SMTP Password (App Password)
            </label>
            <input
              type="password"
              name="smtpPass"
              defaultValue={settings?.smtpPass || ""}
              placeholder="••••••••••••••••"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-semibold text-gray-700">
              Admin Email Address (Receiver)
            </label>
            <p className="text-xs text-gray-500 mb-1">
              Email address where you will receive contact and cart enquiries.
            </p>
            <input
              type="email"
              name="adminEmail"
              defaultValue={settings?.adminEmail || ""}
              placeholder="e.g., info@classicconcepts.in"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <hr className="my-8 border-gray-100" />
        <h2 className="text-xl font-bold mb-2">
          Google Analytics &amp; Custom Scripts
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Add your Google Analytics ID or custom tracking scripts (Google Tag
          Manager, Meta Pixel, Microsoft Clarity, Search Console verification
          tags, etc.) to automatically inject them into the client website.
        </p>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">
              Google Analytics Measurement ID (Optional)
            </label>
            <input
              type="text"
              name="googleAnalyticsId"
              defaultValue={settings?.googleAnalyticsId || ""}
              placeholder="e.g., G-XXXXXXXXXX"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">
              Custom Head Scripts / Tags (Injected into &lt;head&gt;)
            </label>
            <p className="text-xs text-gray-500">
              Paste full HTML tags such as{" "}
              <code className="bg-gray-100 px-1 rounded">
                &lt;script&gt;...&lt;/script&gt;
              </code>{" "}
              or{" "}
              <code className="bg-gray-100 px-1 rounded">
                &lt;meta name=&quot;google-site-verification&quot; ... /&gt;
              </code>
              .
            </p>
            <textarea
              name="headScripts"
              defaultValue={settings?.headScripts || ""}
              rows={5}
              placeholder={
                "<!-- Google Tag Manager / Meta Pixel / Verification Tags -->\n<script>...</script>"
              }
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs bg-slate-50"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">
              Custom Body Scripts (Injected into &lt;body&gt;)
            </label>
            <p className="text-xs text-gray-500">
              Paste any{" "}
              <code className="bg-gray-100 px-1 rounded">
                &lt;noscript&gt;
              </code>{" "}
              or body-level tracking scripts here.
            </p>
            <textarea
              name="bodyScripts"
              defaultValue={settings?.bodyScripts || ""}
              rows={4}
              placeholder={
                "<!-- Google Tag Manager (noscript) or Body Scripts -->\n<noscript>...</noscript>"
              }
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs bg-slate-50"
            />
          </div>
        </div>

        <div className="pt-6 flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition"
          >
            <Save size={20} />
            Save All Settings
          </button>
        </div>
      </SubmitForm>
    </div>
  );
}
