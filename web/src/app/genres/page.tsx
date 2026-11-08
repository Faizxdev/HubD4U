"use client";
import { useEffect, useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface GenreItem {
  title: string;
  filter: string;
}

function GenresContent() {
  const searchParams = useSearchParams();
  const initialProvider = searchParams.get('provider') || '';

  const [provider, setProvider] = useState<string>(initialProvider || 'modflix');
  const [providers, setProviders] = useState<{ value: string; name: string }[]>([]);
  const [genres, setGenres] = useState<GenreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function initProviders() {
      try {
        const res = await fetch('/api/providers');
        const json = await res.json();
        const list = (json?.providers || []) as { value: string; name: string }[];
        setProviders(list);

        if (!initialProvider) {
          const saved = typeof window !== 'undefined' ? localStorage.getItem('preferredProvider') : null;
          if (saved && list.some(p => p.value.toLowerCase() === saved.toLowerCase())) {
            setProvider(saved);
          } else if (list.length > 0) {
            const hasModflix = list.find(p => p.value === 'modflix');
            setProvider(hasModflix ? 'modflix' : list[0].value);
          }
        }
      } catch (e) {
        console.error('Failed to load providers:', e);
      }
    }
    initProviders();
  }, [initialProvider]);

  useEffect(() => {
    let mounted = true;
    async function loadGenres() {
      if (!provider) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/home?provider=${encodeURIComponent(provider)}`);
        const json = await res.json();
        if (!mounted) return;

        const rawGenres = Array.isArray(json?.genres) ? json.genres : [];
        setGenres(rawGenres);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Failed to load genres');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadGenres();
    return () => { mounted = false; };
  }, [provider]);

  const handleProviderSelect = (newProvider: string) => {
    setProvider(newProvider);
    try {
      localStorage.setItem('preferredProvider', newProvider);
      window.dispatchEvent(new CustomEvent('providerChanged', { detail: newProvider }));
    } catch {}
  };

  const filteredGenres = useMemo(() => {
    if (!searchTerm.trim()) return genres;
    return genres.filter(g =>
      g.title.toLowerCase().includes(searchTerm.toLowerCase().trim())
    );
  }, [genres, searchTerm]);

  return (
    <div className="min-h-screen bg-[#090a0e] text-white pt-8 pb-24 px-4 sm:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-6 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#38bdf8] bg-[#38bdf8]/10 border border-[#38bdf8]/20 px-2 py-0.5 rounded">
              DIRECTORY
            </span>
            <span className="text-xs text-[#94a3b8]">
              {genres.length} categories available
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-sans tracking-tight">
            Genre Directory
          </h1>
          <p className="text-xs sm:text-sm text-[#94a3b8] mt-1">
            Browse full media collections categorized by genres from <span className="text-white font-semibold uppercase">{provider}</span>
          </p>
        </div>

        {/* Controls: Provider Dropdown & Search Input */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative">
            <select
              aria-label="Select streaming provider"
              value={provider}
              onChange={(e) => handleProviderSelect(e.target.value)}
              className="w-full sm:w-48 px-3 py-2 rounded-lg bg-[#12141c] border border-white/10 text-white text-xs font-semibold focus:border-[#38bdf8] focus:outline-none cursor-pointer"
            >
              {providers.map((p) => (
                <option key={p.value} value={p.value} className="bg-[#12141c]">
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter genres..."
              className="w-full sm:w-48 px-3 py-2 rounded-lg bg-[#12141c] border border-white/10 text-white text-xs placeholder-[#64748b] focus:border-[#38bdf8] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[...Array(18)].map((_, i) => (
            <div key={i} className="h-20 bg-[#12141c] rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-white/10 bg-[#12141c] p-8 text-center max-w-md mx-auto my-12">
          <p className="text-xs text-[#94a3b8] mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-white text-black text-xs font-semibold rounded-lg"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && filteredGenres.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filteredGenres.map((g) => {
            const href = `/scroll?provider=${encodeURIComponent(provider)}&filter=${encodeURIComponent(g.filter)}&title=${encodeURIComponent(g.title)}`;

            return (
              <Link
                key={`${g.title}-${g.filter}`}
                href={href}
                className="group relative h-20 sm:h-24 rounded-lg overflow-hidden border border-white/5 hover:border-white/20 bg-[#12141c] hover:bg-[#181b26] p-3 flex flex-col justify-between transition-all duration-200 active:scale-[0.98]"
              >
                <div className="flex items-center justify-between text-[#64748b] group-hover:text-white transition-colors">
                  <span className="text-[10px] font-mono uppercase tracking-wider">Category</span>
                  <span className="text-xs transform group-hover:translate-x-0.5 transition-transform">→</span>
                </div>

                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide truncate">
                    {g.title}
                  </h3>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {!loading && !error && filteredGenres.length === 0 && (
        <div className="py-20 text-center">
          <p className="text-xs text-[#94a3b8]">
            No genres match &ldquo;{searchTerm}&rdquo;. Try another search term.
          </p>
        </div>
      )}
    </div>
  );
}

export default function GenresPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#090a0e] flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <GenresContent />
    </Suspense>
  );
}
