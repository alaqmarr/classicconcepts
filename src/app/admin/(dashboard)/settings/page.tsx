import { SubmitForm } from "@/components/admin/SubmitForm";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Save } from "lucide-react";

export default async function AdminSettingsPage() {
  const settings = await prisma.siteSetting.findUnique({ where: { id: "default" } });

  async function updateSettings(formData: FormData) {
    "use server";
    
    await prisma.siteSetting.upsert({
      where: { id: "default" },
      update: {
        address: formData.get("address") as string,
        phone1: formData.get("phone1") as string,
        phone2: formData.get("phone2") as string,
        email: formData.get("email") as string,
        upiId: formData.get("upiId") as string,
        upiName: formData.get("upiName") as string,
        smtpHost: formData.get("smtpHost") as string,
        smtpPort: formData.get("smtpPort") ? parseInt(formData.get("smtpPort") as string) : null,
        smtpUser: formData.get("smtpUser") as string,
        smtpPass: formData.get("smtpPass") as string,
        adminEmail: formData.get("adminEmail") as string,
        mapEmbedUrl: formData.get("mapEmbedUrl") as string,
        homeVideoUrl: formData.get("homeVideoUrl") as string,
      },
      create: {
        id: "default",
        address: formData.get("address") as string,
        phone1: formData.get("phone1") as string,
        phone2: formData.get("phone2") as string,
        email: formData.get("email") as string,
        upiId: formData.get("upiId") as string,
        upiName: formData.get("upiName") as string,
        smtpHost: formData.get("smtpHost") as string,
        smtpPort: formData.get("smtpPort") ? parseInt(formData.get("smtpPort") as string) : null,
        smtpUser: formData.get("smtpUser") as string,
        smtpPass: formData.get("smtpPass") as string,
        adminEmail: formData.get("adminEmail") as string,
        mapEmbedUrl: formData.get("mapEmbedUrl") as string,
        homeVideoUrl: formData.get("homeVideoUrl") as string,
      }
    });

    revalidatePath("/", "layout");
    revalidatePath("/admin/settings");
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
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
            <div className="space-y-2 md:col-span-2">
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
              defaultValue={settings?.phone1} 
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
            <label className="text-sm font-semibold text-gray-700">Email Address</label>
            <input 
              type="email" 
              name="email" 
              defaultValue={settings?.email} 
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-semibold text-gray-700">Home Page "How We Do It" Video URL</label>
            <input 
              type="text" 
              name="homeVideoUrl" 
              defaultValue={settings?.homeVideoUrl || ""} 
              placeholder="e.g. https://www.youtube.com/embed/... or .mp4 link"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
