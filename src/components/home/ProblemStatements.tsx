"use client";

import { useRef, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";

interface ProblemStatement {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  description: string | null;
  products?: { name: string }[];
}

export function ProblemStatements({ statements }: { statements: ProblemStatement[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10); // 10px buffer
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [statements]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.8; // scroll 80% of width
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (!statements || statements.length === 0) return null;

  return (
    <section className="py-20 bg-gradient-to-b from-slate-50 via-slate-100/50 to-slate-50 border-t border-slate-100">
      <div className="container mx-auto px-4 md:px-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 uppercase tracking-wider">
            What are you looking to improve?
          </h2>
          <div className="w-16 h-1 bg-[#e31837] mx-auto mt-4 rounded-full"></div>
        </div>

        <div className="relative group">
          {/* Left Arrow */}
          <button 
            onClick={() => scroll('left')}
            className={`absolute left-0 top-1/2 -translate-y-1/2 -ml-2 md:-ml-6 z-10 w-10 h-10 bg-[#0c1a40] text-white flex items-center justify-center rounded-r-lg shadow-lg transition-opacity duration-300 ${canScrollLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          >
            <ChevronLeft size={24} />
          </button>

          {/* Carousel */}
          <div 
            ref={scrollRef}
            onScroll={checkScroll}
            className="flex overflow-x-auto gap-6 snap-x snap-mandatory scrollbar-hide py-4 px-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {statements.map((statement) => (
              <div 
                key={statement.id}
                className="min-w-[280px] md:min-w-[300px] flex-shrink-0 snap-start bg-white rounded-xl shadow-soft hover:shadow-md transition-shadow border border-slate-100 flex flex-col h-full overflow-hidden"
              >
                <div className="h-48 w-full relative bg-slate-100">
                  {statement.imageUrl ? (
                    <Image 
                      src={statement.imageUrl} 
                      alt={statement.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-4xl">
                      {statement.name.charAt(0)}
                    </div>
                  )}
                </div>
                
                <div className="p-6 flex flex-col flex-grow">
                  <h3 className="text-lg font-bold text-slate-800 uppercase tracking-tight mb-3">
                    {statement.name}
                  </h3>
                  {statement.description ? (
                    <div 
                      className="text-sm text-slate-600 leading-relaxed mb-4 flex-grow prose prose-sm prose-slate line-clamp-3"
                      dangerouslySetInnerHTML={{ __html: statement.description }}
                    />
                  ) : (
                    <p className="text-sm text-slate-600 leading-relaxed mb-4 flex-grow">
                      Explore products related to {statement.name}
                    </p>
                  )}
                  
                  {statement.products && statement.products.length > 0 && (
                    <div className="mb-6">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Popular Solutions</p>
                      <div className="flex flex-wrap gap-1.5">
                        {statement.products.map((p, i) => (
                          <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium border border-slate-200 line-clamp-1 max-w-full" title={p.name}>
                            {p.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <Link 
                    href={`/shop/problem/${statement.slug}`}
                    className="group/link flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-[#e31837] transition-colors mt-auto uppercase"
                  >
                    Explore
                    <ArrowRight size={14} className="transform group-hover/link:translate-x-1 transition-transform text-[#e31837]" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Right Arrow */}
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
