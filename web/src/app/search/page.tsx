"use client";
import { useEffect, useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Card from '../ui/Card';

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  
  const [query, setQuery] = useState(initialQuery);
  const [provider, setProvider] = useState('all');
  const [providers, setProviders] = useState<{ value: string; name: string }[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [filterByProvider, setFilterByProvider] = useState<string>('all');

  // Load providers list
  useEffect(() => {
    async function loadProviders() {
      try {
        const res = await fetch('/api/providers');
        const json = await res.json();
        const list = (json?.providers || []) as { value: string; name: string }[];
        setProviders(list);
      } catch (e) {
        console.error('Failed to load providers:', e);
      }
    }
    loadProviders();
  }, []);

  // Auto-search if query param exists
  useEffect(() => {
    if (initialQuery) {
      executeSearch(initialQuery, provider);
    }
  }, [initialQuery, provider]);

  async function executeSearch(qStr: string, prov: string) {
    if (!qStr.trim()) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    setFilterByProvider('all');

    try {
      const res = await fetch(`/api/search?provider=${encodeURIComponent(prov)}&q=${encodeURIComponent(qStr.trim())}`);
      const json = await res.json();
      setResults(json?.data || []);
    } catch (e: any) {
      setError(e?.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    executeSearch(query, provider);
  }

  // Available providers in current result set
  const availableResultProviders = useMemo(() => {
    const set = new Set<string>();
    results.forEach(r => {
      if (r.provider) set.add(r.provider);
    });
    return Array.from(set);
  }, [results]);

  // Filtered results
  const displayedResults = useMemo(() => {
    if (filterByProvider === 'all') return results;
    return results.filter(r => r.provider?.toLowerCase() === filterByProvider.toLowerCase());
  }, [results, filterByProvider]);

  const popularTags = ['Action', 'Marvel', 'Anime', 'Batman', 'Hindi', 'Sci-Fi', 'Horror', '4K'];

  return (
    <div className="min-h-screen bg-[#090a0e] text-white pt-8 pb-20 px-4 sm:px-8 max-w-7xl mx-auto">
      {/* Search Header */}
      <div className="max-w-2xl mx-auto text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2 font-sans">
          Search Catalog
        </h1>
        <p className="text-xs sm:text-sm text-[#94a3b8]">
          Discover movies and series across all providers or filter by a specific source
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mt-6 flex flex-col sm:flex-row gap-2.5">
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="px-3.5 py-2.5 rounded-lg bg-[#12141c] border border-white/10 text-white text-xs font-semibold focus:border-[#38bdf8] focus:outline-none sm:w-48 cursor-pointer"
          >
            <option value="all" className="bg-[#12141c] font-semibold text-[#38bdf8]">
              All Providers (Parallel)
            </option>
            {providers.map((p) => (
              <option key={p.value} value={p.value} className="bg-[#12141c]">
                {p.name}
              </option>
            ))}
          </select>

          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, director, or keyword..."
              className="w-full px-4 py-2.5 rounded-lg bg-[#12141c] border border-white/10 text-white text-xs sm:text-sm placeholder-[#64748b] focus:border-[#38bdf8] focus:outline-none transition-all pr-8"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-white text-xs p-1"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-white text-black hover:bg-slate-200 active:scale-95 font-bold px-6 py-2.5 rounded-lg text-xs transition-all disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {/* Popular Tags */}
        <div className="mt-3.5 flex flex-wrap justify-center items-center gap-1.5">
          <span className="text-[11px] text-[#64748b] mr-1">Trending:</span>
          {popularTags.map((tag) => (
            <button
              key={tag}
              onClick={() => {
                setQuery(tag);
                executeSearch(tag, provider);
              }}
              className="px-2.5 py-1 rounded-full bg-[#12141c] hover:bg-[#181b26] border border-white/5 text-[11px] text-[#94a3b8] hover:text-white transition-all"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Results Section */}
      <div>
        {loading && (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-[#94a3b8]">
              Searching {provider === 'all' ? 'across all providers' : provider}...
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-white/10 bg-[#12141c] p-8 text-center max-w-md mx-auto my-8">
            <p className="text-xs text-red-400 mb-4">{error}</p>
            <button
              onClick={() => executeSearch(query, provider)}
              className="bg-white text-black px-4 py-2 rounded-lg text-xs font-semibold"
            >
              Retry Search
            </button>
          </div>
        )}

        {!loading && searched && results.length > 0 && (
          <div>
            {/* Filter Chips Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-white/5">
              <div className="text-xs text-[#94a3b8]">
                Found <span className="text-white font-bold">{displayedResults.length}</span> titles
                {filterByProvider !== 'all' && <span> for provider &ldquo;{filterByProvider}&rdquo;</span>}
              </div>

              {availableResultProviders.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
                  <span className="text-[10px] uppercase font-bold text-[#64748b] mr-1">Source:</span>
                  <button
                    onClick={() => setFilterByProvider('all')}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                      filterByProvider === 'all'
                        ? 'bg-white text-black font-bold'
                        : 'bg-[#12141c] text-[#94a3b8] hover:text-white border border-white/5'
                    }`}
                  >
                    All ({results.length})
                  </button>
                  {availableResultProviders.map((prov) => {
                    const count = results.filter(r => r.provider?.toLowerCase() === prov.toLowerCase()).length;
                    return (
                      <button
                        key={prov}
                        onClick={() => setFilterByProvider(prov)}
                        className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap transition-all uppercase ${
                          filterByProvider === prov
                            ? 'bg-[#38bdf8] text-black font-bold'
                            : 'bg-[#12141c] text-[#94a3b8] hover:text-white border border-white/5'
                        }`}
                      >
                        {prov} ({count})
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {displayedResults.map((item, idx) => {
                const itemProvider = item.provider || (provider === 'all' ? 'modflix' : provider);
                return (
                  <Card
                    key={`${item.link}-${idx}`}
                    title={item.title}
                    image={item.image}
                    href={`/info?provider=${encodeURIComponent(itemProvider)}&link=${encodeURIComponent(item.link)}${item.image ? `&poster=${encodeURIComponent(item.image)}` : ''}`}
                    rating={item.rating}
                    year={item.year}
                    quality={item.quality}
                    type={item.type}
                  />
                );
              })}
            </div>
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="text-center py-20">
            <h3 className="text-base font-bold text-white mb-2">No Titles Found</h3>
            <p className="text-xs text-[#94a3b8] max-w-sm mx-auto mb-6">
              No results found for &ldquo;{query}&rdquo;. Check spelling or try searching across all providers.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#090a0e] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
