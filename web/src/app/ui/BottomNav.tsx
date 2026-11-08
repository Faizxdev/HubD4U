"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function BottomNav() {
  const pathname = usePathname();
  const [activeProvider, setActiveProvider] = useState('modflix');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    function readSavedProvider() {
      try {
        const saved = localStorage.getItem('preferredProvider');
        if (saved) setActiveProvider(saved);
      } catch {}
    }
    readSavedProvider();

    const handleEvent = (e: any) => {
      if (e.detail) setActiveProvider(e.detail);
    };

    window.addEventListener('providerChanged', handleEvent);
    return () => window.removeEventListener('providerChanged', handleEvent);
  }, []);

  if (pathname?.startsWith('/player')) return null;

  const navItems = [
    {
      href: '/',
      label: 'Home',
      isActive: pathname === '/',
      icon: (active: boolean) => (
        <svg className="w-5 h-5" fill={active ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2} d="M3 10.25V20a1 1 0 001 1h5v-6h6v6h5a1 1 0 001-1V10.25a1 1 0 00-.38-.78l-8-6.22a1 1 0 00-1.24 0l-8 6.22a1 1 0 00-.38.78z" />
        </svg>
      ),
    },
    {
      href: '/search',
      label: 'Search',
      isActive: pathname === '/search',
      icon: (active: boolean) => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      ),
    },
    {
      href: `/genres?provider=${encodeURIComponent(activeProvider)}`,
      label: 'Genres',
      isActive: pathname === '/genres',
      icon: (active: boolean) => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
    },
    {
      href: `/scroll?provider=${encodeURIComponent(activeProvider)}&filter=movies&title=Movies`,
      label: 'Movies',
      isActive: mounted && pathname === '/scroll' && typeof window !== 'undefined' && window.location.search.includes('movies'),
      icon: (active: boolean) => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
        </svg>
      ),
    },
    {
      href: '/providers',
      label: 'Sources',
      isActive: pathname === '/providers',
      icon: (active: boolean) => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#090a0e]/95 backdrop-blur-xl border-t border-white/10 px-2 pt-1 pb-[max(0.6rem,env(safe-area-inset-bottom,0px))] select-none">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`min-w-[56px] min-h-[48px] flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl transition-all active:scale-90 ${
              item.isActive 
                ? 'text-[#38bdf8] font-bold' 
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <div>
              {item.icon(item.isActive)}
            </div>
            <span className={`text-[10px] tracking-tight leading-none ${item.isActive ? 'text-[#38bdf8] font-bold' : 'text-[#94a3b8]'}`}>
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
