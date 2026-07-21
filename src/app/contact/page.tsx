import { prisma } from "@/lib/db";
import { ContactForm } from "@/components/ContactForm";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us | Classic Concepts",
  description: "Get in touch with Classic Concepts for any enquiries regarding acrylic podiums, products, and custom solutions.",
};

export default async function ContactPage() {
  const settings = await prisma.siteSetting.findUnique({ where: { id: "default" } });

  return (
    <div className="relative bg-[#f8fafc] min-h-screen py-16 md:py-24 overflow-hidden">
      {/* Animated Glowing Orbs Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[20%] w-[300px] h-[300px] bg-red-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-blob"></div>
        <div className="absolute top-[30%] right-[20%] w-[350px] h-[350px] bg-yellow-400 rounded-full mix-blend-multiply filter blur-[120px] opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-[20%] left-[40%] w-[400px] h-[400px] bg-blue-400 rounded-full mix-blend-multiply filter blur-[150px] opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="container mx-auto px-4 md:px-8 relative z-10">
        
        {/* Header section */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 tracking-tight mb-6 drop-shadow-sm">Contact Us</h1>
          <p className="text-lg text-slate-600 leading-relaxed font-medium">
            Have a question about our products, or looking for a custom acrylic solution? Our team of experts is ready to help you with your next project.
          </p>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          
          {/* Contact Details side */}
          <div className="space-y-10">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-6">Get in Touch</h2>
              <div className="space-y-6">
                
                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-[#0056b3] shrink-0">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 mb-1">Head Office</h3>
                    <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                      {(settings?.address || "Mumbai, Maharashtra, India").replace(/\\n/g, '\n')}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-[#0056b3] shrink-0">
                    <Phone size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 mb-1">Phone Number</h3>
                    <p className="text-slate-600 leading-relaxed">
                      <a href={`tel:${settings?.phone1}`} className="hover:text-[#0056b3] transition-colors">{settings?.phone1}</a>
                      {settings?.phone2 && (
                        <>
                          <br />
                          <a href={`tel:${settings?.phone2}`} className="hover:text-[#0056b3] transition-colors">{settings?.phone2}</a>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-[#0056b3] shrink-0">
                    <Mail size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 mb-1">Email Address</h3>
                    <p className="text-slate-600 leading-relaxed">
                      <a href={`mailto:${settings?.email}`} className="hover:text-[#0056b3] transition-colors">{settings?.email || "sales@classicconcepts.in"}</a>
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-[#0056b3] shrink-0">
                    <Clock size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 mb-1">Business Hours</h3>
                    <p className="text-slate-600 leading-relaxed">
                      Monday - Saturday: 9:00 AM to 6:00 PM<br />
                      Sunday: Closed
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* Optional Map */}
            {(settings?.mapEmbedUrl || true) && (
              <div className="h-64 w-full bg-slate-200 rounded-2xl overflow-hidden shadow-inner">
                <iframe 
                  src={settings?.mapEmbedUrl || "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1m3!1d3768.4901928099684!2d72.8443906!3d19.173775!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be7b65345a331df%3A0xc6c764e5c8e31a0a!2sClassic%20Concepts!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin"} 
                  width="100%" 
                  height="100%" 
                  style={{ border: 0 }} 
                  allowFullScreen={false} 
                  loading="lazy" 
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              </div>
            )}

          </div>

          {/* Form Side */}
          <div className="bg-white/40 backdrop-blur-xl border border-white/60 p-8 md:p-10 rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.04)] relative z-10">
            <ContactForm />
          </div>

        </div>
      </div>
    </div>
  );
}
