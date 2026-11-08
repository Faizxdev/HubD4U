"use client";
import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface OMDBData {
  title: string;
  year: string;
  rated: string;
  released: string;
  runtime: string;
  genre: string[];
  director: string[];
  writer: string[];
  actors: string[];
  plot: string;
  language: string;
  country: string;
  awards: string;
  poster: string | null;
  ratings: Array<{ source: string; value: string }>;
  imdbRating: string | null;
  imdbId: string;
  type: string;
}

interface TrailerData {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  url: string;
  thumbnail: string;
}

const StarIcon = () => (
  <svg className="w-3.5 h-3.5 fill-[#f59e0b]" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
  </svg>
);

const PlayIcon = () => (
  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
    <path d="M8 5.14v13.72a1 1 0 001.55.83l11-6.86a1 1 0 000-1.66l-11-6.86A1 1 0 008 5.14z"/>
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4 text-[#38bdf8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

function InfoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const link = searchParams.get('link') || '';
  const providerParam = searchParams.get('provider') || '';
  const posterParam = searchParams.get('poster') || '';
  
  const provider = useMemo(() => {
    if (providerParam) return providerParam;
    try {
      const host = new URL(link).host;
      if (/vegamovies/i.test(host)) return 'vega';
      if (/hdhub4u/i.test(host)) return 'hdhub4u';
      if (/multimovies/i.test(host)) return 'multi';
      if (/moviesdrive/i.test(host)) return 'drive';
      if (/modflix/i.test(host)) return 'modflix';
    } catch {}
    return 'modflix';
  }, [providerParam, link]);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [episodesMap, setEpisodesMap] = useState<Record<string, any[]>>({});
  const [episodesLoading, setEpisodesLoading] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'streams' | 'overview' | 'cast'>('streams');
  
  // Download Modal state
  const [downloadModal, setDownloadModal] = useState<{ show: boolean; link: string; title: string }>({ show: false, link: '', title: '' });
  const [downloadLinks, setDownloadLinks] = useState<any[]>([]);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [inWatchlist, setInWatchlist] = useState(false);
  
  // OMDB state
  const [omdbData, setOmdbData] = useState<OMDBData | null>(null);
  
  // Trailer state
  const [trailers, setTrailers] = useState<TrailerData[]>([]);
  const [showTrailerModal, setShowTrailerModal] = useState(false);
  const [activeTrailer, setActiveTrailer] = useState<TrailerData | null>(null);

  // 1. Fetch title info from provider
  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!link) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/info?provider=${encodeURIComponent(provider)}&link=${encodeURIComponent(link)}`);
        const json = await res.json();
        if (!mounted) return;
        setData(json?.data || null);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Failed to load title details');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [provider, link]);

  // Check Watchlist status
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('hub_watchlist') || '[]');
      setInWatchlist(saved.some((w: any) => w.link === link));
    } catch {}
  }, [link]);

  const toggleWatchlist = () => {
    if (!data) return;
    try {
      const list = JSON.parse(localStorage.getItem('hub_watchlist') || '[]');
      const exists = list.some((w: any) => w.link === link);
      let updated;
      if (exists) {
        updated = list.filter((w: any) => w.link !== link);
        setInWatchlist(false);
      } else {
        updated = [{
          title: data.title || 'Movie',
          image: data.image || posterParam,
          link: link,
          provider: provider,
          addedAt: Date.now(),
        }, ...list];
        setInWatchlist(true);
      }
      localStorage.setItem('hub_watchlist', JSON.stringify(updated.slice(0, 50)));
    } catch {}
  };

  // 2. Fetch enriched metadata from OMDB
  useEffect(() => {
    let mounted = true;
    async function fetchOMDB() {
      if (!data?.title) return;
      try {
        let cleanTitle = data.title
          .replace(/\b(1080p|720p|480p|4k|uhd|hdr|web-dl|bluray|x264|x265|hevc|hindi|english|dual audio)\b/gi, '')
          .replace(/[\[\(\{].*?[\]\)\}]/g, '')
          .trim();

        let url = `/api/omdb?title=${encodeURIComponent(cleanTitle)}`;
        if (data.year) url += `&year=${encodeURIComponent(data.year)}`;
        
        const res = await fetch(url);
        const json = await res.json();
        if (!mounted) return;
        if (json?.data) {
          setOmdbData(json.data);
        }
      } catch {}
    }
    fetchOMDB();
    return () => { mounted = false; };
  }, [data?.title, data?.year]);

  // 3. Fetch trailers
  useEffect(() => {
    let mounted = true;
    async function fetchTrailers() {
      if (!data?.title) return;
      try {
        const query = `${data.title} official trailer`;
        const res = await fetch(`/api/trailer?title=${encodeURIComponent(query)}`);
        const json = await res.json();
        if (!mounted) return;
        if (json?.data?.trailers && json.data.trailers.length > 0) {
          setTrailers(json.data.trailers);
          setActiveTrailer(json.data.mainTrailer || json.data.trailers[0]);
        }
      } catch {}
    }
    fetchTrailers();
    return () => { mounted = false; };
  }, [data?.title]);

  // 4. On-Demand Season / Episodes fetcher
  const loadEpisodesForSection = async (episodesLink: string, key: string) => {
    if (episodesMap[key] || episodesLoading[key]) return;
    setEpisodesLoading(prev => ({ ...prev, [key]: true }));

    try {
      const res = await fetch(`/api/episodes?provider=${encodeURIComponent(provider)}&url=${encodeURIComponent(episodesLink)}`);
      const json = await res.json();
      const items = Array.isArray(json?.data) ? json.data : [];
      setEpisodesMap(prev => ({ ...prev, [key]: items }));
    } catch (e) {
      console.error('Failed to load episodes:', e);
    } finally {
      setEpisodesLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  // 5. Fast Direct Download & Stream Fetcher
  const fetchDownloadLinks = async (itemLink: string, itemTitle: string) => {
    setDownloadModal({ show: true, link: itemLink, title: itemTitle });
    setDownloadLoading(true);
    setDownloadLinks([]);
    
    // Fast path: If the item link is already direct PixelDrain or CDN, populate immediately
    if (itemLink.includes('pixeldrain.com/u/')) {
      const id = itemLink.split('/u/')[1]?.split('?')[0]?.split('/')[0];
      if (id) {
        setDownloadLinks([{
          server: 'Pixeldrain Direct',
          quality: 'Original Quality',
          link: `https://pixeldrain.com/api/file/${id}?download`,
          proxyLink: `/api/proxy?url=${encodeURIComponent(`https://pixeldrain.com/api/file/${id}?download`)}&download=true`,
          type: 'mkv',
          isDirectDownload: true,
        }]);
      }
    }

    try {
      const res = await fetch(`/api/stream-fast?provider=${encodeURIComponent(provider)}&type=movie&link=${encodeURIComponent(itemLink)}`);
      const json = await res.json();
      const streams = Array.isArray(json?.data) ? json.data : [];
      
      const processed = streams.map((stream: any) => {
        const isHls = stream.link?.toLowerCase().includes('.m3u8');
        let fileType = isHls ? 'm3u8' : 'mp4';
        if (stream.link?.includes('.mkv')) fileType = 'mkv';

        const proxyUrl = `/api/proxy?url=${encodeURIComponent(stream.link)}${
          stream.headers?.Referer ? `&referer=${encodeURIComponent(stream.headers.Referer)}` : ''
        }&download=true`;

        return {
          server: stream.server || 'Fast CDN',
          quality: stream.quality || '1080p',
          link: stream.link,
          proxyLink: proxyUrl,
          type: fileType,
          isDirectDownload: !isHls,
          isHls: isHls,
        };
      });
      
      if (processed.length > 0) {
        setDownloadLinks(processed);
      }
    } catch (e) {
      console.error('Failed to fetch streams:', e);
    } finally {
      setDownloadLoading(false);
    }
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(url);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch {}
  };

  const triggerDirectDownload = (directUrl: string) => {
    window.open(directUrl, '_blank', 'noopener,noreferrer');
  };

  const posterImage = data?.image || posterParam || omdbData?.poster;
  const firstPlayableLink = data?.linkList?.[0]?.directLinks?.[0];
  const genresList = (omdbData?.genre && omdbData.genre.length > 0) ? omdbData.genre : (data?.tags || []);
  const titleDisplay = omdbData?.title || data?.title || 'Title Details';
  const plotDisplay = omdbData?.plot || data?.synopsis || 'No plot summary available for this title.';

  const firstPlayUrl = firstPlayableLink ? (
    `/player?provider=${encodeURIComponent(provider)}&type=${encodeURIComponent(firstPlayableLink.type || 'movie')}&link=${encodeURIComponent(firstPlayableLink.link)}&title=${encodeURIComponent(data?.title || titleDisplay)}${posterImage ? `&poster=${encodeURIComponent(posterImage)}` : ''}${link ? `&infoUrl=${encodeURIComponent(link)}` : ''}`
  ) : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090a0e] text-white">
        <div className="relative h-[48vh] bg-[#12141c] animate-pulse" />
        <div className="max-w-7xl mx-auto px-4 sm:px-8 -mt-36 relative z-10 flex flex-col md:flex-row gap-8">
          <div className="w-48 sm:w-56 aspect-[2/3] bg-[#171a24] rounded-xl animate-pulse mx-auto md:mx-0 shadow-2xl" />
          <div className="flex-1 space-y-4">
            <div className="h-5 w-28 bg-white/10 rounded animate-pulse" />
            <div className="h-9 w-2/3 bg-white/10 rounded animate-pulse" />
            <div className="h-4 w-1/2 bg-white/10 rounded animate-pulse" />
            <div className="h-20 w-full bg-white/5 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#090a0e] text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#12141c] border border-white/10 rounded-xl p-8 text-center">
          <h2 className="text-lg font-bold text-white mb-2">Unable to Load Title</h2>
          <p className="text-xs text-[#94a3b8] mb-6">{error || 'Title metadata could not be fetched from source.'}</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold"
            >
              Go Back
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-white text-black hover:bg-slate-200 text-xs font-semibold"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090a0e] text-white pb-24 select-none">
      {/* Top Floating Header */}
      <div className="fixed top-4 left-4 right-4 z-40 flex items-center justify-between pointer-events-none">
        <button
          onClick={() => router.back()}
          className="pointer-events-auto w-9 h-9 rounded-full bg-black/80 hover:bg-black backdrop-blur-md border border-white/10 flex items-center justify-center text-white active:scale-95 transition-all shadow-xl"
          aria-label="Go back"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <span className="pointer-events-auto px-3 py-1 rounded-full bg-black/80 backdrop-blur-md border border-white/10 text-[10px] font-mono font-bold uppercase tracking-wider text-[#38bdf8] shadow-xl">
          {provider}
        </span>
      </div>

      {/* Hero Backdrop Section */}
      <div className="relative h-[50vh] sm:h-[60vh] md:h-[68vh] overflow-hidden bg-[#090a0e]">
        {posterImage && (
          <img
            src={posterImage}
            alt={titleDisplay}
            className="absolute inset-0 w-full h-full object-cover object-center filter brightness-[0.7] scale-105"
            referrerPolicy="no-referrer"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#090a0e] via-[#090a0e]/75 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#090a0e] via-[#090a0e]/60 to-transparent w-full md:w-2/3" />
      </div>

      {/* Main Content Details Layer */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 -mt-40 sm:-mt-52 md:-mt-64">
        <div className="flex flex-col lg:flex-row gap-6 sm:gap-10">
          {/* Left: Poster Box */}
          <div className="flex-shrink-0 mx-auto lg:mx-0">
            <div className="w-44 sm:w-56 md:w-60 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl border border-white/10 bg-[#12141c] relative group">
              {posterImage ? (
                <img
                  src={posterImage}
                  alt={titleDisplay}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#12141c]">
                  <span className="text-3xl text-white/20">🎬</span>
                </div>
              )}
              {data.quality && (
                <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-bold uppercase text-[#38bdf8] tracking-wider border border-white/10">
                  {data.quality}
                </div>
              )}
            </div>
          </div>

          {/* Right: Title, Meta, and Action Controls */}
          <div className="flex-1 text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-2 mb-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-white/10 text-[#38bdf8] border border-white/10">
                OFFICIAL SOURCE
              </span>
              {(omdbData?.type || data.type) && (
                <span className="text-[11px] font-medium uppercase tracking-wider text-[#94a3b8]">
                  • {omdbData?.type || data.type}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white font-sans tracking-tight leading-tight mb-3">
              {titleDisplay}
            </h1>

            {/* Metadata Row */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-3 gap-y-1 text-xs sm:text-sm font-medium text-[#94a3b8] mb-4">
              {(omdbData?.year || data.year) && (
                <span>{omdbData?.year || data.year}</span>
              )}
              {(omdbData?.imdbRating || data.rating) && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-[#f59e0b] font-bold">
                    <StarIcon />
                    {omdbData?.imdbRating || data.rating}
                    <span className="text-[10px] text-[#94a3b8] font-normal">/10</span>
                  </span>
                </>
              )}
              {(omdbData?.runtime || data.duration) && (
                <>
                  <span>•</span>
                  <span>{omdbData?.runtime || data.duration}</span>
                </>
              )}
              {omdbData?.rated && omdbData.rated !== 'N/A' && (
                <>
                  <span>•</span>
                  <span className="px-1.5 py-0.5 rounded bg-white/10 text-white text-[10px] font-bold">
                    {omdbData.rated}
                  </span>
                </>
              )}
            </div>

            {/* Genres */}
            {genresList.length > 0 && (
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-1.5 mb-4">
                {genresList.slice(0, 5).map((genre: string, i: number) => (
                  <span
                    key={i}
                    className="px-2.5 py-0.5 rounded-full bg-[#12141c] border border-white/5 text-xs text-[#94a3b8]"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}

            {/* Plot */}
            <p className="text-xs sm:text-sm text-[#94a3b8] leading-relaxed mb-6 max-w-2xl font-normal mx-auto lg:mx-0">
              {plotDisplay}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-1">
              {firstPlayUrl ? (
                <Link
                  href={firstPlayUrl}
                  className="bg-white text-black hover:bg-slate-200 active:scale-95 font-bold px-7 py-3 rounded-lg flex items-center gap-2 shadow-xl transition-all text-sm tracking-wide"
                >
                  <PlayIcon />
                  <span>Watch Now</span>
                </Link>
              ) : (
                <button
                  onClick={() => setActiveTab('streams')}
                  className="bg-white text-black hover:bg-slate-200 active:scale-95 font-bold px-7 py-3 rounded-lg flex items-center gap-2 shadow-xl transition-all text-sm tracking-wide"
                >
                  <PlayIcon />
                  <span>Select Stream</span>
                </button>
              )}

              {firstPlayableLink && (
                <button
                  onClick={() => fetchDownloadLinks(firstPlayableLink.link, data.title || titleDisplay)}
                  className="px-5 py-3 rounded-lg bg-[#12141c] hover:bg-[#181b26] active:scale-95 border border-white/10 text-white font-medium flex items-center gap-2 text-sm transition-all"
                >
                  <DownloadIcon />
                  <span>Download Links</span>
                </button>
              )}

              <button
                onClick={toggleWatchlist}
                className={`px-4 py-3 rounded-lg font-medium flex items-center gap-2 border transition-all text-sm active:scale-95 ${
                  inWatchlist
                    ? 'bg-white/15 border-white/30 text-white'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                }`}
              >
                {inWatchlist ? <CheckIcon /> : <PlusIcon />}
                <span>{inWatchlist ? 'Saved' : 'Watchlist'}</span>
              </button>

              {activeTrailer && (
                <button
                  onClick={() => setShowTrailerModal(true)}
                  className="px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium flex items-center gap-1.5 text-sm transition-all"
                >
                  <span>Trailer</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-10 border-b border-white/5 pb-1">
          <div className="flex items-center gap-6 overflow-x-auto hide-scrollbar">
            <button
              onClick={() => setActiveTab('streams')}
              className={`pb-3 text-sm font-bold transition-all relative ${
                activeTab === 'streams' ? 'text-white' : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              <span>Streams & Episodes</span>
              {activeTab === 'streams' && (
                <div className="absolute bottom-0 inset-x-0 h-0.5 bg-[#38bdf8]" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-3 text-sm font-bold transition-all relative ${
                activeTab === 'overview' ? 'text-white' : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              <span>Story & Details</span>
              {activeTab === 'overview' && (
                <div className="absolute bottom-0 inset-x-0 h-0.5 bg-[#38bdf8]" />
              )}
            </button>
          </div>
        </div>

        {/* Tab 1: Streams & Episodes */}
        {activeTab === 'streams' && (
          <div className="mt-6 space-y-6">
            {data.linkList && data.linkList.length > 0 ? (
              data.linkList.map((section: any, idx: number) => {
                const epKey = section.title || section.episodesLink;
                const episodes = episodesMap[epKey];
                const isEpLoading = episodesLoading[epKey];

                return (
                  <div key={idx} className="bg-[#12141c] border border-white/5 rounded-xl p-5 shadow-lg">
                    {/* Section Header */}
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
                      <h3 className="text-sm sm:text-base font-bold text-white font-sans flex items-center gap-2">
                        <span>{section.title || `Stream Option ${idx + 1}`}</span>
                      </h3>
                      {section.quality && (
                        <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] font-bold text-[#38bdf8] uppercase border border-white/10">
                          {section.quality}
                        </span>
                      )}
                    </div>

                    {/* Direct Links (e.g. Movies) */}
                    {section.directLinks && section.directLinks.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {section.directLinks.map((d: any, i: number) => {
                          const playUrl = `/player?provider=${encodeURIComponent(provider)}&type=${encodeURIComponent(d.type || 'movie')}&link=${encodeURIComponent(d.link)}&title=${encodeURIComponent(data.title)}${posterImage ? `&poster=${encodeURIComponent(posterImage)}` : ''}${link ? `&infoUrl=${encodeURIComponent(link)}` : ''}`;

                          return (
                            <div
                              key={i}
                              className="flex items-center justify-between p-3 rounded-lg bg-[#171a24] border border-white/5 hover:border-white/20 transition-all"
                            >
                              <Link
                                href={playUrl}
                                className="flex items-center gap-3 min-w-0 flex-1 group"
                              >
                                <div className="w-8 h-8 rounded-lg bg-white/10 group-hover:bg-white group-hover:text-black flex items-center justify-center text-white transition-all">
                                  <PlayIcon />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h4 className="text-xs font-semibold text-white truncate group-hover:text-[#38bdf8] transition-colors">
                                    {d.title || section.title || 'Play Stream'}
                                  </h4>
                                  <span className="text-[10px] text-[#94a3b8]">
                                    {d.quality || 'HD Stream'}
                                  </span>
                                </div>
                              </Link>

                              {/* Instant Download Action Button */}
                              <button
                                onClick={() => fetchDownloadLinks(d.link, d.title || section.title || data.title)}
                                className="p-2 rounded-lg bg-white/5 hover:bg-white hover:text-black text-[#94a3b8] transition-colors ml-2 flex items-center gap-1.5 text-xs font-medium"
                                title="Download links"
                              >
                                <DownloadIcon />
                                <span className="hidden sm:inline text-[11px]">Download</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* TV Episodes Section */}
                    {section.episodesLink && (
                      <div className="mt-3">
                        {!episodes && !isEpLoading && (
                          <button
                            onClick={() => loadEpisodesForSection(section.episodesLink, epKey)}
                            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-medium border border-white/5 transition-all flex items-center gap-2"
                          >
                            <span>Load Episodes for {section.title || 'Season'}</span>
                            <span className="text-[#38bdf8]">↓</span>
                          </button>
                        )}

                        {isEpLoading && (
                          <div className="py-4 text-center text-xs text-[#94a3b8] flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Loading episodes from provider...</span>
                          </div>
                        )}

                        {episodes && episodes.length > 0 && (
                          <div className="mt-2">
                            <div className="text-[11px] font-mono uppercase text-[#94a3b8] mb-2.5">
                              {episodes.length} Episodes Available
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                              {episodes.map((ep: any, epIdx: number) => {
                                const epPlayUrl = `/player?provider=${encodeURIComponent(provider)}&type=series&link=${encodeURIComponent(ep.link)}&title=${encodeURIComponent(`${data.title} - ${ep.title}`)}${posterImage ? `&poster=${encodeURIComponent(posterImage)}` : ''}${link ? `&infoUrl=${encodeURIComponent(link)}` : ''}&episodeIndex=${epIdx}&episodeList=${encodeURIComponent(JSON.stringify(episodes))}`;

                                return (
                                  <div
                                    key={epIdx}
                                    className="p-2.5 rounded-lg bg-[#171a24] border border-white/5 hover:border-white/20 transition-all flex flex-col justify-between group"
                                  >
                                    <Link href={epPlayUrl} className="block mb-2">
                                      <div className="text-xs font-semibold text-white group-hover:text-[#38bdf8] truncate">
                                        {ep.title}
                                      </div>
                                      <span className="text-[10px] text-[#64748b]">Watch</span>
                                    </Link>
                                    <button
                                      onClick={() => fetchDownloadLinks(ep.link, `${data.title} - ${ep.title}`)}
                                      className="text-[10px] text-[#94a3b8] hover:text-white flex items-center justify-center gap-1 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors"
                                    >
                                      <DownloadIcon />
                                      <span>Download</span>
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="bg-[#12141c] border border-white/5 rounded-xl p-10 text-center max-w-lg mx-auto">
                <p className="text-xs text-[#94a3b8]">
                  No direct streams were returned for this provider. Try switching providers in the top-right corner.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Overview & Story */}
        {activeTab === 'overview' && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#12141c] border border-white/5 rounded-xl p-6 md:col-span-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Synopsis</h3>
              <p className="text-sm text-[#94a3b8] leading-relaxed">
                {omdbData?.plot || data.synopsis || 'No full synopsis provided.'}
              </p>
            </div>

            <div className="bg-[#12141c] border border-white/5 rounded-xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Metadata</h3>
              {omdbData?.director && omdbData.director.length > 0 && (
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#64748b] block">Director</span>
                  <span className="text-xs text-white">{omdbData.director.join(', ')}</span>
                </div>
              )}
              {omdbData?.actors && omdbData.actors.length > 0 && (
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#64748b] block">Starring</span>
                  <span className="text-xs text-white">{omdbData.actors.join(', ')}</span>
                </div>
              )}
              {omdbData?.language && (
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#64748b] block">Language</span>
                  <span className="text-xs text-white">{omdbData.language}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Trailer Modal */}
      {showTrailerModal && activeTrailer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="relative w-full max-w-4xl bg-black border border-white/10 rounded-xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-3 border-b border-white/10">
              <h3 className="text-xs font-semibold text-white truncate max-w-md">
                {activeTrailer.name || `${titleDisplay} Trailer`}
              </h3>
              <button
                onClick={() => setShowTrailerModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>
            <div className="aspect-video w-full bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${activeTrailer.key}?autoplay=1&rel=0`}
                title={activeTrailer.name}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      {/* Fast Direct Downloads Modal */}
      {downloadModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-[#12141c] border border-white/10 rounded-xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
              <div>
                <h3 className="text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
                  Direct Download Links
                </h3>
                <p className="text-[11px] text-[#94a3b8] truncate">{downloadModal.title}</p>
              </div>
              <button
                onClick={() => setDownloadModal({ show: false, link: '', title: '' })}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xs"
              >
                ✕
              </button>
            </div>

            {downloadLoading ? (
              <div className="py-10 text-center">
                <div className="w-7 h-7 border-2 border-[#38bdf8] border-t-transparent rounded-full animate-spin mx-auto mb-2.5" />
                <p className="text-xs text-[#94a3b8]">Extracting direct high-speed download mirrors...</p>
              </div>
            ) : downloadLinks.length > 0 ? (
              <div className="space-y-2.5 max-h-80 overflow-y-auto hide-scrollbar">
                {downloadLinks.map((dl, i) => (
                  <div key={i} className="p-3 rounded-lg bg-[#171a24] border border-white/5 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>{dl.server}</span>
                        <span className="text-[10px] font-mono text-[#38bdf8] uppercase">({dl.type})</span>
                      </div>
                      <div className="text-[10px] text-[#94a3b8]">{dl.quality}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {dl.isDirectDownload && (
                        <button
                          onClick={() => triggerDirectDownload(dl.link)}
                          className="px-3 py-1.5 rounded bg-white text-black hover:bg-slate-200 font-bold text-xs transition-all"
                        >
                          Direct Download
                        </button>
                      )}
                      <button
                        onClick={() => copyToClipboard(dl.link)}
                        className="px-2.5 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-all"
                      >
                        {copiedLink === dl.link ? 'Copied!' : 'Copy Link'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-[#94a3b8]">
                No direct download links found. Try alternative streams in the list.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function InfoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#090a0e] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <InfoContent />
    </Suspense>
  );
}
