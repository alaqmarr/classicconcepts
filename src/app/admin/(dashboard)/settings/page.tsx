export const dynamic = 'force-dynamic';
import { SubmitForm } from "@/components/admin/SubmitForm";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Save } from "lucide-react";

async function updateSettings(formData: FormData) {
  "use server";
  
  await prisma.siteSetting.upsert({
    where: { id: "default" },
    update: {
      address: formData.get("address") as string,
      phone1: formData.get("phone1") as string,
      phone2: formData.get("phone2") as string,
      whatsappNumber: (formData.get("whatsappNumber") as string) || "+917337222876",
      email: formData.get("email") as string,
      email2: (formData.get("email2") as string) || null,
      businessHours: (formData.get("businessHours") as string) || null,
      upiId: formData.get("upiId") as string,
      upiName: formData.get("upiName") as string,
      smtpHost: formData.get("smtpHost") as string,
      smtpPort: formData.get("smtpPort") ? parseInt(formData.get("smtpPort") as string) : null,
      smtpUser: formData.get("smtpUser") as string,
      smtpPass: formData.get("smtpPass") as string,
      adminEmail: formData.get("adminEmail") as string,
      mapEmbedUrl: formData.get("mapEmbedUrl") as string,
      homeVideoUrl: formData.get("homeVideoUrl") as string,
      googleAnalyticsId: (formData.get("googleAnalyticsId") as string)?.trim() || null,
      headScripts: (formData.get("headScripts") as string) || null,
      bodyScripts: (formData.get("bodyScripts") as string) || null,
      clientCarouselSpeed: formData.get("clientCarouselSpeed") ? parseInt(formData.get("clientCarouselSpeed") as string) : 25,
    },
    create: {
      id: "default",
      address: formData.get("address") as string,
      phone1: formData.get("phone1") as string,
      phone2: formData.get("phone2") as string,
      whatsappNumber: (formData.get("whatsappNumber") as string) || "+917337222876",
      email: formData.get("email") as string,
      email2: (formData.get("email2") as string) || null,
      businessHours: (formData.get("businessHours") as string) || null,
      upiId: formData.get("upiId") as string,
      upiName: formData.get("upiName") as string,
      smtpHost: formData.get("smtpHost") as string,
      smtpPort: formData.get("smtpPort") ? parseInt(formData.get("smtpPort") as string) : null,
      smtpUser: formData.get("smtpUser") as string,
      smtpPass: formData.get("smtpPass") as string,
      adminEmail: formData.get("adminEmail") as string,
      mapEmbedUrl: formData.get("mapEmbedUrl") as string,
      homeVideoUrl: formData.get("homeVideoUrl") as string,
      googleAnalyticsId: (formData.get("googleAnalyticsId") as string)?.trim() || null,
      headScripts: (formData.get("headScripts") as string) || null,
      bodyScripts: (formData.get("bodyScripts") as string) || null,
      clientCarouselSpeed: formData.get("clientCarouselSpeed") ? parseInt(formData.get("clientCarouselSpeed") as string) : 25,
    }
  });

  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
}

export default async function AdminSettingsPage() {
  const settings = await prisma.siteSetting.findUnique({ where: { id: "default" } });

  return (
    <div className="p-8 w-full mx-auto">
      <h1 className="text-3xl font-bold mb-8">Site Settings</h1>
      
      <SubmitForm action={updateSettings} className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-semibold text-gray-700">Address</label>
            <textarea 
              name="address" 
              defaultValue={settings?.address} 
              rows={3}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="space-y-2 md:col-span-2 pt-2">
              <label className="text-sm font-semibold text-gray-700">Google Maps Embed URL</label>
              <p className="text-xs text-gray-500 mb-1">Go to Google Maps -&gt; Share -&gt; Embed a map -&gt; Copy HTML. Then extract the &apos;src&apos; attribute link from the copied code and paste it here.</p>
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
            <label className="text-sm font-semibold text-gray-700">Primary Phone</label>
            <input 
              type="text" 
              name="phone1" 
              defaultValue={settings?.phone1 || "+917337222876"} 
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Secondary Phone (Optional)</label>
            <input 
              type="text" 
              name="phone2" 
              defaultValue={settings?.phone2 || ""} 
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-semibold text-gray-700">WhatsApp Number (For Floating Chat &amp; Product Enquiries)</label>
            <input 
              type="text" 
              name="whatsappNumber" 
              defaultValue={settings?.whatsappNumber || "+917337222876"} 
              placeholder="+917337222876"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Primary Email Address</label>
            <input 
              type="email" 
              name="email" 
              defaultValue={settings?.email} 
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Secondary Email Address (Optional)</label>
            <input 
              type="email" 
              name="email2" 
              defaultValue={settings?.email2 || ""} 
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-semibold text-gray-700">Business Hours</label>
            <p className="text-xs text-gray-500 mb-1">e.g. Monday - Saturday: 9:00 AM to 6:00 PM (Sunday: Closed)</p>
            <textarea 
              name="businessHours" 
              defaultValue={settings?.businessHours || ""} 
              rows={2}
              placeholder={"Monday - Saturday: 9:00 AM to 6:00 PM\nSunday: Closed"}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-semibold text-gray-700">Home Page &quot;How We Do It&quot; Video URL</label>
            <input 
              type="text" 
              name="homeVideoUrl" 
              defaultValue={settings?.homeVideoUrl || ""} 
              placeholder="e.g. https://www.youtube.com/embed/... or .mp4 link"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-semibold text-gray-700">Brands Showcase Carousel Speed (Seconds per Loop)</label>
            <p className="text-xs text-gray-500 mb-1">Lower seconds = Faster scroll (e.g. 12 = Fast, 25 = Normal, 45 = Slow).</p>
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
            <label className="text-sm font-semibold text-gray-700">UPI ID</label>
            <input 
              type="text" 
              name="upiId" 
              defaultValue={settings?.upiId || ""} 
              placeholder="e.g., merchant@upi"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Payee Name</label>
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
        <p className="text-sm text-gray-500 mb-6">These credentials are used to send cart checkout requests to the admin.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">SMTP Host</label>
            <input 
              type="text" 
              name="smtpHost" 
              defaultValue={settings?.smtpHost || ""} 
              placeholder="e.g., smtp.gmail.com"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">SMTP Port</label>
            <input 
              type="number" 
              name="smtpPort" 
              defaultValue={settings?.smtpPort || ""} 
              placeholder="e.g., 587 or 465"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">SMTP Username</label>
            <input 
              type="text" 
              name="smtpUser" 
              defaultValue={settings?.smtpUser || ""} 
              placeholder="e.g., your_email@gmail.com"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">SMTP Password (App Password)</label>
            <input 
              type="password" 
              name="smtpPass" 
              defaultValue={settings?.smtpPass || ""} 
              placeholder="••••••••••••••••"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-semibold text-gray-700">Admin Email Address (Receiver)</label>
            <p className="text-xs text-gray-500 mb-1">Email address where you will receive contact and cart enquiries.</p>
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
        <h2 className="text-xl font-bold mb-2">Google Analytics &amp; Custom Scripts</h2>
        <p className="text-sm text-gray-500 mb-6">
          Add your Google Analytics ID or custom tracking scripts (Google Tag Manager, Meta Pixel, Microsoft Clarity, Search Console verification tags, etc.) to automatically inject them into the client website.
        </p>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Google Analytics Measurement ID (Optional)</label>
            <input
              type="text"
              name="googleAnalyticsId"
              defaultValue={settings?.googleAnalyticsId || ""}
              placeholder="e.g., G-XXXXXXXXXX"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Custom Head Scripts / Tags (Injected into &lt;head&gt;)</label>
            <p className="text-xs text-gray-500">
              Paste full HTML tags such as <code className="bg-gray-100 px-1 rounded">&lt;script&gt;...&lt;/script&gt;</code> or <code className="bg-gray-100 px-1 rounded">&lt;meta name=&quot;google-site-verification&quot; ... /&gt;</code>.
            </p>
            <textarea
              name="headScripts"
              defaultValue={settings?.headScripts || ""}
              rows={5}
              placeholder={"<!-- Google Tag Manager / Meta Pixel / Verification Tags -->\n<script>...</script>"}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs bg-slate-50"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Custom Body Scripts (Injected into &lt;body&gt;)</label>
            <p className="text-xs text-gray-500">
              Paste any <code className="bg-gray-100 px-1 rounded">&lt;noscript&gt;</code> or body-level tracking scripts here.
            </p>
            <textarea
              name="bodyScripts"
              defaultValue={settings?.bodyScripts || ""}
              rows={4}
              placeholder={"<!-- Google Tag Manager (noscript) or Body Scripts -->\n<noscript>...</noscript>"}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs bg-slate-50"
            />
          </div>
        </div>

        <div className="pt-6 flex justify-end">
          <button 
            type="submit" 
            className="flex items-center gap-2 bg-[#0056b3] text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-800 transition-colors"
          >
            <Save size={18} />
            Save Settings
          </button>
        </div>

      </SubmitForm>
    </div>
  );
}
