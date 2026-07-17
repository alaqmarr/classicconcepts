import { SubmitForm } from "@/components/admin/SubmitForm";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Settings, Save } from "lucide-react";
import { ImageUploader } from "@/components/admin/ImageUploader";

export default async function AboutSettingsPage() {
  const settings = await prisma.siteSetting.findUnique({
    where: { id: "default" }
  }) || {
    aboutIntroImage: "",
    aboutCertIso: "",
    aboutCertHym: "",
    aboutCertGa: "",
    aboutCertAscb: "",
    infraVideoUrl: "",
    pressVideoUrl: "",
    pressClipping1: "",
    pressClipping2: ""
  };

  async function updateSettings(formData: FormData) {
    "use server";
    
    const aboutIntroImage = formData.get("aboutIntroImage") as string;
    const aboutCertIso = formData.get("aboutCertIso") as string;
    const aboutCertHym = formData.get("aboutCertHym") as string;
    const aboutCertGa = formData.get("aboutCertGa") as string;
    const aboutCertAscb = formData.get("aboutCertAscb") as string;
    const infraVideoUrl = formData.get("infraVideoUrl") as string;
    const pressVideoUrl = formData.get("pressVideoUrl") as string;
    const pressClipping1 = formData.get("pressClipping1") as string;
    const pressClipping2 = formData.get("pressClipping2") as string;

    await prisma.siteSetting.upsert({
      where: { id: "default" },
      update: {
        aboutIntroImage,
        aboutCertIso,
        aboutCertHym,
        aboutCertGa,
        aboutCertAscb,
        infraVideoUrl,
        pressVideoUrl,
        pressClipping1,
        pressClipping2
      },
      create: {
        id: "default",
        address: "Update Address in General Settings",
        phone1: "",
        email: "",
        aboutIntroImage,
        aboutCertIso,
        aboutCertHym,
        aboutCertGa,
        aboutCertAscb,
        infraVideoUrl,
        pressVideoUrl,
        pressClipping1,
        pressClipping2
      }
    });

    revalidatePath("/about");
    revalidatePath("/about/infrastructure");
    revalidatePath("/about/press");
    revalidatePath("/admin/about-settings");
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-md">
          <Settings size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">About Pages Settings</h1>
          <p className="text-slate-500 text-sm">Manage dynamic media (videos, certificates, images) across all About pages</p>
        </div>
      </div>

      <SubmitForm action={updateSettings} className="space-y-8">
        
        {/* Main About Page Settings */}
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-8">
          <h2 className="text-xl font-bold text-slate-800 border-b pb-4">Main About Page</h2>
          
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Intro Section Image (e.g., Butterfly Table)</label>
            <ImageUploader name="aboutIntroImage" defaultValue={settings.aboutIntroImage || ""} />
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-slate-700">Certifications Section (Logos)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">ISO Certificate</label>
                <ImageUploader name="aboutCertIso" defaultValue={settings.aboutCertIso || ""} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">HYM Certificate</label>
                <ImageUploader name="aboutCertHym" defaultValue={settings.aboutCertHym || ""} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">GA Certificate</label>
                <ImageUploader name="aboutCertGa" defaultValue={settings.aboutCertGa || ""} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">ASCB Certificate</label>
                <ImageUploader name="aboutCertAscb" defaultValue={settings.aboutCertAscb || ""} />
              </div>
            </div>
          </div>
        </div>

        {/* Infrastructure Page Settings */}
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-xl font-bold text-slate-800 border-b pb-4">Infrastructure Page</h2>
          
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">YouTube Video URL</label>
            <input 
              type="text" 
              name="infraVideoUrl" 
              defaultValue={settings.infraVideoUrl || ""} 
              placeholder="e.g., https://www.youtube.com/embed/dQw4w9WgXcQ"
              className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:border-transparent transition-all"
            />
            <p className="text-xs text-slate-500 mt-2">Use the embedded URL format (e.g. https://www.youtube.com/embed/...)</p>
          </div>
        </div>

        {/* Press Page Settings */}
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-8">
          <h2 className="text-xl font-bold text-slate-800 border-b pb-4">Press Page</h2>
          
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">YouTube Feature Video URL</label>
            <input 
              type="text" 
              name="pressVideoUrl" 
              defaultValue={settings.pressVideoUrl || ""} 
              placeholder="e.g., https://www.youtube.com/embed/dQw4w9WgXcQ"
              className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0056b3] focus:border-transparent transition-all"
            />
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-slate-700">Newspaper Clippings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">Clipping 1</label>
                <ImageUploader name="pressClipping1" defaultValue={settings.pressClipping1 || ""} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">Clipping 2</label>
                <ImageUploader name="pressClipping2" defaultValue={settings.pressClipping2 || ""} />
              </div>
            </div>
          </div>
        </div>

        {/* Save Action */}
        <div className="flex justify-end sticky bottom-6 z-10">
          <button 
            type="submit" 
            className="flex items-center gap-2 bg-[#0056b3] text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-800 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <Save size={20} />
            Save Settings
          </button>
        </div>
      </SubmitForm>
    </div>
  );
}
