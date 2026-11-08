"use client";
import { useEffect, useMemo, useRef, useState } from 'react';

export default function ScrollingTrending({ provider }: { provider: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(true);
  const railRef = useRef<HTMLDivElement | null>(null);
  const autoScrollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/home?provider=${encodeURIComponent(provider)}`);
        const json = await res.json();
        if (!mounted) return;
        const sections = json?.data || [];
        // try to find a trending-like section
        const trending = sections.find((s: any) => /trend|hot|new/i.test(s.title)) || sections[0] || { Posts: [] };
        setItems(trending.Posts || []);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Failed to load');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [provider]);

  // Auto-scroll effect
  useEffect(() => {
    if (!isLive || !railRef.current || items.length === 0) return;

    const startAutoScroll = () => {
      autoScrollRef.current = setInterval(() => {
        if (railRef.current) {
          const { scrollLeft, scrollWidth, clientWidth } = railRef.current;
          if (scrollLeft >= scrollWidth - clientWidth) {
            // Reset to beginning for infinite scroll effect
            railRef.current.scrollTo({ left: 0, behavior: 'smooth' });
          } else {
            railRef.current.scrollBy({ left: 200, behavior: 'smooth' });
          }
        }
      }, 3000); // Scroll every 3 seconds
    };

    startAutoScroll();

    return () => {
      if (autoScrollRef.current) {
        clearInterval(autoScrollRef.current);
      }
    };
  }, [isLive, items]);

  const slides = useMemo(() => (
    (items || []).slice(0, 20).map((p: any, index: number) => (
      <div
        key={`${p.link}-${index}`}
        className="relative flex-[0_0_320px] sm:flex-[0_0_300px] lg:flex-[0_0_280px] xl:flex-[0_0_320px] 2xl:flex-[0_0_360px] h-[220px] sm:h-[200px] lg:h-[180px] xl:h-[220px] 2xl:h-[260px] rounded-xl overflow-hidden bg-zinc-900 group"
      >
        <a
          href={`/info?provider=${encodeURIComponent(provider)}&link=${encodeURIComponent(p.link)}${p.image ? `&poster=${encodeURIComponent(p.image)}` : ''}`}
          className="block w-full h-full"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {p.image ? (
            <img 
              src={p.image} 
              alt={p.title} 
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" 
              loading="lazy" 
              referrerPolicy="no-referrer" 
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
              <span className="text-zinc-500 text-sm">No Image</span>
            </div>
          )}
          
          {/* Live indicator */}
          <div className="absolute top-4 left-4 xl:top-5 xl:left-5">
            <div className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-teal-500 text-white text-sm xl:text-base px-3 py-2 xl:px-4 xl:py-2.5 rounded-full">
              <div className="w-3 h-3 xl:w-3.5 xl:h-3.5 bg-white rounded-full animate-pulse"></div>
              <span className="font-medium">LIVE</span>
            </div>
          </div>

          {/* Trending rank */}
          <div className="absolute top-4 right-4 xl:top-5 xl:right-5">
            <div className="w-10 h-10 xl:w-12 xl:h-12 bg-black/80 text-white text-base xl:text-lg font-bold rounded-full flex items-center justify-center">
              #{index + 1}
            </div>
          </div>

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          
          {/* Title */}
          <div className="absolute bottom-0 left-0 right-0 p-4 xl:p-5">
            <div className="text-sm xl:text-base font-medium text-white line-clamp-2 leading-tight">
              {p.title}
            </div>
          </div>
        </a>
      </div>
    ))
  ), [items, provider]);

  if (error) return null;
  if (loading && !items.length) return null;
  if (!items.length) return null;

  return (
    <div className="relative px-6 max-w-7xl mx-auto mb-16">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-5">
          <h2 className="text-3xl xl:text-4xl font-bold text-white">🔥 Live Trending</h2>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 xl:w-5 xl:h-5 bg-violet-500 rounded-full animate-pulse"></div>
            <span className="text-lg xl:text-xl text-violet-400 font-medium">LIVE NOW</span>
          </div>
        </div>
      </div>

      <div className="relative group">
        {/* Left scroll button */}
        <button
          aria-label="Scroll left"
          className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 hover:bg-black text-white w-14 h-14 xl:w-16 xl:h-16 items-center justify-center rounded-full shadow-lg"
          onClick={() => railRef.current?.scrollBy({ left: -600, behavior: 'smooth' })}
        >
          ‹
        </button>

        {/* Scrolling container */}
        <div 
          ref={railRef} 
          className="flex gap-5 xl:gap-6 overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent scroll-smooth"
          style={{ scrollBehavior: 'smooth' }}
        >
          {slides}
        </div>

        {/* Right scroll button */}
        <button
          aria-label="Scroll right"
          className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 hover:bg-black text-white w-14 h-14 xl:w-16 xl:h-16 items-center justify-center rounded-full shadow-lg"
          onClick={() => railRef.current?.scrollBy({ left: 600, behavior: 'smooth' })}
        >
          ›
        </button>
      </div>
    </div>
  );
}
