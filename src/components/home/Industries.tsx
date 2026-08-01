"use client";

import { useRef, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";

interface Industry {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  description: string | null;
  products?: { name: string }[];
}

export function Industries({ industries }: { industries: Industry[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [industries]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.8;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (!industries || industries.length === 0) return null;

  return (
    <section className="py-20 bg-gradient-to-b from-white via-blue-50/30 to-white">
      <div className="container mx-auto px-4 md:px-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 uppercase tracking-wider">
            Solutions By Industry
          </h2>
          <div className="w-16 h-1 bg-[#e31837] mx-auto mt-4 rounded-full"></div>
        </div>

        <div className="relative group">
          <button 
            onClick={() => scroll('left')}
            className={`absolute left-0 top-1/2 -translate-y-1/2 -ml-2 md:-ml-6 z-10 w-10 h-10 bg-[#0c1a40] text-white flex items-center justify-center rounded-r-lg shadow-lg transition-opacity duration-300 ${canScrollLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          >
            <ChevronLeft size={24} />
          </button>

          <div 
            ref={scrollRef}
            onScroll={checkScroll}
            className="flex overflow-x-auto gap-6 snap-x snap-mandatory scrollbar-hide py-4 px-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {industries.map((industry) => (
              <div 
                key={industry.id}
                className="min-w-[280px] md:min-w-[300px] flex-shrink-0 snap-start bg-white rounded-xl shadow-soft hover:shadow-md transition-shadow border border-slate-100 flex flex-col h-full overflow-hidden"
              >
                <div className="h-48 w-full relative bg-slate-100">
                  {industry.imageUrl ? (
                    <Image 
                      src={industry.imageUrl} 
                      alt={industry.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-4xl">
                      {industry.name.charAt(0)}
                    </div>
                  )}
                </div>
                
                <div className="p-6 flex flex-col flex-grow">
                  <h3 className="text-lg font-bold text-slate-800 uppercase tracking-tight mb-3">
                    {industry.name}
                  </h3>
                  {industry.description ? (
                    <div 
                      className="text-sm text-slate-600 leading-relaxed mb-4 flex-grow prose prose-sm prose-slate line-clamp-3"
                      dangerouslySetInnerHTML={{ __html: industry.description }}
                    />
                  ) : (
                    <p className="text-sm text-slate-600 leading-relaxed mb-4 flex-grow">
                      Discover solutions tailored for the {industry.name} sector.
                    </p>
                  )}
                  
                  {industry.products && industry.products.length > 0 && (
                    <div className="mb-6">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Popular Solutions</p>
                      <div className="flex flex-wrap gap-1.5">
                        {industry.products.map((p, i) => (
                          <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium border border-slate-200 line-clamp-1 max-w-full" title={p.name}>
                            {p.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <Link 
                    href={`/shop/industry/${industry.slug}`}
                    className="group/link flex items-center gap-2 text-xs font-bold text-[#0056b3] hover:text-[#e31837] transition-colors mt-auto uppercase"
                  >
                    View Solutions
                    <ArrowRight size={14} className="transform group-hover/link:translate-x-1 transition-transform text-[#e31837]" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <button 
            onClick={() => scroll('right')}
            className={`absolute right-0 top-1/2 -translate-y-1/2 -mr-2 md:-mr-6 z-10 w-10 h-10 bg-[#0c1a40] text-white flex items-center justify-center rounded-l-lg shadow-lg transition-opacity duration-300 ${canScrollRight ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
      `}} />
    </section>
  );
}
