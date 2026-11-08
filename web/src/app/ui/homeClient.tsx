"use client";
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import HeroSlider from './HeroSlider';
import TopProviderSelector from './TopProviderSelector';
import GenreSection from './GenreSection';
import Row from './Row';

interface Section {
  title: string;
  filter: string;
  Posts: Array<{
    title: string;
    image?: string;
    link: string;
    rating?: string;
    year?: string;
    quality?: string;
  }>;
}

interface CatalogItem {
  title: string;
  filter: string;
}

interface ContinueWatchingItem {
  link: string;
  title: string;
  poster?: string;
  position: number;
  duration: number;
  provider: string;
  type?: string;
}

function SkeletonRow() {
  return (
    <div className="py-4 px-4 sm:px-6 lg:px-8">
      <div className="h-5 w-40 bg-white/5 rounded mb-3 animate-pulse" />
      <div className="flex gap-3 sm:gap-4 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex-shrink-0 w-[135px] sm:w-[155px] md:w-[175px] lg:w-[190px]">
            <div className="aspect-[2/3] bg-[#12141c] rounded-lg animate-pulse" />
            <div className="mt-2 h-3 w-3/4 bg-white/5 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HomeClient() {
  const [provider, setProvider] = useState('modflix');
  const [providers, setProviders] = useState<{ value: string; name: string }[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [genres, setGenres] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePillFilter, setActivePillFilter] = useState<string | null>(null);
  const [continueWatching, setContinueWatching] = useState<ContinueWatchingItem[]>([]);

  // Load providers & preferred provider
  useEffect(() => {
    async function loadProviders() {
      try {
        const res = await fetch('/api/providers');
        const json = await res.json();
        const list = (json?.providers || []) as { value: string; name: string }[];
        setProviders(list);
        if (list.length > 0) {
          const saved = typeof window !== 'undefined' ? localStorage.getItem('preferredProvider') : null;
          if (saved && list.some(p => p.value.toLowerCase() === saved.toLowerCase())) {
            setProvider(saved);
          } else {
            const hasModflix = list.find(p => p.value === 'modflix');
            setProvider(hasModflix ? 'modflix' : list[0].value);
          }
        }
      } catch (e) {
        console.error('Failed to load providers:', e);
      }
    }
    loadProviders();
  }, []);

  // Load Continue Watching from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('continue_watching');
      if (saved) {
        const list = JSON.parse(saved);
        if (Array.isArray(list)) {
          setContinueWatching(list.filter((item: any) => item.position > 15 && item.duration > 0));
        }
      }
    } catch {}
  }, []);

  const handleSelectProvider = useCallback((newProvider: string) => {
    setProvider(newProvider);
    setActivePillFilter(null);
    try {
      localStorage.setItem('preferredProvider', newProvider);
      window.dispatchEvent(new CustomEvent('providerChanged', { detail: newProvider }));
    } catch {}
  }, []);

  // Load catalog and posts for provider
  useEffect(() => {
    let mounted = true;
    async function loadContent() {
      if (!provider) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/home?provider=${encodeURIComponent(provider)}`);
        const json = await res.json();
        if (!mounted) return;
        
        const rawCatalog: CatalogItem[] = Array.isArray(json?.catalog) ? json.catalog : [];
        const rawGenres: CatalogItem[] = Array.isArray(json?.genres) ? json.genres : [];
        setCatalog(rawCatalog);
        setGenres(rawGenres);
        
        const rawSections: Section[] = Array.isArray(json?.data) ? json.data : [];
        setSections(rawSections);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Failed to load content');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadContent();
    return () => { mounted = false; };
  }, [provider]);

  const handlePillClick = (item: CatalogItem) => {
    setActivePillFilter(item.filter);
    const targetElement = document.getElementById(`category-${item.filter}`);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const removeContinueItem = (e: React.MouseEvent, link: string) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = continueWatching.filter(i => i.link !== link);
    setContinueWatching(updated);
    try {
      localStorage.setItem('continue_watching', JSON.stringify(updated));
    } catch {}
  };

  const allPills = [
    ...catalog,
    ...genres.filter(g => !catalog.some(c => c.filter === g.filter || c.title === g.title))
  ];

  return (
    <div suppressHydrationWarning className="min-h-screen bg-[#090a0e] text-white">
      {/* Mobile Top Brand Header */}
      <div className="md:hidden fixed top-3 left-4 z-40 flex items-center gap-2">
        <Link href="/" className="flex items-center gap-1.5 active:scale-95 transition-transform">
          <div className="w-6 h-6 rounded bg-[#38bdf8] flex items-center justify-center text-black font-black text-xs">
            H
          </div>
          <span className="text-sm font-black tracking-tight text-white font-sans">
            HUB<span className="text-[#38bdf8]">D4U</span>
          </span>
        </Link>
      </div>

      {/* Top Floating Provider Selector */}
      <TopProviderSelector
        providers={providers}
        activeProvider={provider}
        onSelectProvider={handleSelectProvider}
      />

      {/* Cinematic Hero Slider */}
      <HeroSlider provider={provider} />

      {/* Category & Genre Navigation Pills */}
      {allPills.length > 0 && (
        <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto -mt-6 sm:-mt-8 mb-4 relative z-20">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 hide-scrollbar scroll-smooth overscroll-x-contain touch-pan-x">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#38bdf8] px-2 py-0.5 rounded bg-[#38bdf8]/10 border border-[#38bdf8]/20 flex-shrink-0">
              {provider}
            </span>
            <button
              onClick={() => setActivePillFilter(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activePillFilter === null
                  ? 'bg-white text-black font-bold shadow-md'
                  : 'bg-[#171a24] text-[#94a3b8] hover:text-white hover:bg-white/10 border border-white/5'
              }`}
            >
              All
            </button>
            {allPills.map((item) => {
              const isActive = activePillFilter === item.filter;
              const hasMatchingSection = sections.some(s => s.filter === item.filter);

              if (hasMatchingSection) {
                return (
                  <button
                    key={`${item.title}-${item.filter}`}
                    onClick={() => handlePillClick(item)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-[#38bdf8] text-black font-bold'
                        : 'bg-[#171a24] text-[#94a3b8] hover:text-white hover:bg-white/10 border border-white/5'
                    }`}
                  >
                    {item.title}
                  </button>
                );
              }

              return (
                <Link
                  key={`${item.title}-${item.filter}`}
                  href={`/scroll?provider=${encodeURIComponent(provider)}&filter=${encodeURIComponent(item.filter)}&title=${encodeURIComponent(item.title)}`}
                  className="px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap bg-[#171a24] text-[#94a3b8] hover:text-white hover:bg-white/10 border border-white/5 transition-all"
                >
                  {item.title}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Continue Watching Shelf (When watch history exists) */}
      {continueWatching.length > 0 && (
        <section className="py-4 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-white font-sans flex items-center gap-2">
              <span>Continue Watching</span>
              <span className="text-[10px] font-medium text-[#94a3b8]">({continueWatching.length})</span>
            </h2>
          </div>

          <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-3 hide-scrollbar scroll-smooth">
            {continueWatching.map((item) => {
              const pct = Math.min(100, Math.round((item.position / (item.duration || 1)) * 100));
              const playUrl = `/player?provider=${encodeURIComponent(item.provider || provider)}&type=${encodeURIComponent(item.type || 'movie')}&link=${encodeURIComponent(item.link)}&title=${encodeURIComponent(item.title)}${item.poster ? `&poster=${encodeURIComponent(item.poster)}` : ''}`;

              return (
                <Link
                  key={item.link}
                  href={playUrl}
                  className="group relative flex-shrink-0 w-[180px] sm:w-[220px] rounded-lg overflow-hidden bg-[#12141c] border border-white/10 hover:border-white/30 transition-all"
                >
                  <div className="relative aspect-video bg-[#171a24] overflow-hidden">
                    {item.poster ? (
                      <img
                        src={item.poster}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/20">🎬</div>
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center shadow-lg">
                        <svg className="w-4 h-4 fill-current translate-x-0.5" viewBox="0 0 24 24">
                          <path d="M8 5.14v13.72a1 1 0 001.55.83l11-6.86a1 1 0 000-1.66l-11-6.86A1 1 0 008 5.14z"/>
                        </svg>
                      </div>
                    </div>
                    {/* Remove button */}
                    <button
                      onClick={(e) => removeContinueItem(e, item.link)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 hover:bg-black text-white/70 hover:text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove from history"
                    >
                      ✕
                    </button>
                    {/* Progress Bar */}
                    <div className="absolute bottom-0 inset-x-0 h-1 bg-white/20">
                      <div className="h-full bg-[#38bdf8]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="p-2.5">
                    <h3 className="text-xs font-semibold text-white truncate">{item.title}</h3>
                    <div className="flex items-center justify-between text-[10px] text-[#94a3b8] mt-1">
                      <span>{pct}% watched</span>
                      <span className="text-[#38bdf8] font-medium">Resume →</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Dynamic Content Rows */}
      <div className="pb-16 pt-2 space-y-1">
        {loading && (
          <div>
            {[1, 2, 3, 4].map((i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        )}

        {error && (
          <div className="px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto py-12">
            <div className="rounded-xl border border-white/10 bg-[#12141c] p-8 text-center">
              <h3 className="text-base font-bold text-white mb-2">Unable to Load Content</h3>
              <p className="text-xs text-[#94a3b8] mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-white text-black font-semibold px-5 py-2 rounded-lg text-xs hover:bg-slate-200 transition-all"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Top Rows */}
        {!loading && !error && sections.slice(0, 2).map((section, index) => (
          <div key={`${section.title}-${index}`} id={`category-${section.filter}`}>
            <Row
              title={section.title}
              filter={section.filter}
              items={section.Posts || []}
              provider={provider}
            />
          </div>
        ))}

        {/* Genres Showcase Section */}
        {!loading && !error && genres.length > 0 && (
          <GenreSection genres={genres} provider={provider} />
        )}

        {/* Remaining Rows */}
        {!loading && !error && sections.slice(2).map((section, index) => (
          <div key={`${section.title}-${index + 2}`} id={`category-${section.filter}`}>
            <Row
              title={section.title}
              filter={section.filter}
              items={section.Posts || []}
              provider={provider}
            />
          </div>
        ))}

        {!loading && !error && sections.length === 0 && (
          <div className="px-4 max-w-md mx-auto py-16 text-center">
            <p className="text-xs text-[#94a3b8]">
              No titles available for this source. Select another provider from the top right.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
