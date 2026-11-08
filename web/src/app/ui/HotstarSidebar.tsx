"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

const HubLogo = () => (
  <div className="w-8 h-8 rounded-lg bg-[#38bdf8] flex items-center justify-center text-black font-black text-sm tracking-tighter shadow-md">
    H
  </div>
);

const SearchIcon = ({ active }: { active: boolean }) => (
  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={active ? 2.5 : 1.8}
      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
    />
  </svg>
);

const HomeIcon = ({ active }: { active: boolean }) => (
  <svg className="w-5 h-5 flex-shrink-0" fill={active ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={active ? 0 : 1.8}
      d="M3 10.25V20a1 1 0 001 1h5v-6h6v6h5a1 1 0 001-1V10.25a1 1 0 00-.38-.78l-8-6.22a1 1 0 00-1.24 0l-8 6.22a1 1 0 00-.38.78z"
    />
  </svg>
);

const TvIcon = ({ active }: { active: boolean }) => (
  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={active ? 2.3 : 1.8}
      d="M6 6h12a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2zm2-3l3 3m5-3l-3 3"
    />
  </svg>
);

const MovieIcon = ({ active }: { active: boolean }) => (
  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={active ? 2.3 : 1.8}
      d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
    />
  </svg>
);

const GenreIcon = ({ active }: { active: boolean }) => (
  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={active ? 2.3 : 1.8}
      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
    />
  </svg>
);

const ProviderIcon = ({ active }: { active: boolean }) => (
  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={active ? 2.3 : 1.8}
      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
    />
  </svg>
);

export default function HotstarSidebar() {
  const pathname = usePathname();
  const [isHovered, setIsHovered] = useState(false);
  const [activeProvider, setActiveProvider] = useState('modflix');
  const [mounted, setMounted] = useState(false);

  const [tvFilter, setTvFilter] = useState<{ filter: string; title: string }>({ filter: 'series', title: 'TV Shows' });
  const [movieFilter, setMovieFilter] = useState<{ filter: string; title: string }>({ filter: 'movies', title: 'Movies' });

  useEffect(() => {
    setMounted(true);

    function updateProvider(p: string) {
      setActiveProvider(p);
      fetch(`/api/home?provider=${encodeURIComponent(p)}`)
        .then(res => res.json())
        .then(json => {
          const catalog = Array.isArray(json?.catalog) ? json.catalog : [];
          if (catalog.length > 0) {
            const tvCat = catalog.find((c: any) => /series|tv|show/i.test(c.title) || /series|tv|show/i.test(c.filter));
            if (tvCat) setTvFilter({ filter: tvCat.filter, title: tvCat.title });

            const movieCat = catalog.find((c: any) => /movie/i.test(c.title) || /movie/i.test(c.filter));
            if (movieCat) setMovieFilter({ filter: movieCat.filter, title: movieCat.title });
            else setMovieFilter({ filter: catalog[0].filter, title: catalog[0].title });
          }
        })
        .catch(() => {});
    }

    try {
      const saved = localStorage.getItem('preferredProvider');
      if (saved) updateProvider(saved);
      else updateProvider('modflix');
    } catch {
      updateProvider('modflix');
    }

    const handleEvent = (e: any) => {
      if (e.detail) updateProvider(e.detail);
    };

    window.addEventListener('providerChanged', handleEvent);
    return () => window.removeEventListener('providerChanged', handleEvent);
  }, []);

  const navItems = [
    {
      href: '/search',
      label: 'Search',
      icon: (active: boolean) => <SearchIcon active={active} />,
    },
    {
      href: '/',
      label: 'Home',
      icon: (active: boolean) => <HomeIcon active={active} />,
    },
    {
      href: `/scroll?provider=${activeProvider}&filter=${encodeURIComponent(tvFilter.filter)}&title=${encodeURIComponent(tvFilter.title)}`,
      label: 'Series',
      icon: (active: boolean) => <TvIcon active={active} />,
      isActiveCheck: () => mounted && pathname === '/scroll' && typeof window !== 'undefined' && window.location.search.includes(tvFilter.filter),
    },
    {
      href: `/scroll?provider=${activeProvider}&filter=${encodeURIComponent(movieFilter.filter)}&title=${encodeURIComponent(movieFilter.title)}`,
      label: 'Movies',
      icon: (active: boolean) => <MovieIcon active={active} />,
      isActiveCheck: () => mounted && pathname === '/scroll' && typeof window !== 'undefined' && window.location.search.includes(movieFilter.filter),
    },
    {
      href: '/genres',
      label: 'Genres',
      icon: (active: boolean) => <GenreIcon active={active} />,
    },
    {
      href: '/providers',
      label: 'Sources',
      icon: (active: boolean) => <ProviderIcon active={active} />,
    },
  ];

  if (pathname?.startsWith('/player')) return null;

  return (
    <>
      {/* Desktop Left Navigation Rail */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed left-0 top-0 bottom-0 z-50 hidden md:flex flex-col justify-between py-6 transition-all duration-300 ease-out select-none ${
          isHovered
            ? 'w-56 bg-[#090a0e]/98 backdrop-blur-2xl shadow-2xl border-r border-white/10'
            : 'w-18 bg-[#090a0e]/90 border-r border-white/5'
        }`}
      >
        {/* Brand Logo */}
        <div className="px-4">
          <Link href="/" className="flex items-center gap-3">
            <HubLogo />
            <div
              className={`flex flex-col transition-all duration-300 overflow-hidden whitespace-nowrap ${
                isHovered ? 'opacity-100 max-w-[120px] translate-x-0' : 'opacity-0 max-w-0 -translate-x-2'
              }`}
            >
              <span className="text-base font-black tracking-tight text-white font-sans">
                HUB<span className="text-[#38bdf8]">D4U</span>
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-col gap-1.5 px-3">
          {navItems.map((item) => {
            const isActive = item.isActiveCheck ? item.isActiveCheck() : pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`group/item flex items-center gap-3.5 px-3 py-2.5 rounded-lg transition-all ${
                  isActive
                    ? 'text-white bg-white/10 font-semibold'
                    : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
                }`}
              >
                <div className={`transition-colors ${isActive ? 'text-[#38bdf8]' : 'group-hover/item:text-white'}`}>
                  {item.icon(isActive)}
                </div>
                <span
                  className={`text-xs font-medium tracking-wide transition-all duration-300 whitespace-nowrap overflow-hidden ${
                    isHovered ? 'opacity-100 max-w-[120px] translate-x-0' : 'opacity-0 max-w-0 -translate-x-2'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Current Source Indicator */}
        <div className="px-3">
          <Link
            href="/providers"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#94a3b8] hover:text-white hover:bg-white/5 transition-all"
            title={`Active Source: ${activeProvider}`}
          >
            <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-mono uppercase text-[#38bdf8]">
              {activeProvider.slice(0, 1)}
            </div>
            <div
              className={`flex flex-col transition-all duration-300 whitespace-nowrap overflow-hidden ${
                isHovered ? 'opacity-100 max-w-[120px] translate-x-0' : 'opacity-0 max-w-0 -translate-x-2'
              }`}
            >
              <span className="text-[11px] font-semibold text-white uppercase truncate">{activeProvider}</span>
              <span className="text-[9px] text-[#64748b]">Active Source</span>
            </div>
          </Link>
        </div>
      </aside>

      {/* Dim Overlay when sidebar expands on hover */}
      {isHovered && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 hidden md:block pointer-events-none transition-opacity duration-300"
          aria-hidden="true"
        />
      )}
    </>
  );
}
