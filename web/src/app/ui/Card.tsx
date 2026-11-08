"use client";
import Link from 'next/link';
import { useState, memo } from 'react';

interface CardProps {
  title: string;
  image?: string;
  href: string;
  rating?: string;
  year?: string;
  quality?: string;
  type?: string;
}

const StarIcon = () => (
  <svg className="w-3 h-3 fill-[#f59e0b]" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
  </svg>
);

const PlayIcon = () => (
  <svg className="w-4 h-4 fill-white translate-x-0.5" viewBox="0 0 24 24">
    <path d="M8 5.14v13.72a1 1 0 001.55.83l11-6.86a1 1 0 000-1.66l-11-6.86A1 1 0 008 5.14z"/>
  </svg>
);

function Card({ title, image, href, rating, year, quality, type }: CardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <Link 
      href={href} 
      className="group relative block flex-shrink-0 w-[135px] sm:w-[155px] md:w-[175px] lg:w-[190px] transition-all duration-200 touch-manipulation active:scale-[0.98]"
    >
      {/* Poster Card Container */}
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-[#12141c] border border-white/5 transition-all duration-300 ease-out group-hover:scale-[1.03] group-hover:border-white/30 group-hover:shadow-[0_12px_28px_rgba(0,0,0,0.8)] z-0 group-hover:z-10">
        {/* Loading Skeleton */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 bg-[#161922] animate-pulse" />
        )}
        
        {/* Poster Image */}
        {image && !imageError ? (
          <img
            src={image}
            alt={title}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            loading="lazy"
            referrerPolicy="no-referrer"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[#12141c]">
            <svg className="w-8 h-8 text-white/15" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/>
            </svg>
          </div>
        )}

        {/* Cinematic Bottom Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#090a0e] via-black/15 to-transparent opacity-75 group-hover:opacity-40 transition-opacity duration-200" />

        {/* Quality Badge (Top Left) */}
        {quality && (
          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-sm border border-white/10 text-[9px] font-bold uppercase text-[#38bdf8] tracking-wider">
            {quality}
          </div>
        )}

        {/* Rating Badge (Top Right) */}
        {rating && (
          <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-sm border border-white/10">
            <StarIcon />
            <span className="text-[10px] font-bold text-[#f59e0b]">{rating}</span>
          </div>
        )}

        {/* Hover Quick Play Pill */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-xl transform scale-90 group-hover:scale-100 transition-transform duration-200">
            <PlayIcon />
          </div>
        </div>

        {/* Bottom Year info */}
        {year && (
          <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[11px] font-medium text-[#94a3b8]">
            <span>{year}</span>
            {type && <span className="uppercase text-[9px] tracking-wider text-[#64748b]">{type}</span>}
          </div>
        )}
      </div>

      {/* Title Below Card (2-lines readable) */}
      <div className="mt-2 px-0.5 min-h-[2.4rem]">
        <h3 className="text-xs sm:text-[13px] font-medium text-[#cbd5e1] group-hover:text-white line-clamp-2 leading-snug transition-colors duration-150">
          {title}
        </h3>
      </div>
    </Link>
  );
}

export default memo(Card);
