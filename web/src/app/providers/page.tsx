"use client";
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Prov = { value: string; name: string; type?: string; icon?: string };

export default function ProvidersPage() {
  const [list, setList] = useState<Prov[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('modflix');
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/providers');
        const json = await res.json();
        if (!mounted) return;
        const providers = json?.providers || [];
        setList(providers);
        const saved = typeof window !== 'undefined' ? localStorage.getItem('preferredProvider') : null;
        if (saved) setSelectedProvider(saved);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Failed to load providers');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return list;
    return list.filter(p => `${p.name} ${p.value}`.toLowerCase().includes(t));
  }, [list, q]);

  const handleProviderSelect = (providerValue: string) => {
    try {
      localStorage.setItem('preferredProvider', providerValue);
      window.dispatchEvent(new CustomEvent('providerChanged', { detail: providerValue }));
      router.push('/');
    } catch {
      router.push('/');
    }
  };

  return (
    <main className="min-h-screen bg-[#090a0e] text-white px-4 sm:px-8 py-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#38bdf8] bg-[#38bdf8]/10 border border-[#38bdf8]/20 px-2 py-0.5 rounded">
              SOURCES
            </span>
            <span className="text-xs text-[#94a3b8]">
              {list.length} providers connected
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-sans">
            Streaming Hubs
          </h1>
          <p className="text-xs sm:text-sm text-[#94a3b8] mt-1">
            Choose your preferred source to browse its full catalog on the home screen
          </p>
        </div>
        <div>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search provider hubs..."
            className="bg-[#12141c] border border-white/10 rounded-lg px-3.5 py-2 text-xs text-white placeholder-[#64748b] focus:border-[#38bdf8] focus:outline-none w-full sm:w-60"
          />
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="h-28 bg-[#12141c] rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {error && <div className="text-xs text-red-400 mb-6">{error}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {filtered.map(p => {
          const isSelected = selectedProvider.toLowerCase() === p.value.toLowerCase();

          return (
            <button
              key={p.value}
              onClick={() => handleProviderSelect(p.value)}
              className={`group relative h-28 rounded-lg overflow-hidden border transition-all text-left flex flex-col justify-between p-3.5 active:scale-[0.98] ${
                isSelected
                  ? 'border-[#38bdf8] bg-[#1a2232] shadow-lg'
                  : 'border-white/5 bg-[#12141c] hover:bg-[#181b26] hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-[9px] font-mono uppercase tracking-wider text-[#94a3b8]">
                  {p.type || 'GLOBAL'}
                </span>
                {isSelected && (
                  <span className="text-[9px] font-bold text-black bg-[#38bdf8] px-1.5 py-0.5 rounded">
                    ACTIVE
                  </span>
                )}
              </div>

              <div>
                <h3 className="text-sm font-bold tracking-tight text-white truncate">
                  {p.name}
                </h3>
                <p className="text-[10px] text-[#64748b] font-mono mt-0.5 truncate">
                  {p.value}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="text-xs text-[#94a3b8] mt-8 text-center py-16">
          No provider hubs matched &ldquo;{q}&rdquo;.
        </div>
      )}
    </main>
  );
}
