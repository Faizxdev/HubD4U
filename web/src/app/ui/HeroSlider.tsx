"use client";
import { useEffect, useState, useCallback, memo } from 'react';
import Link from 'next/link';

interface HeroItem {
  title: string;
  image?: string;
  link: string;
  synopsis?: string;
  year?: string;
  rating?: string;
  genre?: string[];
  tags?: string[];
}

interface HeroMetadata {
  title?: string;
  image?: string;
  background?: string;
  poster?: string;
  logo?: string;
  synopsis?: string;
  plot?: string;
  year?: string;
  rating?: string;
  imdbRating?: string;
  genre?: string[];
  tags?: string[];
  type?: string;
  runtime?: string;
  language?: string;
}

const PlayIcon = () => (
  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
    <path d="M8 5.14v13.72a1 1 0 001.55.83l11-6.86a1 1 0 000-1.66l-11-6.86A1 1 0 008 5.14z"/>
  </svg>
);

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4 text-[#38bdf8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
  </svg>
);

const StarIcon = () => (
  <svg className="w-3.5 h-3.5 fill-[#f59e0b]" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
  </svg>
);

function HeroSlider({ provider }: { provider: string }) {
  const [items, setItems] = useState<HeroItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [metadata, setMetadata] = useState<HeroMetadata | null>(null);
  const [inWatchlist, setInWatchlist] = useState(false);

  // Load hero items from home API
  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/home?provider=${encodeURIComponent(provider)}`);
        const json = await res.json();
        if (!mounted) return;
        const sections = json?.data || [];
        const trending = sections.find((s: any) => /trend|hot|new|latest|popular/i.test(s.title)) || sections[0] || { Posts: [] };
        const posts = (trending.Posts || []).slice(0, 8).map((p: any) => ({
          title: p.title,
          image: p.image,
          link: p.link,
          synopsis: p.synopsis || p.description,
          year: p.year,
          rating: p.rating,
          genre: p.genre || p.tags || [],
          tags: p.tags || [],
        }));
        setItems(posts);
      } catch (e) {
        console.error('Failed to load hero items:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [provider]);

  // Fetch enhanced metadata for current hero item
  useEffect(() => {
    let mounted = true;
    const currentItem = items[currentIndex];
    if (!currentItem?.link) {
      setMetadata(null);
      return;
    }

    // Check watchlist status from localStorage
    try {
      const saved = JSON.parse(localStorage.getItem('hub_watchlist') || '[]');
      setInWatchlist(saved.some((w: any) => w.link === currentItem.link));
    } catch {}

    async function loadMeta() {
      try {
        const cleanTitle = currentItem.title
          .replace(/\b(1080p|720p|480p|4k|uhd|hdr|web-dl|bluray|x264|x265|hevc|hindi|english|dual audio)\b/gi, '')
          .replace(/[\[\(\{].*?[\]\)\}]/g, '')
          .trim();

        const omdbRes = await fetch(`/api/omdb?title=${encodeURIComponent(cleanTitle)}${currentItem.year ? `&year=${currentItem.year}` : ''}`);
        const omdbJson = await omdbRes.json();
        if (!mounted) return;

        if (omdbJson?.data) {
          setMetadata({
            ...currentItem,
            ...omdbJson.data,
            background: omdbJson.data.poster || currentItem.image,
          });
        } else {
          setMetadata(null);
        }
      } catch {
        if (mounted) setMetadata(null);
      }
    }

    loadMeta();
    return () => { mounted = false; };
  }, [items, currentIndex, provider]);

  // Auto-advance slides
  useEffect(() => {
    if (items.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
      setImageLoaded(false);
    }, 7000);
    return () => clearInterval(interval);
  }, [items.length]);

  const toggleWatchlist = () => {
    const currentItem = items[currentIndex];
    if (!currentItem) return;
    try {
      const list = JSON.parse(localStorage.getItem('hub_watchlist') || '[]');
      const exists = list.some((w: any) => w.link === currentItem.link);
      let updated;
      if (exists) {
        updated = list.filter((w: any) => w.link !== currentItem.link);
        setInWatchlist(false);
      } else {
        updated = [{
          title: currentItem.title,
          image: currentItem.image,
          link: currentItem.link,
          provider,
          addedAt: Date.now(),
        }, ...list];
        setInWatchlist(true);
      }
      localStorage.setItem('hub_watchlist', JSON.stringify(updated.slice(0, 50)));
    } catch {}
  };

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
    setImageLoaded(false);
  }, []);

  const nextSlide = useCallback(() => {
    if (items.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % items.length);
    setImageLoaded(false);
  }, [items.length]);

  const prevSlide = useCallback(() => {
    if (items.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
    setImageLoaded(false);
  }, [items.length]);

  // Touch Swipe Handlers for mobile
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || touchStartY === null) return;
    const diffX = touchStartX - e.changedTouches[0].clientX;
    const diffY = touchStartY - e.changedTouches[0].clientY;
    if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > 0) nextSlide();
      else prevSlide();
    }
    setTouchStartX(null);
    setTouchStartY(null);
  };

  if (loading) {
    return (
      <div className="relative h-[60vh] sm:h-[68vh] md:h-[75vh] min-h-[460px] max-h-[760px] bg-[#090a0e] overflow-hidden">
        <div className="absolute inset-0 bg-[#12141c] animate-pulse" />
        <div className="absolute bottom-16 left-0 right-0 px-6 sm:px-12 max-w-7xl mx-auto">
          <div className="space-y-4 max-w-xl">
            <div className="h-4 w-28 bg-white/10 rounded-full animate-pulse" />
            <div className="h-10 w-3/4 bg-white/10 rounded-lg animate-pulse" />
            <div className="h-4 w-full bg-white/10 rounded animate-pulse" />
            <div className="flex gap-4 pt-2">
              <div className="h-11 w-32 bg-white/20 rounded-lg animate-pulse" />
              <div className="h-11 w-32 bg-white/10 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!items.length) return null;

  const currentItem = items[currentIndex];
  const displayData = metadata || currentItem;
  const backgroundImage = metadata?.background || metadata?.image || currentItem.image;
  const displayGenres = (metadata?.genre || currentItem.genre || currentItem.tags || []).slice(0, 3);
  const infoHref = `/info?provider=${provider}&link=${encodeURIComponent(currentItem.link)}${currentItem.image ? `&poster=${encodeURIComponent(currentItem.image)}` : ''}`;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative h-[60vh] sm:h-[68vh] md:h-[78vh] min-h-[480px] max-h-[780px] overflow-hidden bg-[#090a0e] select-none touch-pan-y"
    >
      {/* Background Hero Image */}
      <div className="absolute inset-0">
        {backgroundImage && (
          <img
            key={`${currentIndex}-${backgroundImage}`}
            src={backgroundImage}
            alt={displayData.title || currentItem.title}
            className={`absolute right-0 top-0 w-full sm:w-[80%] md:w-[70%] h-full object-cover object-center sm:object-right-top transition-all duration-700 ${
              imageLoaded ? 'opacity-90 scale-100' : 'opacity-0 scale-105'
            }`}
            onLoad={() => setImageLoaded(true)}
            referrerPolicy="no-referrer"
          />
        )}
      </div>

      {/* Cinematic Vignettes */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#090a0e] via-[#090a0e]/95 sm:via-[#090a0e]/80 to-transparent w-full md:w-[65%]" />
      <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#090a0e] via-[#090a0e]/80 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#090a0e]/60 to-transparent" />

      {/* Hero Content Container */}
      <div className="relative z-10 h-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 flex items-end pb-14 sm:pb-18 md:pb-20">
        <div className="max-w-2xl" key={currentIndex}>
          {/* Tag */}
          <div className="flex items-center gap-2 mb-2.5">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-white/10 text-[#38bdf8] border border-white/10">
              FEATURED
            </span>
            {metadata?.type && (
              <span className="text-[11px] font-medium uppercase tracking-wider text-[#94a3b8]">
                {metadata.type}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight mb-3 font-sans">
            {displayData.title || currentItem.title}
          </h1>

          {/* Metadata Row: Year • Rating • Duration */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm font-medium text-[#94a3b8] mb-3">
            {(metadata?.year || currentItem.year) && (
              <span>{metadata?.year || currentItem.year}</span>
            )}
            {metadata?.runtime && (
              <>
                <span>•</span>
                <span>{metadata.runtime}</span>
              </>
            )}
            {(metadata?.rating || metadata?.imdbRating || currentItem.rating) && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 text-[#f59e0b] font-bold">
                  <StarIcon />
                  {metadata?.imdbRating || metadata?.rating || currentItem.rating}
                </span>
              </>
            )}
            {displayGenres.length > 0 && (
              <>
                <span>•</span>
                <span className="text-white/70">{displayGenres.join(', ')}</span>
              </>
            )}
          </div>

          {/* Synopsis */}
          {(metadata?.synopsis || metadata?.plot || currentItem.synopsis) && (
            <p className="text-xs sm:text-sm md:text-base text-[#94a3b8] line-clamp-2 sm:line-clamp-3 mb-6 leading-relaxed max-w-xl font-normal">
              {metadata?.synopsis || metadata?.plot || currentItem.synopsis}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-1">
            <Link
              href={infoHref}
              className="bg-white text-black hover:bg-slate-200 active:scale-95 font-bold px-6 py-2.5 sm:px-7 sm:py-3 rounded-lg flex items-center gap-2 shadow-lg transition-all text-sm tracking-wide"
            >
              <PlayIcon />
              <span>Watch Now</span>
            </Link>

            <button
              onClick={toggleWatchlist}
              className={`px-4 py-2.5 sm:py-3 rounded-lg font-medium flex items-center gap-2 border transition-all text-sm active:scale-95 ${
                inWatchlist
                  ? 'bg-white/15 border-white/30 text-white'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
              }`}
            >
              {inWatchlist ? <CheckIcon /> : <PlusIcon />}
              <span>{inWatchlist ? 'In Watchlist' : 'Watchlist'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Slide Indicators */}
      {items.length > 1 && (
        <div className="absolute bottom-6 right-6 sm:right-12 z-20 flex items-center gap-1.5">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-1 rounded-full transition-all duration-300 ${
                index === currentIndex 
                  ? 'w-6 bg-[#38bdf8]' 
                  : 'w-2 bg-white/20 hover:bg-white/40'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(HeroSlider);
