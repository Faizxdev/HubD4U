"use client";
import { useRef, useState, useCallback, memo } from 'react';
import Card from './Card';

interface RowItem {
  title: string;
  image?: string;
  link: string;
  rating?: string;
  year?: string;
  quality?: string;
}

interface RowProps {
  title: string;
  filter: string;
  items: RowItem[];
  provider: string;
}

const ChevronLeft = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRight = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
  </svg>
);

function Row({ title, filter, items, provider }: RowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const scroll = useCallback((direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = scrollRef.current.clientWidth * 0.75;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  }, []);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeftArrow(scrollLeft > 20);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 20);
  }, []);

  if (!items || items.length === 0) return null;

  return (
    <section className="relative py-4 group/row">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3 px-4 sm:px-6 lg:px-8">
        <h2 className="text-base sm:text-lg font-bold tracking-tight text-white font-sans">
          {title}
        </h2>
        <a 
          href={`/scroll?provider=${provider}&filter=${encodeURIComponent(filter)}&title=${encodeURIComponent(title)}`}
          className="flex items-center gap-1 text-xs font-medium text-[#94a3b8] hover:text-white transition-colors group/link"
        >
          <span>View All</span>
          <svg className="w-3.5 h-3.5 transform group-hover/link:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>

      {/* Carousel Container */}
      <div className="relative">
        {/* Left Arrow Button (Desktop only) */}
        <button
          onClick={() => scroll('left')}
          className={`hidden md:flex absolute left-2 sm:left-4 top-[40%] -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/80 backdrop-blur-md border border-white/10 items-center justify-center text-white shadow-xl transition-all duration-200 hover:bg-white hover:text-black hover:scale-105 active:scale-95 ${
            showLeftArrow ? 'opacity-0 group-hover/row:opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          aria-label="Scroll left"
        >
          <ChevronLeft />
        </button>

        {/* Horizontal Cards Scroll Area */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-3 sm:gap-4 overflow-x-auto px-4 sm:px-6 lg:px-8 pb-3 hide-scrollbar scroll-smooth overscroll-x-contain touch-pan-x"
        >
          {items.map((item, index) => (
            <Card
              key={`${item.link}-${index}`}
              title={item.title}
              image={item.image}
              href={`/info?provider=${provider}&link=${encodeURIComponent(item.link)}${item.image ? `&poster=${encodeURIComponent(item.image)}` : ''}`}
              rating={item.rating}
              year={item.year}
              quality={item.quality}
            />
          ))}
        </div>

        {/* Right Arrow Button (Desktop only) */}
        <button
          onClick={() => scroll('right')}
          className={`hidden md:flex absolute right-2 sm:right-4 top-[40%] -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/80 backdrop-blur-md border border-white/10 items-center justify-center text-white shadow-xl transition-all duration-200 hover:bg-white hover:text-black hover:scale-105 active:scale-95 ${
            showRightArrow ? 'opacity-0 group-hover/row:opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          aria-label="Scroll right"
        >
          <ChevronRight />
        </button>
      </div>
    </section>
  );
}

export default memo(Row);
