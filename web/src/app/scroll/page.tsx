"use client";
import { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Card from '../ui/Card';

function ScrollPageContent() {
  const sp = useSearchParams();
  const router = useRouter();
  const provider = sp.get('provider') || 'modflix';
  const title = sp.get('title') || 'Explore';
  const filter = sp.get('filter') || '';
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const fetchedPagesRef = useRef<Set<number>>(new Set());
  const seenLinksRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setItems([]);
    setPage(1);
    setInitialLoading(true);
    setHasMore(true);
    fetchedPagesRef.current.clear();
    seenLinksRef.current.clear();
  }, [provider, filter]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!filter) return;
      if (fetchedPagesRef.current.has(page)) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/posts?provider=${encodeURIComponent(provider)}&filter=${encodeURIComponent(filter)}&page=${page}`, { cache: 'no-store' });
        const json = await res.json();
        if (!mounted) return;
        const incoming: any[] = Array.isArray(json?.data) ? json.data : [];
        
        if (incoming.length === 0) {
          setHasMore(false);
        }
        
        const unique = incoming.filter(p => {
          const key = p?.link || `${p?.title}-${p?.image}`;
          if (!key) return false;
          if (seenLinksRef.current.has(key)) return false;
          seenLinksRef.current.add(key);
          return true;
        });
        setItems(prev => [...prev, ...unique]);
        fetchedPagesRef.current.add(page);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Failed to load content');
      } finally {
        if (mounted) {
          setLoading(false);
          setInitialLoading(false);
        }
      }
    }
    load();
    return () => { mounted = false; };
  }, [provider, filter, page]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting && !loading && hasMore) {
          setPage(p => p + 1);
        }
      });
    }, { rootMargin: '400px' });
    io.observe(el);
    return () => io.disconnect();
  }, [loading, hasMore]);

  return (
    <div className="min-h-screen bg-[#090a0e] text-white pt-8 pb-24 px-4 sm:px-8 max-w-7xl mx-auto">
      {/* Category Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg bg-[#12141c] border border-white/10 hover:bg-white/10 text-[#94a3b8] hover:text-white transition-all"
            aria-label="Go back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white font-sans tracking-tight">
              {title}
            </h1>
            <p className="text-xs text-[#94a3b8] mt-0.5">
              Source: <span className="text-white font-semibold uppercase">{provider}</span>
            </p>
          </div>
        </div>

        {items.length > 0 && (
          <span className="text-xs text-[#94a3b8] hidden sm:block">
            {items.length} titles loaded
          </span>
        )}
      </div>

      {initialLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {[...Array(18)].map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-[#12141c] rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {error && !initialLoading && (
        <div className="rounded-xl border border-white/10 bg-[#12141c] p-8 text-center max-w-md mx-auto my-12">
          <h3 className="text-sm font-bold text-white mb-2">Failed to Load Content</h3>
          <p className="text-xs text-[#94a3b8] mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-white text-black px-4 py-2 rounded-lg text-xs font-semibold"
          >
            Try Again
          </button>
        </div>
      )}

      {!initialLoading && !error && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {items.map((p, idx) => (
              <Card
                key={`${p.link || p.title}-${idx}`}
                title={p.title}
                image={p.image}
                href={`/info?provider=${provider}&link=${encodeURIComponent(p.link)}${p.image ? `&poster=${encodeURIComponent(p.image)}` : ''}`}
                rating={p.rating}
                year={p.year}
                quality={p.quality}
              />
            ))}
          </div>

          {items.length === 0 && !loading && (
            <div className="text-center py-20">
              <h3 className="text-base font-bold text-white mb-2">No Content Available</h3>
              <p className="text-xs text-[#94a3b8]">
                No items were found in this category for {provider}.
              </p>
            </div>
          )}

          {loading && items.length > 0 && (
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={`loading-${i}`} className="aspect-[2/3] bg-[#12141c] rounded-lg animate-pulse" />
              ))}
            </div>
          )}

          {!hasMore && items.length > 0 && (
            <div className="mt-12 text-center">
              <span className="text-xs text-[#64748b] tracking-wider uppercase font-mono">
                End of catalog
              </span>
            </div>
          )}

          <div ref={sentinelRef} className="h-10" />
        </>
      )}
    </div>
  );
}

export default function ScrollPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#090a0e] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ScrollPageContent />
    </Suspense>
  );
}
