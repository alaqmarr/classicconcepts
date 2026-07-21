import Link from "next/link";
import { ChevronRight } from "lucide-react";
import React from "react";

type Breadcrumb = {
  label: string;
  href?: string;
};

type PageHeaderProps = {
  breadcrumbs: Breadcrumb[];
  title: React.ReactNode;
  description?: React.ReactNode;
};

export function PageHeader({ breadcrumbs, title, description }: PageHeaderProps) {
  return (
    <section className="relative bg-[#05060A] text-white pt-32 pb-24 overflow-hidden border-b border-white/10 shadow-2xl">
      {/* Dark Mesh Gradient Background (Global Hero Theme) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[30%] -left-[10%] w-[50%] h-[120%] bg-[#3b82f6] rounded-full mix-blend-screen filter blur-[120px] opacity-20"></div>
        <div className="absolute top-[20%] right-[10%] w-[40%] h-[80%] bg-[#e31837] rounded-full mix-blend-screen filter blur-[130px] opacity-20"></div>
        <div className="absolute -bottom-[20%] left-[30%] w-[60%] h-[60%] bg-[#ffdf00] rounded-full mix-blend-screen filter blur-[150px] opacity-[0.15]"></div>
      </div>
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto space-y-6">
          
          {/* Breadcrumbs */}
          {breadcrumbs.length > 0 && (
            <div className="flex items-center text-sm font-medium text-slate-300 bg-white/10 px-4 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
              {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;
                return (
                  <React.Fragment key={crumb.label}>
                    {crumb.href && !isLast ? (
                      <Link href={crumb.href} className="hover:text-white transition-colors">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="text-white">{crumb.label}</span>
                    )}
                    
                    {!isLast && (
                      <ChevronRight size={14} className="mx-2 opacity-50" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}

          {/* Title */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
            {title}
          </h1>

          {/* Description */}
          {description && (
            <p className="text-lg md:text-xl text-slate-300 max-w-2xl font-light">
              {description}
            </p>
          )}

        </div>
      </div>
    </section>
  );
}
