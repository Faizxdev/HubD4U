"use client";
import { useState } from 'react';

interface ProviderItem {
  value: string;
  name: string;
  type?: string;
  icon?: string;
}

interface BrandTilesProps {
  providers: ProviderItem[];
  activeProvider: string;
  onSelectProvider: (providerValue: string) => void;
}

// Brand styling map for visual identity like Disney, Marvel, Pixar
const brandThemes: Record<string, { gradient: string; label: string; tag: string }> = {
  modflix: {
    gradient: 'from-[#1e3a8a] via-[#1d4ed8] to-[#0f172a]',
    label: 'MODFLIX',
    tag: 'HD MOVIES',
  },
  mod: {
    gradient: 'from-[#1e3a8a] via-[#1d4ed8] to-[#0f172a]',
    label: 'MOVIESMOD',
    tag: 'PREMIUM',
  },
  vegamovies: {
    gradient: 'from-[#065f46] via-[#047857] to-[#022c22]',
    label: 'VEGAMOVIES',
    tag: 'ULTRA 4K',
  },
  vega: {
    gradient: 'from-[#065f46] via-[#047857] to-[#022c22]',
    label: 'VEGAMOVIES',
    tag: 'SERIES & 4K',
  },
  flixhq: {
    gradient: 'from-[#831843] via-[#be185d] to-[#500724]',
    label: 'FLIXHQ',
    tag: 'GLOBAL TV',
  },
  multi: {
    gradient: 'from-[#7c2d12] via-[#c2410c] to-[#431407]',
    label: 'MULTIMOVIES',
    tag: 'MULTI-AUDIO',
  },
  hdhub4u: {
    gradient: 'from-[#312e81] via-[#4338ca] to-[#1e1b4b]',
    label: 'HDHUB4U',
    tag: 'FAST STREAM',
  },
  world4u: {
    gradient: 'from-[#134e4a] via-[#0f766e] to-[#042f2e]',
    label: 'WORLD4U',
    tag: 'CLASSIC',
  },
};

export default function BrandTiles({
  providers,
  activeProvider,
  onSelectProvider,
}: BrandTilesProps) {
  if (!providers || providers.length === 0) return null;

  return (
    <div className="relative px-4 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs sm:text-sm font-bold tracking-wider uppercase text-[#8f98b2] flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00d9ff]" />
          Provider Hubs
        </h3>
        <span className="text-[11px] text-[#5a637a]">Select provider source</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
        {providers.map((p) => {
          const isActive = activeProvider.toLowerCase() === p.value.toLowerCase();
          const theme = brandThemes[p.value.toLowerCase()] || {
            gradient: 'from-[#1e293b] via-[#334155] to-[#0f172a]',
            label: p.name.toUpperCase(),
            tag: 'SOURCE',
          };

          return (
            <button
              key={p.value}
              onClick={() => onSelectProvider(p.value)}
              className={`group relative h-20 sm:h-24 rounded-xl overflow-hidden border transition-all duration-300 text-left flex flex-col justify-between p-3.5 ${
                isActive
                  ? 'border-[#00d9ff] ring-2 ring-[#00d9ff]/50 shadow-[0_0_25px_rgba(0,217,255,0.25)] scale-[1.03] z-10'
                  : 'border-white/10 hover:border-white/40 hover:scale-[1.04] hover:shadow-2xl'
              } bg-gradient-to-br ${theme.gradient}`}
            >
              {/* Glossy highlight line */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-white/10 pointer-events-none" />

              {/* Animated Sheen sweep on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />

              {/* Tag / Badge */}
              <div className="relative z-10 flex items-center justify-between w-full">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#00d9ff]/90 bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded">
                  {theme.tag}
                </span>
                {isActive && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00d9ff] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00d9ff]" />
                  </span>
                )}
              </div>

              {/* Brand Typography */}
              <div className="relative z-10">
                <h4 className="text-xs sm:text-sm font-black tracking-wider text-white drop-shadow-md truncate">
                  {theme.label}
                </h4>
                <p className="text-[10px] text-[#8f98b2] font-medium truncate">
                  {p.name}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
