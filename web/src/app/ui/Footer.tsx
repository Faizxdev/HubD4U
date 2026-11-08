"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();
  
  // Don't show on player page for full immersion
  if (pathname?.startsWith('/player')) return null;

  return (
    <footer suppressHydrationWarning className="relative z-10 border-t border-white/5 bg-[#07080b] text-[#94a3b8]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-white/5">
          {/* Brand & Purpose */}
          <div className="md:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2 mb-3">
              <span className="text-lg font-black tracking-tight text-white font-sans">
                HUB<span className="text-[#38bdf8]">D4U</span>
              </span>
              <span className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-widest px-2 py-0.5 rounded bg-white/5 border border-white/10">
                PRO
              </span>
            </Link>
            <p className="text-xs text-[#64748b] leading-relaxed max-w-md">
              A high-performance media discovery interface aggregating streams and multi-source catalogs. HubD4U does not host or store any media files on its servers.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3 font-sans">Explore</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/" className="hover:text-white transition-colors">Featured Catalog</Link>
              </li>
              <li>
                <Link href="/search" className="hover:text-white transition-colors">Global Search</Link>
              </li>
              <li>
                <Link href="/genres" className="hover:text-white transition-colors">Genre Directory</Link>
              </li>
              <li>
                <Link href="/providers" className="hover:text-white transition-colors">Streaming Sources</Link>
              </li>
            </ul>
          </div>

          {/* Playback Controls Help */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3 font-sans">Shortcuts</h4>
            <ul className="space-y-1.5 text-[11px] text-[#64748b]">
              <li><kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">Space</kbd> Play / Pause</li>
              <li><kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">← / →</kbd> Seek 10s</li>
              <li><kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">F</kbd> Fullscreen</li>
              <li><kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">M</kbd> Mute Audio</li>
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#64748b]">
          <p>© {new Date().getFullYear()} HubD4U. Designed for seamless cinema discovery.</p>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Content provided via third-party provider modules</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
