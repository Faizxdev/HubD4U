"use client";
import { useState, useRef, useEffect, useMemo } from 'react';

interface ProviderItem {
  value: string;
  name: string;
  type?: string;
}

interface TopProviderSelectorProps {
  providers: ProviderItem[];
  activeProvider: string;
  onSelectProvider: (providerValue: string) => void;
}

export default function TopProviderSelector({
  providers,
  activeProvider,
  onSelectProvider,
}: TopProviderSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const currentProviderObj = useMemo(() => {
    return providers.find(p => p.value.toLowerCase() === activeProvider.toLowerCase()) || {
      name: activeProvider,
      value: activeProvider,
    };
  }, [providers, activeProvider]);

  const filteredProviders = useMemo(() => {
    if (!search.trim()) return providers;
    const q = search.toLowerCase();
    return providers.filter(
      p => p.name.toLowerCase().includes(q) || p.value.toLowerCase().includes(q)
    );
  }, [providers, search]);

  return (
    <div ref={dropdownRef} className="fixed top-3.5 right-4 sm:top-5 sm:right-8 z-40">
      {/* Pill Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-[#16181f]/90 hover:bg-[#16181f] text-white backdrop-blur-xl border border-white/15 hover:border-[#00d9ff]/50 shadow-xl transition-all duration-200 group active:scale-95 touch-manipulation"
        aria-label="Select streaming provider"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00d9ff] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00d9ff]" />
        </span>
        <div className="flex items-center gap-1.5 text-left">
          <span className="text-[11px] uppercase tracking-wider text-[#8f98b2] hidden sm:inline">
            Source:
          </span>
          <span className="text-xs sm:text-sm font-bold text-white tracking-wide truncate max-w-[105px] sm:max-w-[150px]">
            {currentProviderObj.name}
          </span>
        </div>
        <svg
          className={`w-3.5 h-3.5 text-[#8f98b2] group-hover:text-white transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Popover Dropdown (DESKTOP: unchanged design) */}
      {isOpen && (
        <>
          {/* Desktop Dropdown Popover */}
          <div className="hidden sm:block absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-[#0f1014]/98 backdrop-blur-2xl border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.9)] overflow-hidden animate-in fade-in zoom-in-95 duration-150 z-50">
            {/* Header & Quick Search */}
            <div className="p-3 border-b border-white/10">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#8f98b2]">
                  Select Streaming Source
                </span>
                <span className="text-[10px] text-[#5a637a]">
                  {providers.length} available
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search source (e.g. Vega, Mod)..."
                  className="w-full bg-[#16181f] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-[#5a637a] focus:outline-none focus:border-[#00d9ff]"
                  autoFocus
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#8f98b2] hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Provider List */}
            <div className="max-h-72 overflow-y-auto p-1.5 space-y-0.5 hide-scrollbar">
              {filteredProviders.map((p) => {
                const isSelected = p.value.toLowerCase() === activeProvider.toLowerCase();
                return (
                  <button
                    key={p.value}
                    onClick={() => {
                      onSelectProvider(p.value);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-[#1f80e0] text-white shadow-md'
                        : 'text-[#8f98b2] hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-bold tracking-tight text-white">{p.name}</span>
                      <span className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-[#5a637a]'}`}>
                        {p.value}
                      </span>
                    </div>
                    {isSelected && (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })}

              {filteredProviders.length === 0 && (
                <div className="py-6 text-center text-xs text-[#5a637a]">
                  No sources match "{search}"
                </div>
              )}
            </div>
          </div>

          {/* MOBILE: Android Bottom Sheet Drawer */}
          <div className="sm:hidden fixed inset-0 z-50 flex flex-col justify-end">
            {/* Dark Backdrop */}
            <div
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
            />

            {/* Drawer Sheet */}
            <div className="relative z-10 w-full bg-[#0f1014] border-t border-white/15 rounded-t-3xl p-4 pb-8 max-h-[82vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200">
              {/* Drag Pill Handle */}
              <div className="w-12 h-1 bg-white/25 rounded-full mx-auto mb-3" />

              {/* Title & Close */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div>
                  <h3 className="text-sm font-black text-white font-sans tracking-tight">
                    Select Streaming Source
                  </h3>
                  <span className="text-[10px] text-[#8f98b2]">
                    {providers.length} sources available
                  </span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 rounded-full bg-[#16181f] flex items-center justify-center text-[#8f98b2] hover:text-white text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Search Bar for Touch */}
              <div className="relative mb-3">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter provider (Vega, Modflix, etc.)..."
                  className="w-full bg-[#16181f] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#5a637a] focus:outline-none focus:border-[#00d9ff]"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8f98b2] hover:text-white p-1"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Large Thumb-Friendly Provider List */}
              <div className="overflow-y-auto max-h-[55vh] space-y-1 hide-scrollbar overscroll-contain">
                {filteredProviders.map((p) => {
                  const isSelected = p.value.toLowerCase() === activeProvider.toLowerCase();
                  return (
                    <button
                      key={p.value}
                      onClick={() => {
                        onSelectProvider(p.value);
                        setIsOpen(false);
                        setSearch('');
                      }}
                      className={`w-full min-h-[46px] flex items-center justify-between px-4 py-2.5 rounded-xl text-left transition-all active:scale-[0.98] ${
                        isSelected
                          ? 'bg-[#1f80e0] text-white shadow-lg shadow-[#1f80e0]/25'
                          : 'bg-[#16181f]/80 text-[#8f98b2] active:bg-white/10'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-white'}`}>
                          {p.name}
                        </span>
                        <span className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-[#5a637a]'}`}>
                          {p.value}
                        </span>
                      </div>
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
                          <svg className="w-3.5 h-3.5 text-[#1f80e0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-white/15" />
                      )}
                    </button>
                  );
                })}

                {filteredProviders.length === 0 && (
                  <div className="py-8 text-center text-xs text-[#5a637a]">
                    No providers match "{search}"
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
