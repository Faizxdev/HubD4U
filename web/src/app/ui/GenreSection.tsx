"use client";
import Link from 'next/link';

interface GenreItem {
  title: string;
  filter: string;
}

interface GenreSectionProps {
  genres: GenreItem[];
  provider: string;
}

export default function GenreSection({ genres, provider }: GenreSectionProps) {
  if (!genres || genres.length === 0) return null;

  return (
    <section className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-white font-sans flex items-center gap-2">
            <span>Browse Genres</span>
            <span className="text-[10px] font-semibold text-[#94a3b8] px-2 py-0.5 rounded bg-white/5 border border-white/10 uppercase">
              {provider}
            </span>
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3">
        {genres.slice(0, 12).map((g) => {
          const href = `/scroll?provider=${encodeURIComponent(provider)}&filter=${encodeURIComponent(g.filter)}&title=${encodeURIComponent(g.title)}`;

          return (
            <Link
              key={`${g.title}-${g.filter}`}
              href={href}
              className="group relative h-16 sm:h-20 rounded-lg overflow-hidden border border-white/5 hover:border-white/20 bg-[#12141c] hover:bg-[#181b26] p-3 flex flex-col justify-between transition-all duration-200 active:scale-[0.98]"
            >
              <div className="flex items-center justify-between text-white/40 group-hover:text-white transition-colors">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#64748b]">Genre</span>
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
    </section>
  );
}
